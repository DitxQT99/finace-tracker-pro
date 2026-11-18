const {requireUser,getUserById,handleError}=require("../lib/core");
const {accountBalance,ensureAccountData}=require("../lib/accounts");
function monthKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit"}).formatToParts(date);
  return parts.find(x=>x.type==="year").value+"-"+parts.find(x=>x.type==="month").value;
}
module.exports=async function(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed."});
  try {
    const session=requireUser(req,res);if(!session)return;
    const user=await getUserById(session.id);if(!user)return res.status(401).json({error:"Akun tidak ditemukan."});
    ensureAccountData(user); // legacy transaction compatibility, read-only
    const transactions=user.transactions||[];
    const sum=(rows,type)=>rows.filter(row=>row.type===type).reduce((total,row)=>total+Number(row.amount||0),0);
    const now=new Date(),currentMonth=monthKey(now);
    const [currentYear,currentMonthNumber]=currentMonth.split("-").map(Number);
    const previousDate=new Date(Date.UTC(currentYear,currentMonthNumber-1,1));
    previousDate.setUTCMonth(previousDate.getUTCMonth()-1);
    const previousMonth=previousDate.getUTCFullYear()+"-"+String(previousDate.getUTCMonth()+1).padStart(2,"0");
    const currentRows=transactions.filter(row=>String(row.date).startsWith(currentMonth));
    const previousRows=transactions.filter(row=>String(row.date).startsWith(previousMonth));
    const income=sum(transactions,"income"),expense=sum(transactions,"expense");
    const currentIncome=sum(currentRows,"income"),currentExpense=sum(currentRows,"expense");
    const previousExpense=sum(previousRows,"expense");
    const accounts=user.accounts||[];
    const balance=accounts.length?accounts.reduce((total,account)=>total+accountBalance(account,transactions),0):income-expense;
    const daysElapsed=Number(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Jakarta",day:"numeric"}).format(now));
    const categoryTotals={};
    currentRows.filter(row=>row.type==="expense").forEach(row=>{
      categoryTotals[row.category]=(categoryTotals[row.category]||0)+Number(row.amount||0);
    });
    const categories=Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([category,total])=>({category,total}));
    const monthly=Array.from({length:12},(_,index)=>{
      const date=new Date(Date.UTC(currentYear,currentMonthNumber-1-11+index,1));
      const key=date.getUTCFullYear()+"-"+String(date.getUTCMonth()+1).padStart(2,"0");
      const rows=transactions.filter(row=>String(row.date).startsWith(key));
      return {month:key,income:sum(rows,"income"),expense:sum(rows,"expense")};
    });
    const expenseChange=previousExpense>0?((currentExpense-previousExpense)/previousExpense)*100:(currentExpense>0?100:0);
    return res.status(200).json({
      income,expense,balance,
      currentMonth:{income:currentIncome,expense:currentExpense},
      previousMonth:{month:previousMonth,income:sum(previousRows,"income"),expense:previousExpense},
      monthly,categories,
      insights:{
        savingRate:currentIncome>0?Math.round(Math.max(0,(currentIncome-currentExpense)/currentIncome*100)):0,
        dailyAverageExpense:Math.round(currentExpense/Math.max(1,daysElapsed)),
        expenseChange:Math.round(expenseChange),
        topCategory:categories[0]||null,
        transactionCount:currentRows.filter(row=>row.type==="income"||row.type==="expense").length
      }
    });
  }catch(error){return handleError(res,error);}
};
