(() => {
  "use strict";
  const $ = (selector, root=document) => root.querySelector(selector);
  const money = value => {
    const currency = $("#currencySelect")?.value || "IDR";
    return new Intl.NumberFormat("id-ID",{style:"currency",currency,maximumFractionDigits:0}).format(Number(value||0));
  };
  const balancesHidden = () => $("#privacyToggle")?.title === "Tampilkan saldo";
  const escapeHTML = value => String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const nav = document.createElement("button");
  nav.className = "nav-item";
  nav.dataset.view = "recurring";
  nav.innerHTML = '<span class="nav-icon">↻</span>Recurring';
  const reportsNav = $('.side-nav [data-view="reports"]');
  if (reportsNav) reportsNav.before(nav);
  const section = document.createElement("section");
  section.id = "view-recurring";
  section.className = "view";
  section.innerHTML = '<div class="section-intro"><div><div class="eyebrow">AUTOMATE YOUR MONEY LOG</div><h2>Recurring transactions</h2><p>Atur transaksi rutin seperti gaji, sewa, dan tagihan.</p></div><button class="btn btn-primary" id="addRecurringBtn">＋ New rule</button></div><div class="panel" style="margin-bottom:14px"><div class="eyebrow">HOW IT WORKS</div><p style="color:var(--muted);font-size:11px;line-height:1.7;margin:8px 0 0">Transaksi rutin dicatat otomatis saat akun memuat data. Jika tanggalnya terlewat ketika kamu offline, transaksi yang jatuh tempo akan dibuat saat aplikasi dibuka kembali.</p></div><div id="recurringList" class="goal-grid"><div class="panel empty-state">Memuat aturan rutin…</div></div>';
  const reports = $("#view-reports");
  if (reports) reports.before(section);
  const reportHead = reports?.querySelector(".section-intro");
  if (reportHead) {
    const excel = document.createElement("button");
    excel.className = "btn btn-ghost";
    excel.id = "exportReportExcelBtn";
    excel.textContent = "↓ Excel";
    reportHead.append(excel);
    const insights = document.createElement("div");
    insights.id = "advancedInsights";
    insights.className = "metric-grid";
    insights.innerHTML = '<article class="metric-card"><div class="metric-head">Saving rate</div><strong id="insightSavingRate">—</strong><small class="metric-foot">Income saved this month</small></article><article class="metric-card"><div class="metric-head">Daily average</div><strong id="insightDailyAverage">—</strong><small class="metric-foot">Average expense per day</small></article><article class="metric-card"><div class="metric-head">Expense change</div><strong id="insightExpenseChange">—</strong><small class="metric-foot">Compared with last month</small></article><article class="metric-card"><div class="metric-head">Top category</div><strong id="insightTopCategory">—</strong><small class="metric-foot">Highest expense category</small></article>';
    reports.insertBefore(insights, reports.querySelector(".content-grid"));
  }
  const transactionToolbar = $(".toolbar");
  if (transactionToolbar) {
    const excel = document.createElement("button");
    excel.className = "btn btn-ghost";
    excel.id = "exportExcelBtn";
    excel.textContent = "↓ Excel";
    const csv = $("#exportCsvBtn");
    if (csv) csv.after(excel);
  }
  const modal = document.createElement("div");
  modal.id = "recurringModal";
  modal.className = "modal-backdrop hidden";
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-modal","true");
  modal.innerHTML = '<div class="modal-card"><div class="modal-head"><div><span class="eyebrow">SET IT ONCE</span><h2>New recurring rule</h2></div><button class="icon-button close-modal" id="closeRecurringModal" aria-label="Close">×</button></div><form id="recurringForm" class="modal-form"><div class="type-switch"><label><input type="radio" name="recurringType" value="expense" checked><span>↘ Expense</span></label><label><input type="radio" name="recurringType" value="income"><span>↗ Income</span></label></div><label>Amount<div class="amount-input"><span>Rp</span><input id="recurringAmount" type="number" min="1" step="1" placeholder="0" required></div></label><div class="form-two"><label>Category<input id="recurringCategory" maxlength="60" placeholder="e.g. Salary / Internet" required></label><label>Frequency<select id="recurringFrequency" required><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="daily">Daily</option></select></label></div><label>First date<input id="recurringStartDate" type="date" required></label><label>Note <span class="optional">(optional)</span><input id="recurringNote" maxlength="120" placeholder="Optional details"></label><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelRecurring">Cancel</button><button type="submit" class="btn btn-primary">Save rule</button></div></form></div>';
  document.body.append(modal);
  async function api(path, options={}) {
    const response = await fetch(path,{method:options.method||"GET",credentials:"same-origin",headers:options.body?{"Content-Type":"application/json"}:{},body:options.body?JSON.stringify(options.body):undefined});
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error||"Request failed.");
    return data;
  }
  function notify(message,error=false) {
    const region=$("#toastRegion");
    if(!region) return;
    const toast=document.createElement("div");
    toast.className="toast"+(error?" error":"");
    toast.textContent=message;
    region.append(toast);
    setTimeout(()=>toast.remove(),3500);
  }
  function showRecurringView() {
    document.querySelectorAll(".view").forEach(item=>item.classList.toggle("active",item.id==="view-recurring"));
    document.querySelectorAll(".nav-item[data-view]").forEach(item=>item.classList.toggle("active",item===nav));
    $("#pageTitle").textContent="Recurring";
    $("#sidebar").classList.remove("open");
    loadRecurring();
  }
  async function loadRecurring() {
    const list=$("#recurringList");
    if(!list) return;
    list.innerHTML='<div class="panel empty-state">Loading recurring rules…</div>';
    try {
      const data=await api("/api/recurring");
      const rules=data.recurring||[];
      if(!rules.length){list.innerHTML='<div class="panel empty-state">Belum ada transaksi rutin. Tambahkan gaji atau tagihan yang berulang.</div>';return;}
      list.innerHTML=rules.map(rule=>{
        const label=rule.frequency==="monthly"?"Bulanan":rule.frequency==="weekly"?"Mingguan":"Harian";
        return '<article class="goal-card"><div class="goal-card-head"><div><h3>'+escapeHTML(rule.category)+'</h3><small>'+label+' · '+(rule.type==="income"?"Pemasukan":"Pengeluaran")+'</small></div><span class="metric-icon '+(rule.type==="income"?"green":"red")+'">'+(rule.type==="income"?"↗":"↘")+'</span></div><div class="goal-amounts"><strong class="money-display'+(balancesHidden()?' privacy-hidden':'')+'">'+money(rule.amount)+'</strong><span>'+(rule.active?"Aktif":"Dijeda")+'</span></div><div class="goal-progress"><div class="goal-progress-top"><span>Jadwal berikutnya</span><b>'+escapeHTML(rule.nextDate||"—")+'</b></div><div class="progress-track"><div class="progress-fill" style="width:'+(rule.active?100:0)+'%"></div></div></div><div class="goal-actions"><button data-toggle-recurring="'+escapeHTML(rule.id)+'" data-active="'+(!rule.active)+'">'+(rule.active?"Pause":"Activate")+'</button><button data-delete-recurring="'+escapeHTML(rule.id)+'">Remove ×</button></div></article>';
      }).join("");
    } catch(error){list.innerHTML='<div class="panel empty-state">'+escapeHTML(error.message)+'</div>';}
  }
  function openModal(){
    $("#recurringForm").reset();
    $("#recurringStartDate").value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
    modal.classList.remove("hidden");
    $("#recurringAmount").focus();
  }
  function closeModal(){modal.classList.add("hidden");}
  nav.addEventListener("click",showRecurringView);
  $("#addRecurringBtn").addEventListener("click",openModal);
  $("#closeRecurringModal").addEventListener("click",closeModal);
  $("#cancelRecurring").addEventListener("click",closeModal);
  modal.addEventListener("click",event=>{if(event.target===modal)closeModal();});
  $("#recurringForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const submit = $("#recurringForm button[type=submit]");
    if (submit.disabled) return;
    submit.disabled = true;
    const originalLabel = submit.textContent;
    submit.textContent = "Saving…";
    const body={
      type:$('input[name="recurringType"]:checked').value,
      amount:Number($("#recurringAmount").value),
      category:$("#recurringCategory").value.trim(),
      frequency:$("#recurringFrequency").value,
      startDate:$("#recurringStartDate").value,
      note:$("#recurringNote").value.trim()
    };
    try{await api("/api/recurring",{method:"POST",body});closeModal();notify("Recurring rule saved.");loadRecurring();}
    catch(error){notify(error.message,true);}
    finally { submit.disabled = false; submit.textContent = originalLabel; }
  });
  document.addEventListener("click",async event=>{
    const toggle=event.target.closest("[data-toggle-recurring]");
    const remove=event.target.closest("[data-delete-recurring]");
    if(toggle){
      try{await api("/api/recurring",{method:"PATCH",body:{id:toggle.dataset.toggleRecurring,active:toggle.dataset.active==="true"}});loadRecurring();notify("Recurring rule updated.");}
      catch(error){notify(error.message,true);}
    }
    if(remove){
      if(!confirm("Hapus aturan transaksi rutin ini?"))return;
      try{await api("/api/recurring?id="+encodeURIComponent(remove.dataset.deleteRecurring),{method:"DELETE"});loadRecurring();notify("Recurring rule removed.");}
      catch(error){notify(error.message,true);}
    }
  });
  async function exportExcel(){
    try{
      const response=await fetch("/api/export?format=xls",{credentials:"same-origin"});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||"Export gagal.");}
      const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download="grey-finance-transactions.xls";document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      notify("File Excel berhasil disiapkan.");
    }catch(error){notify(error.message,true);}
  }
  $("#exportExcelBtn")?.addEventListener("click",exportExcel);
  $("#exportReportExcelBtn")?.addEventListener("click",exportExcel);
  const printButton=$("#printReportBtn");
  if(printButton)printButton.textContent="↓ Save PDF / Print";
  async function renderInsights(){
    try{
      const data=await api("/api/analytics"),insights=data.insights||{};
      $("#insightSavingRate").textContent=(insights.savingRate??0)+"%";
      $("#insightDailyAverage").textContent=money(insights.dailyAverageExpense||0);
      $("#insightDailyAverage").classList.add("money-display");
      $("#insightDailyAverage").classList.toggle("privacy-hidden",balancesHidden());
      const change=Number(insights.expenseChange||0);
      $("#insightExpenseChange").textContent=(change>0?"+":"")+change+"%";
      $("#insightTopCategory").textContent=insights.topCategory?.category||"—";
    }catch(error){}
  }
  document.querySelectorAll('[data-view="reports"]').forEach(button=>button.addEventListener("click",renderInsights));
  $("#currencySelect")?.addEventListener("change",()=>{renderInsights();loadRecurring();});
  document.addEventListener("greyfinance:ready",renderInsights);
})();
