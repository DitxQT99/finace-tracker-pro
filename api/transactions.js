const{randomUUID}=require("crypto"),{requireUser,mutateUser,getUserById,handleError,validDate}=require("../lib/core");
const{ensureAccountData,activeAccount}=require("../lib/accounts");
module.exports=async function(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(204).end();
  try{
    const session=requireUser(req,res);if(!session)return;
    if(req.method==="GET"){
      let user=await getUserById(session.id);
      if(!user)return res.status(401).json({error:"Akun tidak ditemukan."});
      // Normalize legacy records in memory only. GET requests must never write user data.
      ensureAccountData(user);
      let rows=user.transactions||[];
      const type=["income","expense"].includes(req.query.type)?req.query.type:null;
      const month=/^\d{4}-\d{2}$/.test(req.query.month||"")?req.query.month:null;
      const search=String(req.query.search||"").trim().toLowerCase().slice(0,60);
      rows=rows.filter(row=>(!type||row.type===type)&&(!month||String(row.date).startsWith(month))&&
        (!search||String((row.category||"")+" "+(row.note||"")+" "+(row.accountName||"")).toLowerCase().includes(search)));
      rows.sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
      return res.status(200).json({transactions:rows.slice(0,500)});
    }
    if(req.method==="POST"||req.method==="PATCH"){
      const body=req.body||{},type=body.type,amount=Number(body.amount);
      const category=String(body.category||"").trim(),note=String(body.note||"").trim().slice(0,160),date=body.date;
      const requestId=req.method==="POST"?String(body.requestId||"").trim():"";
      if(!["income","expense"].includes(type)||!Number.isFinite(amount)||amount<=0||amount>999999999999999||
        !category||category.length>60||!validDate(date)||
        (requestId&&!/^[A-Za-z0-9_-]{8,80}$/.test(requestId))){
        return res.status(400).json({error:"Data transaksi tidak valid."});
      }
      const id=req.method==="PATCH"?String(body.id||""):randomUUID();
      let saved=null,problem=null,alreadyProcessed=false;
      const user=await mutateUser(session.id,data=>{
        saved=null;problem=null;alreadyProcessed=false;
        ensureAccountData(data);
        data.transactions=Array.isArray(data.transactions)?data.transactions:[];
        if(req.method==="POST"&&requestId){
          const prior=data.transactions.find(row=>row.clientRequestId===requestId);
          if(prior){saved=prior;alreadyProcessed=true;return data;}
        }
        const account=activeAccount(data,String(body.accountId||""))||
          (!body.accountId?data.accounts.find(item=>!item.archivedAt):null);
        if(!account){problem="Pilih sumber dana yang masih aktif.";return data;}
        const item={id,type,amount,category,note,date,accountId:account.id,
          accountName:account.name,accountProvider:account.provider,
          createdAt:new Date().toISOString()};
        if(requestId)item.clientRequestId=requestId;
        if(req.method==="PATCH"){
          const index=data.transactions.findIndex(row=>row.id===id);
          if(index>=0){
            const existing=data.transactions[index];
            if(["transfer_in","transfer_out"].includes(existing.type)){
              problem="Transfer harus dikelola sebagai satu pasangan transaksi.";
              return data;
            }
            item.createdAt=existing.createdAt||item.createdAt;
            if(existing.recurringId)item.recurringId=existing.recurringId;
            data.transactions[index]=item;
            saved=item;
          }
        }else{
          data.transactions.unshift(item);
          saved=item;
        }
        return data;
      });
      if(!user)return res.status(404).json({error:"Akun tidak ditemukan."});
      if(problem)return res.status(400).json({error:problem});
      if(!saved)return res.status(404).json({error:"Transaksi tidak ditemukan."});
      return res.status(req.method==="POST"&&!alreadyProcessed?201:200).json({transaction:saved,alreadyProcessed});
    }
    if(req.method==="DELETE"){
      const id=String(req.query.id||"");
      if(!id)return res.status(400).json({error:"Transaksi tidak valid."});
      let removed=false;
      const user=await mutateUser(session.id,data=>{
        removed=false;
        const target=(data.transactions||[]).find(row=>row.id===id);
        if(!target)return data;
        const originalLength=(data.transactions||[]).length;
        if(target.transferId)data.transactions=data.transactions.filter(row=>row.transferId!==target.transferId);
        else data.transactions=data.transactions.filter(row=>row.id!==id);
        removed=originalLength!==data.transactions.length;
        return data;
      });
      if(!user)return res.status(404).json({error:"Akun tidak ditemukan."});
      if(!removed)return res.status(404).json({error:"Transaksi tidak ditemukan."});
      return res.status(200).json({ok:true});
    }
    return res.status(405).json({error:"Method not allowed."});
  }catch(error){return handleError(res,error);}
};
