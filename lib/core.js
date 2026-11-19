const crypto=require("crypto"),jwt=require("jsonwebtoken");
const{get,put,del}=require("@vercel/blob");
function config(){if(!process.env.BLOB_READ_WRITE_TOKEN){const e=new Error("Private storage Grey Finance belum aktif.");e.code="BLOB_NOT_CONFIGURED";throw e;}}
async function readJSON(path){config();const result=await get(path,{access:"private",useCache:false});if(!result)return null;const raw=await new Response(result.stream).text();try{return{value:JSON.parse(raw),sha:result.blob.etag};}catch{throw new Error("Data storage tidak valid.");}}
async function writeJSON(path,value,sha,allowOverwrite=true){config();const options={access:"private",addRandomSuffix:false,allowOverwrite,contentType:"application/json",cacheControlMaxAge:60};if(sha)options.ifMatch=sha;const saved=await put(path,JSON.stringify(value),options);return{sha:saved.etag,pathname:saved.pathname};}
async function deleteJSON(path,sha){config();try{await del(path,sha?{ifMatch:sha}:{});}catch(e){if(e.statusCode!==412)throw e;}}
const emailKey=e=>crypto.createHash("sha256").update(String(e).trim().toLowerCase()).digest("hex"),userPath=id=>"users/"+id+".json",indexPath=e=>"email-index/"+emailKey(e)+".json";
async function getUserByEmail(email){const idx=await readJSON(indexPath(email));if(!idx)return null;const u=await readJSON(userPath(idx.value.userId));return u?{...u.value,_sha:u.sha}:null;}
async function getUserById(id){const u=await readJSON(userPath(id));return u?{...u.value,_sha:u.sha}:null;}
async function createUser(user){if(await readJSON(indexPath(user.email)))return false;await writeJSON(userPath(user.id),user,null,false);try{await writeJSON(indexPath(user.email),{userId:user.id},null,false);return true;}catch(e){await deleteJSON(userPath(user.id));if(e.statusCode===409||e.statusCode===412||e.statusCode===428)return false;throw e;}}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function isWriteConflict(e){
  return !!e&&(
    e.name==="BlobPreconditionFailedError"||
    e.statusCode===412||
    e.statusCode===409||
    e.code==="BLOB_PRECONDITION_FAILED"||
    /etag mismatch|precondition failed|already exists/i.test(String(e.message||""))
  );
}
const USER_LOCK_TTL_MS = 60000;
const USER_LOCK_WAIT_MS = 8000;

function lockConflict(error) {
  return !!error && (
    error.statusCode === 409 || error.statusCode === 412 ||
    error.code === "BLOB_PRECONDITION_FAILED" ||
    error.name === "BlobPreconditionFailedError"
  );
}

async function acquireUserLock(id) {
  const lockPath = "user-locks/" + crypto.createHash("sha256").update(String(id)).digest("hex") + ".json";
  const token = crypto.randomUUID();
  const deadline = Date.now() + USER_LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    try {
      const saved = await put(lockPath, JSON.stringify({
        token,
        expiresAt: Date.now() + USER_LOCK_TTL_MS
      }), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "application/json",
        cacheControlMaxAge: 0
      });
      return { path: lockPath, token, sha: saved.etag };
    } catch (error) {
      if (!lockConflict(error)) throw error;

      // Remove an abandoned lock only with the exact ETag we just read.
      // If another request has already replaced it, the conditional delete fails safely.
      let current = null;
      try { current = await readJSON(lockPath); }
      catch (readError) {
        if (readError.statusCode !== 404) throw readError;
      }

      if (!current) {
        await sleep(80 + Math.floor(Math.random() * 100));
        continue;
      }

      const expiresAt = Number(current.value && current.value.expiresAt || 0);
      if (expiresAt > 0 && expiresAt <= Date.now()) {
        try { await deleteJSON(lockPath, current.sha); }
        catch (deleteError) {
          if (!lockConflict(deleteError) && deleteError.statusCode !== 404) throw deleteError;
        }
        continue;
      }

      await sleep(120 + Math.floor(Math.random() * 230));
    }
  }

  const error = new Error("Penyimpanan sedang menerima perubahan lain. Tunggu sebentar lalu coba lagi.");
  error.code = "BLOB_LOCK_BUSY";
  error.statusCode = 503;
  throw error;
}

