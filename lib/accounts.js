const {randomUUID} = require("crypto");

function ensureAccountData(user) {
  user.accounts = Array.isArray(user.accounts) ? user.accounts : [];
  user.transactions = Array.isArray(user.transactions) ? user.transactions : [];
  if (!user.accounts.length) {
    user.accounts.push({
      id: "cash-default",
      type: "cash",
      provider: "cash",
      providerName: "Cash",
      name: "Cash",
      accountNumber: "",
      openingBalance: 0,
      createdAt: new Date().toISOString()
    });
  }
  const primary = user.accounts.find(account => !account.archivedAt) || user.accounts[0];
  for (const transaction of user.transactions) {
    if (!transaction.accountId && primary && !["transfer_in", "transfer_out"].includes(transaction.type)) {
      transaction.accountId = primary.id;
      transaction.accountName = transaction.accountName || primary.name || "Cash";
      transaction.accountProvider = transaction.accountProvider || primary.provider || "cash";
    }
  }
  return user;
}

function accountBalance(account, transactions) {
  return Number(account.openingBalance || 0) + (transactions || []).reduce((balance, row) => {
    if (row.accountId !== account.id) return balance;
    const amount = Number(row.amount || 0);
    if (row.type === "income" || row.type === "transfer_in") return balance + amount;
    if (row.type === "expense" || row.type === "transfer_out") return balance - amount;
    return balance;
  }, 0);
}

function activeAccount(user, id) {
  return (user.accounts || []).find(account => account.id === id && !account.archivedAt) || null;
}

module.exports = {ensureAccountData, accountBalance, activeAccount};
