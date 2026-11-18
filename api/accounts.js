const {randomUUID} = require("crypto");
const {requireUser, mutateUser, getUserById, handleError} = require("../lib/core");
const {ensureAccountData, accountBalance, activeAccount} = require("../lib/accounts");

function number(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 999999999999999 ? amount : null;
}
function accountPayload(account, transactions) {
  return {...account, balance: accountBalance(account, transactions), transactionCount: transactions.filter(row => row.accountId === account.id).length};
}

module.exports = async function(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    const session = requireUser(req, res);
    if (!session) return;

    if (req.method === "GET") {
      let user = await getUserById(session.id);
      if (!user) return res.status(401).json({error:"Akun tidak ditemukan."});
      const needsMigration = !Array.isArray(user.accounts) || !user.accounts.length ||
        (user.transactions || []).some(row => !row.accountId && !["transfer_in","transfer_out"].includes(row.type));
      if (needsMigration) {
        await mutateUser(session.id, data => ensureAccountData(data));
        user = await getUserById(session.id);
      }
      const transactions = user.transactions || [];
      const active = (user.accounts || []).filter(account => !account.archivedAt);
      const archived = (user.accounts || []).filter(account => !!account.archivedAt);
      const accounts = active.map(account => accountPayload(account, transactions));
      const archivedAccounts = archived.map(account => accountPayload(account, transactions));
      return res.status(200).json({
        accounts,
        archivedAccounts,
        totalBalance: accounts.reduce((sum, account) => sum + account.balance, 0)
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const type = body.type;
      const provider = type === "cash" ? "cash" : String(body.provider || "").trim().toLowerCase();
      const providerName = type === "cash" ? "Cash" : String(body.providerName || "").trim().slice(0,80);
      const name = String(body.name || providerName || "Cash").trim().slice(0,60);
      const accountNumber = String(body.accountNumber || "").trim().slice(0,40);
      const openingBalance = number(body.openingBalance ?? 0);
      if (!["cash","ewallet","bank"].includes(type) ||
          (type !== "cash" && (!/^[a-z0-9-]{1,60}$/.test(provider) || providerName.length < 2)) ||
          name.length < 2 || openingBalance === null) {
        return res.status(400).json({error:"Data akun tidak valid."});
      }
      const id = randomUUID();
      let saved = null, problem = null;
      const user = await mutateUser(session.id, data => {
        saved = null; problem = null;
        ensureAccountData(data);
        if (data.accounts.filter(account => !account.archivedAt).length >= 100) {
          problem = "Maksimal 100 akun aktif.";
          return data;
        }
        saved = {id,type,provider,providerName,name,accountNumber,openingBalance,createdAt:new Date().toISOString()};
        data.accounts.unshift(saved);
        return data;
      });
      if (!user) return res.status(404).json({error:"Akun tidak ditemukan."});
      if (problem) return res.status(400).json({error:problem});
      return res.status(201).json({account:accountPayload(saved,user.transactions || [])});
    }

    if (req.method === "PATCH") {
      const body = req.body || {};
      const id = String(body.id || "");
      const name = String(body.name || "").trim().slice(0,60);
      const accountNumber = String(body.accountNumber || "").trim().slice(0,40);
      const openingBalance = body.openingBalance === undefined ? undefined : number(body.openingBalance);
      if (!id || name.length < 2 || (body.openingBalance !== undefined && openingBalance === null)) {
        return res.status(400).json({error:"Perubahan akun tidak valid."});
      }
      let saved = null, problem = null;
      const user = await mutateUser(session.id, data => {
        saved = null; problem = null;
        ensureAccountData(data);
        const account = activeAccount(data,id);
        if (!account) return data;
        if (openingBalance !== undefined) {
          const movementBalance = accountBalance(account,data.transactions || []) - Number(account.openingBalance || 0);
          if (openingBalance + movementBalance < -0.009) {
            problem = "Saldo awal baru membuat saldo akun menjadi negatif.";
            return data;
          }
          account.openingBalance = openingBalance;
        }
        account.name = name;
        account.accountNumber = accountNumber;
        saved = account;
        return data;
      });
      if (!user) return res.status(404).json({error:"Akun tidak ditemukan."});
      if (problem) return res.status(400).json({error:problem});
      if (!saved) return res.status(404).json({error:"Akun sumber dana tidak ditemukan."});
      return res.status(200).json({account:accountPayload(saved,user.transactions || [])});
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!id) return res.status(400).json({error:"Akun tidak valid."});
      let removed = false, problem = null;
      const user = await mutateUser(session.id, data => {
        removed = false; problem = null;
        ensureAccountData(data);
        const active = (data.accounts || []).filter(account => !account.archivedAt);
        const account = activeAccount(data,id);
        if (!account) return data;
        if (active.length <= 1) {
          problem = "Minimal harus ada satu sumber dana aktif.";
          return data;
        }
        const balance = accountBalance(account,data.transactions || []);
        if (Math.abs(balance) > 0.009) {
          problem = "Saldo akun harus Rp0 sebelum dihapus. Pindahkan saldo terlebih dahulu.";
          return data;
        }
        account.archivedAt = new Date().toISOString();
        removed = true;
        return data;
      });
      if (!user) return res.status(404).json({error:"Akun tidak ditemukan."});
      if (problem) return res.status(400).json({error:problem});
      if (!removed) return res.status(404).json({error:"Akun tidak ditemukan."});
      return res.status(200).json({ok:true});
    }
    return res.status(405).json({error:"Method not allowed."});
  } catch (error) {
    return handleError(res,error);
  }
};
