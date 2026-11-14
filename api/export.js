const {requireUser, getUserById, handleError} = require("../lib/core");
function xml(value) {
  return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
module.exports = async function(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({error:"Method not allowed."});
  try {
    const session = requireUser(req, res);
    if (!session) return;
    const user = await getUserById(session.id);
    if (!user) return res.status(401).json({error:"Akun tidak ditemukan."});
    const month = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : "";
    const rows = (user.transactions || []).filter(row => !month || String(row.date).startsWith(month))
      .sort((a,b) => String(b.date).localeCompare(String(a.date)));
    const headers = ["Date","Type","Category","Amount","Note"];
    const cells = values => "<Row>" + values.map((value,index) => {
      const numeric = index === 3 && Number.isFinite(Number(value));
      return '<Cell><Data ss:Type="' + (numeric ? "Number" : "String") + '">' + xml(value) + "</Data></Cell>";
    }).join("") + "</Row>";
    const sheet = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<?mso-application progid="Excel.Sheet"?>' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
      'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
      'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
      '<Worksheet ss:Name="Transactions"><Table>' + cells(headers) +
      rows.map(row => cells([row.date,row.type,row.category,Number(row.amount || 0),row.note || ""])).join("") +
      "</Table></Worksheet></Workbook>";
    res.setHeader("Content-Type","application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition",'attachment; filename="grey-finance-transactions.xls"');
    return res.status(200).send(sheet);
  } catch (error) { return handleError(res, error); }
};
