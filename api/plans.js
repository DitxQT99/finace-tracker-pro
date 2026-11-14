const { randomUUID } = require("crypto");
const { getDB, ensureSchema, requireUser, handleError, validDate } = require("./_lib/core");
module.exports = async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  try {
    const sql=getDB(); await ensureSchema(sql);
    const user=requireUser(req,res); if(!user)return;
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit"}).formatToParts(new Date());
    const currentMonth=parts.find(p=>p.type==="year").value+"-"+parts.find(p=>p.type==="month").value;
    if(req.method==="GET") {
      const budgets=await sql\`SELECT b.id,b.category,b.limit_amount::float8 AS limit_amount,
        COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END),0)::float8 AS spent
        FROM budgets b LEFT JOIN transactions t ON t.user_id=b.user_id AND t.category=b.category
        AND TO_CHAR(t.transaction_date,'YYYY-MM')=b.month
        WHERE b.user_id=\${user.id} AND b.month=\${currentMonth}
        GROUP BY b.id,b.category,b.limit_amount ORDER BY b.category ASC\`;
      const goals=await sql\`SELECT id,title,target_amount::float8 AS target_amount,saved_amount::float8 AS saved_amount,
        CASE WHEN deadline IS NULL THEN NULL ELSE TO_CHAR(deadline,'YYYY-MM-DD') END AS deadline
        FROM goals WHERE user_id=\${user.id} ORDER BY created_at DESC\`;
      return res.status(200).json({budgets,goals});
    }
    if(req.method==="POST") {
      const body=req.body||{}, type=body.type, amount=Number(body.limit_amount ?? body.target_amount);
      if(!Number.isFinite(amount)||amount<=0||amount>999999999999999) return res.status(400).json({error:"Nominal rencana tidak valid."});
      if(type==="budget") {
        const category=String(body.category||"").trim();
        if(!category||category.length>60)return res.status(400).json({error:"Kategori wajib diisi."});
        const rows=await sql\`INSERT INTO budgets(id,user_id,category,limit_amount,month)
          VALUES(\${randomUUID()},\${user.id},\${category},\${amount},\${currentMonth})
          ON CONFLICT(user_id,category,month) DO UPDATE SET limit_amount=EXCLUDED.limit_amount
          RETURNING id,category,limit_amount::float8 AS limit_amount\`;
        return res.status(201).json({budget:rows[0]});
      }
      if(type==="goal") {
        const title=String(body.title||"").trim(), deadline=body.deadline||null;
        if(title.length<2||title.length>60)return res.status(400).json({error:"Nama target harus terdiri dari 2–60 karakter."});
        if(deadline&&!validDate(deadline))return res.status(400).json({error:"Tanggal target tidak valid."});
        const rows=await sql\`INSERT INTO goals(id,user_id,title,target_amount,deadline)
          VALUES(\${randomUUID()},\${user.id},\${title},\${amount},\${deadline})
          RETURNING id,title,target_amount::float8 AS target_amount,saved_amount::float8 AS saved_amount,
          CASE WHEN deadline IS NULL THEN NULL ELSE TO_CHAR(deadline,'YYYY-MM-DD') END AS deadline\`;
        return res.status(201).json({goal:rows[0]});
      }
      return res.status(400).json({error:"Jenis rencana tidak dikenal."});
    }
    if(req.method==="PATCH") {
      const body=req.body||{}, id=String(body.id||""), amount=Number(body.add_amount);
      if(body.type!=="goal"||!id||!Number.isFinite(amount)||amount<=0||amount>999999999999999)return res.status(400).json({error:"Nominal tabungan tidak valid."});
      const rows=await sql\`UPDATE goals SET saved_amount=saved_amount+\${amount} WHERE id=\${id} AND user_id=\${user.id}
        RETURNING id,title,target_amount::float8 AS target_amount,saved_amount::float8 AS saved_amount\`;
      if(!rows.length)return res.status(404).json({error:"Target tabungan tidak ditemukan."});
      return res.status(200).json({goal:rows[0]});
    }
    if(req.method==="DELETE") {
      const id=String(req.query.id||""), type=String(req.query.type||"");
      if(!id||!["budget","goal"].includes(type))return res.status(400).json({error:"Rencana tidak valid."});
      const rows=type==="budget"
        ? await sql\`DELETE FROM budgets WHERE id=\${id} AND user_id=\${user.id} RETURNING id\`
        : await sql\`DELETE FROM goals WHERE id=\${id} AND user_id=\${user.id} RETURNING id\`;
      if(!rows.length)return res.status(404).json({error:"Rencana tidak ditemukan."});
      return res.status(200).json({ok:true});
    }
    return res.status(405).json({error:"Method not allowed."});
  } catch(error) { return handleError(res,error); }
};