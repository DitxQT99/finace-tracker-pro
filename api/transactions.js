const { randomUUID } = require("crypto");
const { getDB, ensureSchema, requireUser, handleError, validDate } = require("./_lib/core");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    const sql = getDB(); await ensureSchema(sql);
    const user = requireUser(req, res); if (!user) return;
    if (req.method === "GET") {
      const type = ["income","expense"].includes(req.query.type) ? req.query.type : null;
      const month = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : null;
      const search = String(req.query.search || "").trim().slice(0,60) || null;
      const pattern = search ? "%" + search + "%" : null;
      const rows = await sql`SELECT id, type, amount::float8 AS amount, category, COALESCE(note,'') AS note, TO_CHAR(transaction_date,'YYYY-MM-DD') AS date
        FROM transactions WHERE user_id=${user.id}
        AND (${type}::text IS NULL OR type=${type})
        AND (${month}::text IS NULL OR TO_CHAR(transaction_date,'YYYY-MM')=${month})
        AND (${pattern}::text IS NULL OR category ILIKE ${pattern} OR COALESCE(note,'') ILIKE ${pattern})
        ORDER BY transaction_date DESC, created_at DESC LIMIT 500`;
      return res.status(200).json({ transactions: rows });
    }
    if (req.method === "POST" || req.method === "PATCH") {
      const body=req.body||{}, type=body.type, amount=Number(body.amount);
      const category=String(body.category||"").trim(), note=String(body.note||"").trim().slice(0,160), date=body.date;
      if (!["income","expense"].includes(type)) return res.status(400).json({ error:"Pilih jenis transaksi yang valid." });
      if (!Number.isFinite(amount)||amount<=0||amount>999999999999999) return res.status(400).json({ error:"Nominal transaksi tidak valid." });
      if (!category||category.length>60) return res.status(400).json({ error:"Kategori wajib diisi (maksimal 60 karakter)." });
      if (!validDate(date)) return res.status(400).json({ error:"Tanggal transaksi tidak valid." });
      if (req.method==="POST") {
        const rows=await sql`INSERT INTO transactions (id,user_id,type,amount,category,note,transaction_date)
          VALUES (${randomUUID()},${user.id},${type},${amount},${category},${note},${date})
          RETURNING id,type,amount::float8 AS amount,category,note,TO_CHAR(transaction_date,'YYYY-MM-DD') AS date`;
        return res.status(201).json({ transaction:rows[0] });
      }
      const id=String(body.id||"");
      if (!id) return res.status(400).json({ error:"ID transaksi tidak ditemukan." });
      const rows=await sql`UPDATE transactions SET type=${type},amount=${amount},category=${category},note=${note},transaction_date=${date}
        WHERE id=${id} AND user_id=${user.id}
        RETURNING id,type,amount::float8 AS amount,category,note,TO_CHAR(transaction_date,'YYYY-MM-DD') AS date`;
      if (!rows.length) return res.status(404).json({ error:"Transaksi tidak ditemukan." });
      return res.status(200).json({ transaction:rows[0] });
    }
    if (req.method==="DELETE") {
      const id=String(req.query.id||"");
      if (!id) return res.status(400).json({ error:"ID transaksi tidak ditemukan." });
      const rows=await sql`DELETE FROM transactions WHERE id=${id} AND user_id=${user.id} RETURNING id`;
      if (!rows.length) return res.status(404).json({ error:"Transaksi tidak ditemukan." });
      return res.status(200).json({ ok:true });
    }
    return res.status(405).json({ error:"Method not allowed." });
  } catch (error) { return handleError(res,error); }
};