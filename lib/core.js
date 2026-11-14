const { neon } = require("@neondatabase/serverless");
const jwt = require("jsonwebtoken");
let sqlClient;
function getDB() {
  if (!process.env.DATABASE_URL) {
    const error = new Error("Database belum tersambung. Hubungkan Neon PostgreSQL ke project Vercel.");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}
async function ensureSchema(sql) {
  await sql`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name VARCHAR(60) NOT NULL, email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0), category VARCHAR(60) NOT NULL,
    note VARCHAR(160), transaction_date DATE NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(60) NOT NULL, limit_amount NUMERIC(18,2) NOT NULL CHECK (limit_amount > 0),
    month VARCHAR(7) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, category, month)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(60) NOT NULL, target_amount NUMERIC(18,2) NOT NULL CHECK (target_amount > 0),
    saved_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
    deadline DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions(user_id, transaction_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS budgets_user_month_idx ON budgets(user_id, month)`;
  await sql`CREATE INDEX IF NOT EXISTS goals_user_created_idx ON goals(user_id, created_at DESC)`;
}
function getSession(req) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)grey_session=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(decodeURIComponent(match[1]), secret); } catch { return null; }
}
function requireUser(req, res) {
  const session = getSession(req);
  if (!session || !session.userId) { res.status(401).json({ error: "Sesi berakhir. Silakan masuk kembali." }); return null; }
  return { id: session.userId };
}
function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", "grey_session=" + encodeURIComponent(token) + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800" + secure);
}
function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", "grey_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" + secure);
}
function handleError(res, error) {
  if (error && error.code === "DATABASE_NOT_CONFIGURED") return res.status(503).json({ error: "Database belum tersambung. Hubungkan Neon PostgreSQL melalui Vercel Marketplace.", code: "DATABASE_NOT_CONFIGURED" });
  if (!process.env.JWT_SECRET) return res.status(503).json({ error: "Konfigurasi session belum lengkap. Atur JWT_SECRET di Vercel." });
  console.error("Grey Finance API error:", error && error.message ? error.message : "Unknown error");
  return res.status(500).json({ error: "Terjadi kendala pada server. Coba lagi sebentar." });
}
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split("-").map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1]-1, parts[2]));
  return date.getUTCFullYear()===parts[0] && date.getUTCMonth()+1===parts[1] && date.getUTCDate()===parts[2];
}
module.exports = { getDB, ensureSchema, getSession, requireUser, setSessionCookie, clearSessionCookie, handleError, validDate };