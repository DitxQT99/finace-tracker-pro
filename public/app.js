/* Grey Finance — responsive personal finance dashboard */
(() => {
  "use strict";
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const state = {
    user: null, analytics: null, transactions: [], budgets: [], goals: [],
    view: "overview", authMode: "login", hideBalances: false,
    theme: localStorage.getItem("grey-theme") || "dark",
    currency: localStorage.getItem("grey-currency") || "IDR",
    chartRange: 6
  };
  const currencyMeta = { IDR: { locale:"id-ID", symbol:"Rp" }, USD:{ locale:"en-US", symbol:"$" }, SGD:{ locale:"en-SG", symbol:"S$" } };

  function money(value) {
    const amount = Number(value || 0);
    const meta = currencyMeta[state.currency] || currencyMeta.IDR;
    return new Intl.NumberFormat(meta.locale, {
      style:"currency", currency:state.currency,
      maximumFractionDigits:state.currency === "IDR" ? 0 : 2
    }).format(amount);
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[ch]);
  }
  function shortDate(value) {
    if (!value) return "—";
    const date = new Date(value + (String(value).length === 10 ? "T12:00:00" : ""));
    return new Intl.DateTimeFormat("id-ID", { day:"2-digit", month:"short", year:"numeric" }).format(date);
  }
  function monthName(value) {
    const date = new Date(value + "-01T12:00:00");
    return new Intl.DateTimeFormat("id-ID", { month:"short" }).format(date);
  }
  function notify(message, type="success") {
    const toast = document.createElement("div");
    toast.className = "toast" + (type === "error" ? " error" : "");
    toast.textContent = message;
    $("#toastRegion").appendChild(toast);
    setTimeout(() => toast.remove(), 3600);
  }
  function showAuthNotice(message, info=false) {
    const el = $("#authNotice");
    el.textContent = message;
    el.classList.remove("hidden", "info");
    if (info) el.classList.add("info");
  }
  function hideAuthNotice() { $("#authNotice").classList.add("hidden"); }
  function showDatabaseNotice() {
    const el=$("#authNotice");
    el.textContent="Penyimpanan sementara tidak tersedia. Coba lagi beberapa saat.";
    el.classList.remove("hidden");
    el.classList.add("info");
  }
  async function api(path, options={}) {
    const response = await fetch(path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: options.body ? { "Content-Type":"application/json", ...(options.headers || {}) } : (options.headers || {}),
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.code === "GITHUB_NOT_CONFIGURED") {
        showDatabaseNotice();
      }
      throw new Error(data.error || "Request failed. Try again.");
    }
    return data;
  }
  function setAuthMode(mode) {
    state.authMode = mode;
    const register = mode === "register";
    $("#loginForm").classList.toggle("hidden", register);
    $("#registerForm").classList.toggle("hidden", !register);
    $("#authTitle").textContent = register ? "Buat akun Grey" : "Masuk ke akunmu";
    $("#authSubtitle").textContent = register ? "Mulai bangun kebiasaan finansial yang lebih rapi." : "Lanjutkan perjalanan finansialmu.";
    hideAuthNotice();
  }
  function setTheme(theme) {
    state.theme = theme;
    document.body.classList.toggle("light-theme", theme === "light");
    $("#themeSelect").value = theme;
    $("#themeToggle").textContent = theme === "dark" ? "☼" : "☾";
    localStorage.setItem("grey-theme", theme);
  }
  function setCurrency(currency) {
    state.currency = currencyMeta[currency] ? currency : "IDR";
    $("#currencySelect").value = state.currency;
    $("#currencyPrefix").textContent = currencyMeta[state.currency].symbol;
    $("#planCurrencyPrefix").textContent = currencyMeta[state.currency].symbol;
    localStorage.setItem("grey-currency", state.currency);
    if (state.analytics) renderDashboard();
    if (state.transactions) renderTransactions();
    if (state.budgets || state.goals) renderPlans();
  }
  function setBalancesHidden(hidden) {
    state.hideBalances = hidden;
    $("#privacyToggle").textContent = hidden ? "◎" : "◉";
    $("#privacyToggle").title = hidden ? "Tampilkan saldo" : "Sembunyikan saldo";
    $$(".money-display").forEach(el => el.classList.toggle("privacy-hidden", hidden));
  }
  function showApp(user) {
    state.user = user;
    $("#authScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
    const name = user.name || "Grey User";
    $("#welcomeName").textContent = name.split(" ")[0];
    $("#sideUserName").textContent = name;
    $("#sideUserEmail").textContent = user.email || "Personal account";
    $("#settingsEmail").textContent = user.email || "Personal account";
    $("#userAvatar").textContent = name.trim().charAt(0).toUpperCase() || "G";
    $("#dateLabel").textContent = "PERSONAL FINANCE / " + new Intl.DateTimeFormat("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" }).format(new Date()).toUpperCase();
    $("#currentMonthLabel").textContent = new Intl.DateTimeFormat("id-ID", { month:"long", year:"numeric" }).format(new Date());
    $("#footerYear").textContent = new Date().getFullYear();
    setTheme(state.theme);
    setCurrency(state.currency);
    refreshAll();
  }
  function showAuth() {
    $("#appShell").classList.add("hidden");
    $("#authScreen").classList.remove("hidden");
    setAuthMode("login");
  }
  const titleMap = { overview:"Overview", transactions:"Transactions", budgets:"Budgets", goals:"Saving goals", reports:"Reports", settings:"Settings" };
  function showView(view) {
    if (!titleMap[view]) return;
    state.view = view;
    $$(".view").forEach(el => el.classList.toggle("active", el.id === "view-" + view));
    $$(".nav-item[data-view]").forEach(el => el.classList.toggle("active", el.dataset.view === view));
    $("#pageTitle").textContent = titleMap[view];
    $("#sidebar").classList.remove("open");
    if (view === "transactions") renderTransactions();
    if (view === "budgets" || view === "goals") renderPlans();
    if (view === "reports") renderReport();
  }
  function changeAmount(element, value) {
    if (!element) return;
    element.textContent = money(value);
    element.classList.add("money-display");
    element.classList.toggle("privacy-hidden", state.hideBalances);
  }
  function renderDashboard() {
    const data = state.analytics || {};
    const current = data.currentMonth || {};
    const income = Number(current.income || 0);
    const expense = Number(current.expense || 0);
    const balance = Number(data.balance || 0);
    const rate = income > 0 ? Math.max(0, Math.min(100, ((income-expense)/income)*100)) : 0;
    changeAmount($("#balanceValue"), balance);
    changeAmount($("#heroIncome"), data.income || 0);
    changeAmount($("#heroExpense"), data.expense || 0);
    changeAmount($("#monthIncome"), income);
    changeAmount($("#monthExpense"), expense);
    changeAmount($("#netFlow"), income-expense);
    $("#savingRate").textContent = Math.round(rate) + "%";
    $("#balanceNote").textContent = balance < 0 ? "Expenses are higher than income" : "You're building a clearer money picture";
    renderChart($("#cashflowChart"), data.monthly || [], state.chartRange);
    renderCategories($("#categoryList"), data.categories || []);
    renderRecent();
    renderPlans();
  }
  function renderChart(container, rows, count=6) {
    if (!container) return;
    const series = (rows || []).slice(-count);
    if (!series.length) {
      container.innerHTML = '<div class="chart-placeholder">No cash flow data yet. Add a transaction to see the chart.</div>';
      return;
    }
    const maxValue = Math.max(1, ...series.map(row => Math.max(Number(row.income||0), Number(row.expense||0))));
    const width = 660, height = 205, left=12, right=12, top=14, bottom=28;
    const plotW = width-left-right, plotH=height-top-bottom;
    const x = index => left + (series.length === 1 ? plotW/2 : index*plotW/(series.length-1));
    const y = value => top + plotH - (Number(value||0)/maxValue)*plotH;
    const pathFor = key => series.map((row,index) => (index ? "L" : "M") + x(index).toFixed(1) + " " + y(row[key]).toFixed(1)).join(" ");
    const grids = [0, .33, .66, 1].map(f => {
      const gy = top + plotH*f;
      return '<line x1="'+left+'" y1="'+gy+'" x2="'+(width-right)+'" y2="'+gy+'" class="chart-grid-line"/>';
    }).join("");
    const labels = series.map((row,index) => '<text x="'+x(index)+'" y="'+(height-5)+'" text-anchor="middle" class="chart-label">'+escapeHTML(monthName(row.month))+'</text>').join("");
    const points = key => series.map((row,index) => '<circle cx="'+x(index)+'" cy="'+y(row[key])+'" r="3" fill="'+(key==="income"?"#73d59a":"#ef8989")+'"/>').join("");
    container.innerHTML = '<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Grafik pemasukan dan pengeluaran per bulan">'+grids+'<path d="'+pathFor("income")+'" class="chart-line-income"/><path d="'+pathFor("expense")+'" class="chart-line-expense"/>'+points("income")+points("expense")+labels+'</svg>';
  }
  function renderCategories(container, categories) {
    if (!container) return;
    const rows = (categories || []).slice(0,5);
    if (!rows.length) { container.innerHTML='<div class="empty-mini">No spending data yet. Your categories will appear here.</div>'; return; }
    const max = Math.max(1, ...rows.map(row => Number(row.total||0)));
    container.innerHTML = rows.map((row,index) => {
      const value = Number(row.total||0);
      const pct = Math.max(3, Math.round(value/max*100));
      return '<div class="category-item"><div class="category-top"><span>'+escapeHTML(row.category)+'</span><b class="money-display'+(state.hideBalances?' privacy-hidden':'')+'">'+money(value)+'</b></div><div class="category-track"><div class="category-fill'+(index%3===1?' alt':'')+'" style="width:'+pct+'%"></div></div></div>';
    }).join("");
  }
  const categoryGlyph = category => {
    const value = String(category || "").toLowerCase();
    if (value.includes("food") || value.includes("drink")) return "⌁";
    if (value.includes("transport")) return "↗";
    if (value.includes("shop")) return "◇";
    if (value.includes("bill")) return "▤";
    if (value.includes("health")) return "＋";
    if (value.includes("salary") || value.includes("income")) return "↗";
    if (value.includes("education")) return "▣";
    return "✦";
  };
  function renderRecent() {
    const list = $("#recentTransactions");
    const rows = state.transactions.slice(0,5);
    if (!rows.length) { list.innerHTML='<div class="empty-mini">No transactions yet. Add your first one.</div>'; return; }
    list.innerHTML = rows.map(row => '<div class="recent-item"><div class="category-icon">'+categoryGlyph(row.category)+'</div><div class="recent-copy"><b>'+escapeHTML(row.category)+'</b><small>'+escapeHTML(row.note || row.type)+' · '+shortDate(row.date)+'</small></div><div class="recent-amount '+row.type+' money-display'+(state.hideBalances?' privacy-hidden':'')+'">'+(row.type==="income"?"+":"−")+money(row.amount)+'</div></div>').join("");
  }
  function filteredTransactions() {
    const search = ($("#transactionSearch")?.value || "").trim().toLowerCase();
    const type = $("#transactionTypeFilter")?.value || "all";
    const month = $("#transactionMonthFilter")?.value || "";
    return state.transactions.filter(row => {
      const haystack = (row.category+" "+(row.note||"")).toLowerCase();
      return (!search || haystack.includes(search)) && (type==="all" || row.type===type) && (!month || String(row.date).startsWith(month));
    });
  }
  function renderTransactions() {
    const body = $("#transactionsTable");
    if (!body) return;
    const rows = filteredTransactions();
    $("#transactionCount").textContent = rows.length + " records";
    if (!rows.length) {
      body.innerHTML='<tr><td colspan="6" class="table-empty">No transactions match your filters.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(row => '<tr><td><span class="recent-copy"><b>'+escapeHTML(row.note || row.category)+'</b><small>'+escapeHTML(row.id.slice(0,8).toUpperCase())+'</small></span></td><td>'+shortDate(row.date)+'</td><td>'+escapeHTML(row.category)+'</td><td><span class="type-chip '+row.type+'">'+(row.type==="income"?"INCOME":"EXPENSE")+'</span></td><td class="align-right amount-cell '+row.type+' money-display'+(state.hideBalances?' privacy-hidden':'')+'">'+(row.type==="income"?"+":"−")+money(row.amount)+'</td><td><div class="row-actions"><button type="button" title="Edit" aria-label="Edit transaction" data-edit-transaction="'+escapeHTML(row.id)+'">✎</button><button type="button" title="Delete" aria-label="Delete transaction" data-delete-transaction="'+escapeHTML(row.id)+'">×</button></div></td></tr>').join("");
  }
  function renderPlans() {
    const totalBudget = state.budgets.reduce((sum,row)=>sum+Number(row.limit_amount||0),0);
    const totalSpent = state.budgets.reduce((sum,row)=>sum+Number(row.spent||0),0);
    changeAmount($("#budgetTotal"), totalBudget);
    changeAmount($("#budgetSpent"), totalSpent);
    changeAmount($("#budgetRemaining"), totalBudget-totalSpent);
    const budgetList = $("#budgetsList");
    if (budgetList) {
      if (!state.budgets.length) budgetList.innerHTML='<div class="panel empty-state">Belum ada budget. Buat batas pengeluaran pertamamu.</div>';
      else budgetList.innerHTML = state.budgets.map(row => {
        const limit=Number(row.limit_amount||0), spent=Number(row.spent||0), pct=limit?Math.min(100,spent/limit*100):0;
        return '<article class="panel budget-card"><div class="budget-card-top"><div><h3>'+escapeHTML(row.category)+'</h3><small>Monthly category limit</small></div><span class="metric-icon '+(pct>90?'red':'green')+'">▤</span></div><div class="budget-number money-display'+(state.hideBalances?' privacy-hidden':'')+'">'+money(limit)+'</div><div class="budget-card-meta"><span>Spent '+money(spent)+'</span><span>'+Math.round(pct)+'%</span></div><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%;'+(pct>90?'background:linear-gradient(90deg,#d96d6d,#f2a0a0)':'')+'"></div></div><div class="budget-card-actions"><button data-delete-plan="budget" data-id="'+escapeHTML(row.id)+'">Remove budget ×</button></div></article>';
      }).join("");
    }
    const preview = $("#budgetPreview");
    if (preview) {
      preview.innerHTML = state.budgets.length ? state.budgets.slice(0,3).map(row=>{
        const limit=Number(row.limit_amount||0), spent=Number(row.spent||0), pct=limit?Math.min(100,spent/limit*100):0;
        return '<div class="budget-preview-item"><div class="budget-preview-top"><span>'+escapeHTML(row.category)+'</span><b>'+Math.round(pct)+'%</b></div><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div></div>';
      }).join("") : '<div class="empty-mini">Create a budget to stay on track.</div>';
    }
    const goalContributed=state.goals.reduce((sum,g)=>sum+Number(g.contributed_amount??g.saved_amount??0),0);
    const goalWithdrawn=state.goals.reduce((sum,g)=>sum+Number(g.withdrawn_amount||0),0);
    const goalBalance=state.goals.reduce((sum,g)=>sum+Number(g.saved_amount||0),0);
    changeAmount($("#goalTotalContributed"),goalContributed);
    changeAmount($("#goalTotalWithdrawn"),goalWithdrawn);
    changeAmount($("#goalTotalBalance"),goalBalance);
    ["goalTotalContributed","goalTotalWithdrawn","goalTotalBalance"].forEach(id=>$("#"+id)?.classList.toggle("privacy-hidden",state.hideBalances));
    const goalsList = $("#goalsList");
    if (goalsList) {
      if (!state.goals.length) goalsList.innerHTML='<div class="panel empty-state">Belum ada target tabungan. Mulai dari satu tujuan kecil.</div>';
      else goalsList.innerHTML = state.goals.map(row=>{
        const target=Number(row.target_amount||0), saved=Number(row.saved_amount||0), contributed=Number(row.contributed_amount??saved), withdrawn=Number(row.withdrawn_amount||0), pct=target?Math.min(100,saved/target*100):0;
        return '<article class="goal-card"><div class="goal-card-head"><div><h3>'+escapeHTML(row.title)+'</h3><small>'+(row.deadline?'Target '+shortDate(row.deadline):'No deadline')+'</small></div><span class="metric-icon green">◎</span></div><div class="goal-amounts"><strong class="money-display'+(state.hideBalances?' privacy-hidden':'')+'">'+money(saved)+'</strong><span>saldo / '+money(target)+'</span></div><div class="goal-stats"><span>Terkumpul <b class="money-display'+(state.hideBalances?' privacy-hidden':'')+'">'+money(contributed)+'</b></span><span>Keluar <b class="money-display'+(state.hideBalances?' privacy-hidden':'')+'">'+money(withdrawn)+'</b></span></div><div class="goal-progress"><div class="goal-progress-top"><span>Progress saldo</span><b>'+Math.round(pct)+'%</b></div><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div></div><div class="goal-actions"><button data-add-progress="'+escapeHTML(row.id)+'">＋ Tambah</button><button data-withdraw-progress="'+escapeHTML(row.id)+'">− Tarik</button><button data-delete-plan="goal" data-id="'+escapeHTML(row.id)+'">Hapus ×</button></div></article>';
      }).join("");
    }
    const goalPreview = $("#goalPreview");
    if (goalPreview) {
      goalPreview.innerHTML = state.goals.length ? state.goals.slice(0,2).map(row=>{
        const pct=row.target_amount?Math.min(100,Number(row.saved_amount||0)/Number(row.target_amount)*100):0;
        return '<div class="goal-preview-item"><div class="goal-ring">'+Math.round(pct)+'%</div><div class="goal-preview-copy"><b>'+escapeHTML(row.title)+'</b><small>'+money(row.saved_amount)+' saved</small></div></div>';
      }).join("") : '<div class="empty-mini">Set your first savings goal.</div>';
    }
  }
  function renderReport() {
    const data=state.analytics||{};
    renderChart($("#reportChart"),data.monthly||[],12);
    renderCategories($("#reportCategories"),data.categories||[]);
    const current=data.currentMonth||{};
    const income=Number(current.income||0), expense=Number(current.expense||0);
    if (income===0 && expense===0) {
      $("#reportInsightTitle").textContent="Your financial story starts here.";
      $("#reportInsight").textContent="Belum ada transaksi bulan ini. Catat aktivitas pertamamu untuk mulai melihat pola uang.";
    } else if (expense>income) {
      $("#reportInsightTitle").textContent="Pengeluaran bulan ini lebih tinggi.";
      $("#reportInsight").textContent="Pengeluaran tercatat "+money(expense)+" dan pemasukan "+money(income)+". Periksa kembali kategori yang paling banyak menyerap anggaran.";
    } else {
      $("#reportInsightTitle").textContent="Arus kas bulan ini masih positif.";
      $("#reportInsight").textContent="Ada selisih "+money(income-expense)+" antara pemasukan dan pengeluaran yang tercatat bulan ini. Pertahankan pencatatan secara konsisten.";
    }
  }
  async function refreshAll() {
    try {
      const transactionResult=await api("/api/transactions");
      const results=await Promise.all([api("/api/analytics"),api("/api/plans")]);
      state.transactions=transactionResult.transactions||[];
      state.analytics=results[0];
      state.budgets=results[1].budgets||[];
      state.goals=results[1].goals||[];
      renderDashboard();
      renderTransactions();
      renderPlans();
      if(state.view==="reports") renderReport();
      document.dispatchEvent(new Event("greyfinance:ready"));
    } catch (error) { notify(error.message,"error"); }
  }
  window.greyFinanceRefresh = refreshAll;
  function openTransaction(row=null) {
    $("#transactionForm").reset();
    $("#transactionId").value=row ? row.id : "";
    $("#transactionModalTitle").textContent=row ? "Edit transaction" : "Add transaction";
    $("#saveTransactionBtn").textContent=row ? "Save changes" : "Save transaction";
    const type=row?.type || "expense";
    const radio=$('input[name="transactionType"][value="'+type+'"]');
    if (radio) radio.checked=true;
    $("#transactionAmount").value=row ? row.amount : "";
    $("#transactionCategory").value=row ? row.category : "";
    $("#transactionDate").value=row ? row.date : new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
    $("#transactionNote").value=row ? row.note || "" : "";
    $("#transactionModal").classList.remove("hidden");
    $("#transactionAmount").focus();
  }
  function openPlan(type) {
    $("#planForm").reset();
    $("#planType").value=type;
    const budget=type==="budget";
    $("#planModalTitle").textContent=budget?"New budget":"New saving goal";
    $("#planEyebrow").textContent=budget?"SPEND WITH INTENTION":"SMALL STEPS, BIG PLANS";
    $("#planNameLabel").firstChild.textContent=budget?"Category":"Goal name";
    $("#planAmountLabel").firstChild.textContent=budget?"Monthly limit":"Target amount";
    $("#planName").placeholder=budget?"e.g. Food & Drinks":"e.g. Emergency fund";
    $("#planDateLabel").classList.toggle("hidden",budget);
    $("#planDate").required=!budget;
    $("#planModal").classList.remove("hidden");
    $("#planName").focus();
  }
  function closeModals() { $$(".modal-backdrop").forEach(modal=>modal.classList.add("hidden")); }
  async function handleAuthSubmit(form, action) {
    hideAuthNotice();
    const body={action};
    if(action==="login") {
      body.email=$("#loginEmail").value.trim();
      body.password=$("#loginPassword").value;
    } else {
      body.name=$("#registerName").value.trim();
      body.email=$("#registerEmail").value.trim();
      body.password=$("#registerPassword").value;
    }
    const button=$("button[type=submit]",form);
    const previous=button.textContent;
    button.disabled=true; button.textContent="Please wait…";
    try {
      const result=await api("/api/auth",{method:"POST",body});
      if(result.user) { showApp(result.user); notify(action==="register"?"Akun berhasil dibuat. Selamat datang!":"Berhasil masuk."); }
    } catch(error) { if(error.message.toLowerCase().includes("database")) showDatabaseNotice(); else showAuthNotice(error.message); }
    finally { button.disabled=false; button.textContent=previous; }
  }
  $("#loginForm").addEventListener("submit",event=>{event.preventDefault();handleAuthSubmit(event.currentTarget,"login");});
  $("#registerForm").addEventListener("submit",event=>{event.preventDefault();handleAuthSubmit(event.currentTarget,"register");});
  $$("[data-auth-mode]").forEach(button=>button.addEventListener("click",()=>setAuthMode(button.dataset.authMode)));
  $$("[data-view]").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.view)));
  $$("[data-go-view]").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.goView)));
  $("#addTransactionBtn").addEventListener("click",()=>openTransaction());
  $("#addTransactionBtn2").addEventListener("click",()=>openTransaction());
  $("#addBudgetBtn").addEventListener("click",()=>openPlan("budget"));
  $("#addGoalBtn").addEventListener("click",()=>openPlan("goal"));
  $$("[data-close-modal]").forEach(button=>button.addEventListener("click",closeModals));
  $$(".modal-backdrop").forEach(backdrop=>backdrop.addEventListener("click",event=>{if(event.target===backdrop)closeModals();}));
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeModals();});
  $("#transactionForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const id=$("#transactionId").value;
    const type=$('input[name="transactionType"]:checked').value;
    const body={type,amount:Number($("#transactionAmount").value),category:$("#transactionCategory").value,date:$("#transactionDate").value,note:$("#transactionNote").value.trim()};
    try {
      await api("/api/transactions",{method:id?"PATCH":"POST",body:id?{...body,id}:body});
      closeModals(); await refreshAll(); notify(id?"Transaction updated.":"Transaction saved.");
    } catch(error) { notify(error.message,"error"); }
  });
  $("#transactionsTable").addEventListener("click",async event=>{
    const edit=event.target.closest("[data-edit-transaction]");
    const remove=event.target.closest("[data-delete-transaction]");
    if(edit) {
      const row=state.transactions.find(item=>item.id===edit.dataset.editTransaction);
      if(row) openTransaction(row);
    }
    if(remove) {
      if(!confirm("Hapus transaksi ini? Tindakan ini tidak bisa dibatalkan.")) return;
      try { await api("/api/transactions?id="+encodeURIComponent(remove.dataset.deleteTransaction),{method:"DELETE"}); await refreshAll(); notify("Transaction deleted."); }
      catch(error) { notify(error.message,"error"); }
    }
  });
  $("#planForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const type=$("#planType").value;
    const body=type==="budget"
      ? {type,category:$("#planName").value.trim(),limit_amount:Number($("#planAmount").value)}
      : {type,title:$("#planName").value.trim(),target_amount:Number($("#planAmount").value),deadline:$("#planDate").value};
    try { await api("/api/plans",{method:"POST",body}); closeModals(); await refreshAll(); notify(type==="budget"?"Budget saved.":"Saving goal created."); }
    catch(error) { notify(error.message,"error"); }
  });
  document.addEventListener("click",async event=>{
    const remove=event.target.closest("[data-delete-plan]");
    const add=event.target.closest("[data-add-progress]");
    if(remove) {
      if(!confirm("Hapus rencana ini?")) return;
      try { await api("/api/plans?id="+encodeURIComponent(remove.dataset.id)+"&type="+encodeURIComponent(remove.dataset.deletePlan),{method:"DELETE"}); await refreshAll(); notify("Plan removed."); }
      catch(error) { notify(error.message,"error"); }
    }
    if(add) {
      const goal=state.goals.find(item=>item.id===add.dataset.addProgress);
      if(!goal) return;
      const input=prompt("Nominal yang ingin ditambahkan ke tabungan:");
      if(input===null) return;
      const amount=Number(input);
      if(!Number.isFinite(amount)||amount<=0) { notify("Masukkan nominal yang valid.","error"); return; }
      try { await api("/api/plans",{method:"PATCH",body:{type:"goal",id:goal.id,add_amount:amount}}); await refreshAll(); notify("Tabungan berhasil ditambahkan."); }
      catch(error) { notify(error.message,"error"); }
    }
    const withdraw=event.target.closest("[data-withdraw-progress]");
    if(withdraw) {
      const goal=state.goals.find(item=>item.id===withdraw.dataset.withdrawProgress);
      if(!goal) return;
      const input=prompt("Nominal yang ingin ditarik dari saldo tabungan ("+money(goal.saved_amount)+"):");
      if(input===null) return;
      const amount=Number(input);
      if(!Number.isFinite(amount)||amount<=0) { notify("Masukkan nominal yang valid.","error"); return; }
      try { await api("/api/plans",{method:"PATCH",body:{type:"goal",id:goal.id,withdraw_amount:amount}}); await refreshAll(); notify("Penarikan tabungan berhasil dicatat."); }
      catch(error) { notify(error.message,"error"); }
    }
  });
  ["transactionSearch","transactionTypeFilter","transactionMonthFilter"].forEach(id=>$("#"+id).addEventListener(id==="transactionSearch"?"input":"change",renderTransactions));

  const typePicker=$("#transactionTypePicker");
  if(typePicker){
    const native=$("#transactionTypeFilter"),trigger=typePicker.querySelector(".select-trigger"),options=typePicker.querySelector(".select-options");
    const sync=()=>{trigger.querySelector("span").textContent=native.selectedOptions[0]?.textContent||"All types";options.querySelectorAll("[role=option]").forEach(btn=>btn.setAttribute("aria-selected",String(btn.dataset.value===native.value)));};
    trigger.addEventListener("click",()=>{const open=typePicker.classList.toggle("open");trigger.setAttribute("aria-expanded",String(open));});
    options.addEventListener("click",event=>{const option=event.target.closest("[data-value]");if(!option)return;native.value=option.dataset.value;native.dispatchEvent(new Event("change",{bubbles:true}));sync();typePicker.classList.remove("open");trigger.setAttribute("aria-expanded","false");});
    native.addEventListener("change",sync);
    document.addEventListener("click",event=>{if(!typePicker.contains(event.target)){typePicker.classList.remove("open");trigger.setAttribute("aria-expanded","false");}});
    sync();
  }

  $("#clearFilters").addEventListener("click",()=>{$("#transactionSearch").value="";$("#transactionTypeFilter").value="all";$("#transactionMonthFilter").value="";renderTransactions();});
  $("#chartRange").addEventListener("change",event=>{state.chartRange=Number(event.target.value)||6;renderChart($("#cashflowChart"),state.analytics?.monthly||[],state.chartRange);});
  $("#privacyToggle").addEventListener("click",()=>setBalancesHidden(!state.hideBalances));
  $("#themeToggle").addEventListener("click",()=>setTheme(state.theme==="dark"?"light":"dark"));
  $("#themeSelect").addEventListener("change",event=>setTheme(event.target.value));
  $("#currencySelect").addEventListener("change",event=>setCurrency(event.target.value));
  $("#menuToggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  async function logout() {
    try { await api("/api/auth",{method:"POST",body:{action:"logout"}}); }
    catch(error) { /* Clear the local view even if the network is unavailable. */ }
    state.user=null;state.transactions=[];state.analytics=null;state.budgets=[];state.goals=[];
    showAuth();notify("Kamu sudah keluar.");
  }
  $("#logoutBtn").addEventListener("click",logout);
  $("#settingsLogout").addEventListener("click",logout);
  $("#exportCsvBtn").addEventListener("click",()=>{
    const rows=filteredTransactions();
    if(!rows.length){notify("Tidak ada transaksi untuk diekspor.","error");return;}
    const quote=value=>'"'+String(value??"").replace(/"/g,'""')+'"';
    const csv=[["Date","Type","Category","Amount","Note"],...rows.map(row=>[row.date,row.type,row.category,row.amount,row.note])].map(row=>row.map(quote).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="grey-finance-transactions.csv";a.click();URL.revokeObjectURL(url);
  });
  $("#printReportBtn").addEventListener("click",()=>window.print());

  setTheme(state.theme);
  setCurrency(state.currency);
  setAuthMode("login");
  api("/api/auth").then(result=>{if(result.user)showApp(result.user);}).catch(error=>{if(error.message.toLowerCase().includes("database"))showDatabaseNotice();});
})();