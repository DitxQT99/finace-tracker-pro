const {mutateUser, getUserById} = require("./core");

function localDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const get = type => parts.find(part => part.type === type).value;
  return get("year") + "-" + get("month") + "-" + get("day");
}
function addPeriod(value, frequency, anchorDay) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (frequency === "daily") date.setUTCDate(date.getUTCDate() + 1);
  else if (frequency === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  else {
    const targetMonth = date.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(targetMonth);
    date.setUTCDate(Math.min(Number(anchorDay) || day, lastDay));
  }
  return date.toISOString().slice(0, 10);
}
async function applyDueRecurring(userId) {
  const snapshot = await getUserById(userId);
  const today = localDate();
  const hasDue = (snapshot?.recurring || []).some(rule => rule.active && rule.nextDate && rule.nextDate <= today);
  if (!hasDue) return snapshot;
  return mutateUser(userId, user => {
    user.recurring = Array.isArray(user.recurring) ? user.recurring : [];
    user.transactions = Array.isArray(user.transactions) ? user.transactions : [];
    const primary = (user.accounts || []).find(account => !account.archivedAt);
    for (const rule of user.recurring) {
      if (!rule.active || !rule.nextDate) continue;
      if (!rule.anchorDay) rule.anchorDay = Number(String(rule.startDate || rule.nextDate).slice(-2)) || 1;
      let safety = 0;
      while (rule.nextDate <= today && safety < 120) {
        const transactionId = "rec-" + rule.id + "-" + rule.nextDate;
        if (!user.transactions.some(item => item.id === transactionId)) {
          const account = (user.accounts || []).find(item => item.id === rule.accountId && !item.archivedAt) || primary;
          user.transactions.unshift({
            id: transactionId,
            type: rule.type,
            amount: Number(rule.amount),
            category: rule.category,
            note: rule.note || "Recurring: " + rule.category,
            date: rule.nextDate,
            createdAt: new Date().toISOString(),
            recurringId: rule.id,
            ...(account ? {accountId:account.id,accountName:account.name,accountProvider:account.provider} : {})
          });
        }
        rule.lastGenerated = rule.nextDate;
        rule.nextDate = addPeriod(rule.nextDate, rule.frequency, rule.anchorDay);
        safety++;
      }
    }
    return user;
  });
}
module.exports = {applyDueRecurring};
