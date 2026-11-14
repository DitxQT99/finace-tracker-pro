const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDB, ensureSchema, getSession, setSessionCookie, clearSessionCookie, handleError } = require("./_lib/core");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  const action = (req.body && req.body.action) || "me";
  if (req.method === "POST" && action === "logout") { clearSessionCookie(res); return res.status(200).json({ ok: true }); }
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ error: "Session belum dikonfigurasi dengan aman di Vercel." });
    const sql = getDB();
    await ensureSchema(sql);
    if (req.method === "GET") {
      const session = getSession(req);
      if (!session || !session.userId) return res.status(200).json({ user: null });
      const rows = await sql\`SELECT id, name, email FROM users WHERE id = \${session.userId} LIMIT 1\`;
      return res.status(200).json({ user: rows[0] || null });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
    const body = req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Masukkan alamat email yang valid." });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Password harus terdiri dari 8–128 karakter." });
    if (action === "register") {
      const name = String(body.name || "").trim();
      if (name.length < 2 || name.length > 60) return res.status(400).json({ error: "Nama harus terdiri dari 2–60 karakter." });
      const hash = await bcrypt.hash(password, 12);
      const id = randomUUID();
      try {
        const rows = await sql\`INSERT INTO users (id, name, email, password_hash) VALUES (\${id}, \${name}, \${email}, \${hash}) RETURNING id, name, email\`;
        const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET, { expiresIn: "7d", issuer: "grey-finance" });
        setSessionCookie(res, token);
        return res.status(201).json({ user: rows[0] });
      } catch (error) {
        if (error && error.code === "23505") return res.status(409).json({ error: "Email sudah terdaftar. Silakan masuk." });
        throw error;
      }
    }
    if (action === "login") {
      const rows = await sql\`SELECT id, name, email, password_hash FROM users WHERE email = \${email} LIMIT 1\`;
      const user = rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: "Email atau password tidak sesuai." });
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d", issuer: "grey-finance" });
      setSessionCookie(res, token);
      return res.status(200).json({ user: { id: user.id, name: user.name, email: user.email } });
    }
    return res.status(400).json({ error: "Aksi autentikasi tidak dikenal." });
  } catch (error) { return handleError(res, error); }
};