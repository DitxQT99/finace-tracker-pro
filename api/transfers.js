const {randomUUID} = require("crypto");
const {requireUser, mutateUser, handleError, validDate} = require("../lib/core");
const {ensureAccountData, accountBalance, activeAccount} = require("../lib/accounts");

module.exports = async function(req, res) {
  res.setHeader("Cache-Control","no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({error:"Method not allowed."});
  try {
    const session = requireUser(req,res);
    if (!session) return;
    const body = req.body || {};
    const fromAccountId = String(body.fromAccountId || "");
    const toAccountId = String(body.toAccountId || "");
    const amount = Number(body.amount);
    const date = body.date;
    const note = String(body.note || "").trim().slice(0,160);
    const transferId = String(body.transferId || randomUUID()).slice(0,100);
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId ||
        !Number.isFinite(amount) || amount <= 0 || amount > 999999999999999 ||
        !validDate(date) || !/^[a-zA-Z0-9_-]{8,100}$/.test(transferId)) {
      return res.status(400).json({error:"Data transfer tidak valid."});
    }
    let saved = null, problem = null;
    const user = await mutateUser(session.id,data => {
      saved = null; problem = null;
      ensureAccountData(data);
      data.transactions = Array.isArray(data.transactions) ? data.transactions : [];
      const prior = data.transactions.find(row => row.transferId === transferId);
      if (prior) {
        saved = {transferId, amount:prior.amount, date:prior.date, alreadyProcessed:true};
        return data;
      }
      const from = activeAccount(data,fromAccountId);
      const to = activeAccount(data,toAccountId);
      if (!from || !to) {
        problem = "Pilih dua akun yang masih aktif.";
        return data;
      }
      if (accountBalance(from,data.transactions) + 0.0001 < amount) {
        problem = "Saldo akun asal tidak mencukupi untuk transfer ini.";
        return data;
      }
      const createdAt = new Date().toISOString();
      const common = {transferId,amount,category:"Transfer",note:note || "Transfer antar akun",date,createdAt};
      const outgoing = {
        ...common,id:randomUUID(),type:"transfer_out",accountId:from.id,
        accountName:from.name,accountProvider:from.provider,
        counterpartyAccountId:to.id,counterpartyName:to.name,counterpartyProvider:to.provider
      };
      const incoming = {
        ...common,id:randomUUID(),type:"transfer_in",accountId:to.id,
        accountName:to.name,accountProvider:to.provider,
        counterpartyAccountId:from.id,counterpartyName:from.name,counterpartyProvider:from.provider
      };
      data.transactions.unshift(incoming);
      data.transactions.unshift(outgoing);
      saved = {transferId,amount,date,fromAccountId,toAccountId,fromAccountName:from.name,toAccountName:to.name};
      return data;
    });
    if (!user) return res.status(404).json({error:"Akun tidak ditemukan."});
    if (problem) return res.status(400).json({error:problem});
    if (!saved) return res.status(400).json({error:"Transfer tidak dapat disimpan."});
    return res.status(201).json({transfer:saved});
  } catch (error) {
    return handleError(res,error);
  }
};