async function releaseUserLock(lock) {
  if (!lock) return;
  try {
    await deleteJSON(lock.path, lock.sha);
  } catch (error) {
    // A 412 means the lease was already replaced; never delete another request's lock.
    if (!lockConflict(error) && error.statusCode !== 404) {
      console.warn("Grey Finance user lock release deferred; it will expire automatically.", {
        code: error.code,
        statusCode: error.statusCode
      });
    }
  }
}

async function mutateUser(id,fn){
  // A private Blob lease serializes writes across all Vercel instances.
  // The bounded wait prevents a busy account from exhausting the function timeout.
  let lock = null;
  try {
    lock = await acquireUserLock(id);
    const maxAttempts = 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const cur = await readJSON(userPath(id));
      if (!cur) return null;
      const next = await fn(structuredClone(cur.value));

      // Validation failures and other no-op mutations must not rewrite the user's
      // complete JSON document. This reduces write contention and avoids false conflicts.
      if (JSON.stringify(next) === JSON.stringify(cur.value)) return cur.value;

      try {
        await writeJSON(userPath(id), next, cur.sha, true);
        return next;
      } catch (error) {
        if (!isWriteConflict(error)) throw error;
        if (attempt === maxAttempts - 1) {
          const conflict = new Error("Data akun sedang dipakai perubahan lain. Tidak ada data yang ditimpa; coba ulang sebentar lagi.");
          conflict.code = "BLOB_WRITE_CONFLICT";
          conflict.statusCode = 409;
          throw conflict;
        }
        await sleep(120 + Math.floor(Math.random() * 180));
      }
    }
    return null;
  } finally {
    await releaseUserLock(lock);
  }
}
function getSession(req){if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)return null;const m=String(req.headers.cookie||"").match(/(?:^|;\s*)grey_session=([^;]+)/);if(!m)return null;try{return jwt.verify(decodeURIComponent(m[1]),process.env.JWT_SECRET,{issuer:"grey-finance"});}catch{return null;}}
function requireUser(req,res){const s=getSession(req);if(!s||!s.userId){res.status(401).json({error:"Sesi berakhir. Silakan masuk kembali."});return null;}return{id:s.userId};}
function setSessionCookie(res,token){const sec=process.env.NODE_ENV==="production"?"; Secure":"";res.setHeader("Set-Cookie","grey_session="+encodeURIComponent(token)+"; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800"+sec);}
function clearSessionCookie(res){const sec=process.env.NODE_ENV==="production"?"; Secure":"";res.setHeader("Set-Cookie","grey_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"+sec);}
function signSession(id){if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32){const e=new Error("Session signing secret belum aktif.");e.code="JWT_NOT_CONFIGURED";throw e;}return jwt.sign({userId:id},process.env.JWT_SECRET,{expiresIn:"7d",issuer:"grey-finance"});}
function handleError(res,e){
  if(e&&["BLOB_NOT_CONFIGURED","JWT_NOT_CONFIGURED"].includes(e.code))return res.status(503).json({error:e.message,code:e.code});
  if(e&&e.code==="BLOB_WRITE_CONFLICT")return res.status(409).json({error:e.message,code:e.code});
  if(e&&e.code==="BLOB_LOCK_BUSY")return res.status(503).json({error:e.message,code:e.code});
  if(e&&[401,403].includes(e.statusCode))return res.status(503).json({error:"Akses private storage belum siap. Coba lagi nanti."});
  console.error("Grey Finance API:",e&&e.message||"Unknown");
  return res.status(500).json({error:"Terjadi kendala pada server. Coba lagi sebentar."});
}
function validDate(v){if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const p=v.split("-").map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2]));return d.getUTCFullYear()===p[0]&&d.getUTCMonth()+1===p[1]&&d.getUTCDate()===p[2];}
module.exports={readJSON,writeJSON,deleteJSON,getUserByEmail,getUserById,createUser,mutateUser,getSession,requireUser,setSessionCookie,clearSessionCookie,signSession,handleError,validDate};