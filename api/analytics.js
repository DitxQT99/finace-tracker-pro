const { getDB, ensureSchema, requireUser, handleError } = require("./_lib/core");
module.exports = async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  if (req.method!=="GET") return res.status(405).json({ error:"Method not allowed." });
  try {
    const sql=getDB(); await ensureSchema(sql);
    const user=requireUser(req,res); if(!user)return;
    const totals=await sql\`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0)::float8 AS income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)::float8 AS expense
      FROM transactions WHERE user_id=\${user.id}\`;
    const current=await sql\`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0)::float8 AS income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)::float8 AS expense
      FROM transactions WHERE user_id=\${user.id}
      AND transaction_date>=DATE_TRUNC('month',CURRENT_DATE)::date
      AND transaction_date<(DATE_TRUNC('month',CURRENT_DATE)+INTERVAL '1 month')::date\`;
    const monthly=await sql\`SELECT TO_CHAR(DATE_TRUNC('month',transaction_date),'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0)::float8 AS income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)::float8 AS expense
      FROM transactions WHERE user_id=\${user.id}
      AND transaction_date>=(DATE_TRUNC('month',CURRENT_DATE)-INTERVAL '5 months')::date
      GROUP BY DATE_TRUNC('month',transaction_date) ORDER BY DATE_TRUNC('month',transaction_date) ASC\`;
    const categories=await sql\`SELECT category,COALESCE(SUM(amount),0)::float8 AS total
      FROM transactions WHERE user_id=\${user.id} AND type='expense'
      AND transaction_date>=DATE_TRUNC('month',CURRENT_DATE)::date
      AND transaction_date<(DATE_TRUNC('month',CURRENT_DATE)+INTERVAL '1 month')::date
      GROUP BY category ORDER BY total DESC LIMIT 8\`;
    const all=totals[0]||{income:0,expense:0}, month=current[0]||{income:0,expense:0};
    return res.status(200).json({ income:Number(all.income||0),expense:Number(all.expense||0),balance:Number(all.income||0)-Number(all.expense||0),currentMonth:month,monthly,categories });
  } catch(error) { return handleError(res,error); }
};