const { getDB, ensureSchema, handleError } = require("../lib/core");
module.exports = async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed."});
  try {
    const sql=getDB();
    await ensureSchema(sql);
    const rows=await sql`SELECT 1 AS ok`;
    return res.status(200).json({ok:Boolean(rows[0]&&rows[0].ok),application:"Grey Finance",database:"connected"});
  } catch(error) {
    return handleError(res,error);
  }
};