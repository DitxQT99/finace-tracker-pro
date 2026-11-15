const {randomUUID} = require("crypto");
const {requireUser, mutateUser, getUserById, handleError, validDate} = require("../lib/core");
const {applyDueRecurring} = require("../lib/recurring");
module.exports = async function(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const session = requireUser(req, res);
    if (!session) return;
    if (req.method === "GET") {
      await applyDueRecurring(session.id);
      const user = await getUserById(session.id);
      if (!user) return res.status(401).json({error:"Akun tidak ditemukan."});
      return res.status(200).json({recurring:user.recurring || []});
    }
    if (req.method === "POST") {
      const body = req.body || {};
      const type = body.type;
      const amount = Number(body.amount);
      const category = String(body.category || "").trim();
      const note = String(body.note || "").trim().slice(0, 120);
      const frequency = body.frequency;
      const startDate = body.startDate;
      if (!["income","expense"].includes(type) || !Number.isFinite(amount) || amount <= 0 ||
          amount > 999999999999999 || !category || category.length > 60 ||
          !["daily","weekly","monthly"].includes(frequency) || !validDate(startDate)) {
        return res.status(400).json({error:"Data transaksi rutin tidak valid."});
      }
      let saved = null;
      const user = await mutateUser(session.id, data => {
        data.recurring = Array.isArray(data.recurring) ? data.recurring : [];
        if (data.recurring.length >= 50) return data;
        saved = {
          id: randomUUID(), type, amount, category, note, frequency,
          startDate, nextDate: startDate, anchorDay: Number(startDate.slice(-2)), active: true,
          createdAt: new Date().toISOString()
        };
        data.recurring.unshift(saved);
        return data;
      });
      if (!user) return res.status(404).json({error:"Akun tidak ditemukan."});
      if (!saved) return res.status(400).json({error:"Maksimal 50 aturan transaksi rutin."});
      await applyDueRecurring(session.id);
      const refreshed = await getUserById(session.id);
      const currentRule = (refreshed?.recurring || []).find(item => item.id === saved.id) || saved;
      return res.status(201).json({recurring:currentRule});
    }
    if (req.method === "PATCH") {
      const body = req.body || {};
      const id = String(body.id || "");
      if (!id || typeof body.active !== "boolean") return res.status(400).json({error:"Perubahan aturan tidak valid."});
      let saved = null;
      const user = await mutateUser(session.id, data => {
        const rule = (data.recurring || []).find(item => item.id === id);
        if (rule) { rule.active = body.active; saved = rule; }
        return data;
      });
      if (!user) return res.status(404).json({error:"Akun tidak ditemukan."});
      if (!saved) return res.status(404).json({error:"Aturan tidak ditemukan."});
      return res.status(200).json({recurring:saved});
    }
    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!id) return res.status(400).json({error:"Aturan tidak valid."});
      let removed = false;
      const user = await mutateUser(session.id, data => {
        const rules = data.recurring || [];
        data.recurring = rules.filter(item => item.id !== id);
        removed = rules.length !== data.recurring.length;
        return data;
      });
      if (!user) return res.status(404).json({error:"Akun tidak ditemukan."});
      if (!removed) return res.status(404).json({error:"Aturan tidak ditemukan."});
      return res.status(200).json({ok:true});
    }
    return res.status(405).json({error:"Method not allowed."});
  } catch (error) { return handleError(res, error); }
};
