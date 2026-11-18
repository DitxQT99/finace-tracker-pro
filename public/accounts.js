(() => {
  "use strict";
  const $ = (selector, root=document) => root.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const BANKS = [{"slug":"aladin","name":"Aladin"},{"slug":"allo","name":"Allo"},{"slug":"amar-bank","name":"Amar Bank"},{"slug":"anz","name":"ANZ"},{"slug":"bangkok-bank","name":"Bangkok Bank"},{"slug":"bank-artha-graha-internasional","name":"Bank Artha Graha Internasional"},{"slug":"bank-bengkulu","name":"Bank Bengkulu"},{"slug":"bank-bjb","name":"Bank BJB"},{"slug":"bank-bjb-syariah","name":"Bank BJB Syariah"},{"slug":"bank-bpd-aceh","name":"Bank BPD Aceh"},{"slug":"bank-bpd-bali","name":"Bank BPD Bali"},{"slug":"bank-bpd-banten","name":"Bank BPD Banten"},{"slug":"bank-bpd-diy","name":"Bank BPD DIY"},{"slug":"bank-bpd-jambi","name":"Bank BPD Jambi"},{"slug":"bank-bpd-jateng","name":"Bank BPD Jateng"},{"slug":"bank-bpd-jatim","name":"Bank BPD Jatim"},{"slug":"bank-bpd-kalbar","name":"Bank BPD Kalbar"},{"slug":"bank-bpd-kalimantan-timur","name":"Bank BPD Kalimantan Timur"},{"slug":"bank-bpd-kalsel","name":"Bank BPD Kalsel"},{"slug":"bank-bpd-lampung","name":"Bank BPD Lampung"},{"slug":"bank-bpd-maluku-malut","name":"Bank BPD Maluku Malut"},{"slug":"bank-bpd-ntb-syariah","name":"Bank BPD NTB Syariah"},{"slug":"bank-bpd-ntt","name":"Bank BPD NTT"},{"slug":"bank-bpd-papua","name":"Bank BPD Papua"},{"slug":"bank-bpd-riau-kepri","name":"Bank BPD Riau Kepri"},{"slug":"bank-bpd-riau-kepri-syariah","name":"Bank BPD Riau Kepri Syariah"},{"slug":"bank-bpd-sulselbar","name":"Bank BPD Sulselbar"},{"slug":"bank-bpd-sulteng","name":"Bank BPD Sulteng"},{"slug":"bank-bpd-sultra","name":"Bank BPD Sultra"},{"slug":"bank-bpd-sulutgo","name":"Bank BPD Sulutgo"},{"slug":"bank-bpd-sumsel-babel","name":"Bank BPD Sumsel Babel"},{"slug":"bank-bpd-sumut","name":"Bank BPD Sumut"},{"slug":"bank-bumi-artha","name":"Bank Bumi Artha"},{"slug":"bank-capital","name":"Bank Capital"},{"slug":"bank-ganesha","name":"Bank Ganesha"},{"slug":"bank-ina","name":"Bank INA"},{"slug":"bank-index-selindo","name":"Bank Index Selindo"},{"slug":"bank-jakarta","name":"Bank Jakarta"},{"slug":"bank-jasa-jakarta","name":"Bank Jasa Jakarta"},{"slug":"bank-lampung","name":"Bank Lampung"},{"slug":"bank-mas","name":"Bank Mas"},{"slug":"bank-maspion","name":"Bank Maspion"},{"slug":"bank-mayapada","name":"Bank Mayapada"},{"slug":"bank-mayora","name":"Bank Mayora"},{"slug":"bank-mestika-dharma","name":"Bank Mestika Dharma"},{"slug":"bank-nagari","name":"Bank Nagari"},{"slug":"bank-of-america","name":"Bank of America"},{"slug":"bank-of-china","name":"Bank of China"},{"slug":"bank-of-india","name":"Bank of India"},{"slug":"bank-of-india-indonesia","name":"Bank of India Indonesia"},{"slug":"bank-raya","name":"Bank Raya"},{"slug":"bank-resona-perdania","name":"Bank Resona Perdania"},{"slug":"bank-sahabat-sampoerna","name":"Bank Sahabat Sampoerna"},{"slug":"bank-saqu","name":"Bank Saqu"},{"slug":"bank-smbc-indonesia","name":"Bank SMBC Indonesia"},{"slug":"bank-victoria","name":"Bank Victoria"},{"slug":"bank-victoria-syariah","name":"Bank Victoria Syariah"},{"slug":"bank-woori-saudara","name":"Bank Woori Saudara"},{"slug":"bca","name":"BCA"},{"slug":"bca-digital","name":"BCA Digital"},{"slug":"bca-syariah","name":"BCA Syariah"},{"slug":"blu-bca","name":"blu by BCA Digital"},{"slug":"bnc","name":"BNC"},{"slug":"bni","name":"BNI"},{"slug":"bnp-paribas","name":"BNP Paribas"},{"slug":"bri","name":"BRI"},{"slug":"bri-vertical","name":"BRI (Vertical)"},{"slug":"bsi","name":"BSI"},{"slug":"bsn","name":"BSN"},{"slug":"btn","name":"BTN"},{"slug":"btn-syariah","name":"BTN Syariah"},{"slug":"btpn","name":"BTPN"},{"slug":"btpn-syariah","name":"BTPN Syariah"},{"slug":"ccb-indonesia","name":"CCB Indonesia"},{"slug":"cimb-niaga","name":"CIMB Niaga"},{"slug":"cimb-niaga-syariah","name":"CIMB Niaga Syariah"},{"slug":"citibank","name":"Citibank"},{"slug":"credit-suisse","name":"Credit Suisse"},{"slug":"ctbc-bank","name":"CTBC Bank"},{"slug":"danamon","name":"Danamon"},{"slug":"danamon-mufg","name":"Danamon (MUFG)"},{"slug":"danamon-syariah","name":"Danamon Syariah"},{"slug":"dbs","name":"DBS"},{"slug":"deutsche-bank","name":"Deutsche Bank"},{"slug":"hibank","name":"hibank"},{"slug":"hsbc","name":"HSBC"},{"slug":"ibk-bank","name":"IBK Bank"},{"slug":"icbc","name":"ICBC"},{"slug":"ing-bank","name":"ING Bank"},{"slug":"j-trust-bank","name":"J Trust Bank"},{"slug":"jago","name":"Jago"},{"slug":"jenius","name":"Jenius"},{"slug":"jp-morgan-chase","name":"JP Morgan Chase"},{"slug":"kb-bukopin","name":"KB Bukopin"},{"slug":"kb-bukopin-syariah","name":"KB Bukopin Syariah"},{"slug":"keb-hana-bank","name":"KEB Hana Bank"},{"slug":"krom","name":"Krom"},{"slug":"line-bank","name":"LINE Bank"},{"slug":"mandiri","name":"Mandiri"},{"slug":"mandiri-taspen","name":"Mandiri Taspen"},{"slug":"maybank","name":"Maybank"},{"slug":"mega","name":"Mega"},{"slug":"mega-syariah","name":"Mega Syariah"},{"slug":"mizuho-bank","name":"Mizuho Bank"},{"slug":"mnc","name":"MNC"},{"slug":"mnc-bank","name":"MNC Bank"},{"slug":"motion-banking","name":"Motion Banking"},{"slug":"muamalat","name":"Bank Muamalat"},{"slug":"mufg","name":"MUFG"},{"slug":"nanobank-syariah","name":"Nanobank Syariah"},{"slug":"nobu","name":"NOBU"},{"slug":"ocbc-nisp","name":"OCBC NISP"},{"slug":"ok-bank","name":"OK Bank"},{"slug":"panin-dubai-syariah","name":"Panin Dubai Syariah"},{"slug":"paninbank","name":"PaninBank"},{"slug":"permata","name":"Permata Bank"},{"slug":"prima-bank","name":"PRIMA Bank"},{"slug":"qnb","name":"QNB"},{"slug":"sbi-indonesia","name":"SBI Indonesia"},{"slug":"seabank","name":"SeaBank"},{"slug":"shinhan-bank","name":"Shinhan Bank"},{"slug":"sinarmas","name":"Sinarmas"},{"slug":"sinarmas-syariah","name":"Sinarmas Syariah"},{"slug":"standard-chartered","name":"Standard Chartered"},{"slug":"superbank","name":"Superbank"},{"slug":"uob","name":"UOB"},{"slug":"welab-bank","name":"Welab Bank"}];
  const WALLETS = [{"slug":"astra-pay","name":"Astra Pay"},{"slug":"bluepay","name":"Bluepay"},{"slug":"dana","name":"DANA"},{"slug":"dipay","name":"Dipay"},{"slug":"doku","name":"DOKU"},{"slug":"dutamoney","name":"Dutamoney"},{"slug":"gopay","name":"GoPay"},{"slug":"i-saku","name":"i.saku"},{"slug":"jakone-pay","name":"JakOne Pay"},{"slug":"kaspro","name":"Kaspro"},{"slug":"linkaja","name":"LinkAja"},{"slug":"motion-pay","name":"Motion Pay"},{"slug":"netzme","name":"Netzme"},{"slug":"otto-pay","name":"OTTO Pay"},{"slug":"ovo","name":"OVO"},{"slug":"paydia","name":"Paydia"},{"slug":"paytren","name":"Paytren"},{"slug":"pospay","name":"Pospay"},{"slug":"shopee-pay","name":"Shopee Pay"},{"slug":"speedcash","name":"SpeedCash"},{"slug":"truemoney","name":"TrueMoney"},{"slug":"uangku","name":"Uangku"},{"slug":"yukk","name":"Yukk"}];
  const LOGO_BASE = "https://cdn.jsdelivr.net/npm/idn-finlogos@2.5.2/dist/icons/";
  const currency = () => $("#currencySelect")?.value || "IDR";
  const money = value => new Intl.NumberFormat("id-ID",{style:"currency",currency:currency(),maximumFractionDigits:0}).format(Number(value||0));
  const state = () => window.greyFinanceState || {};
  const accounts = () => state().accounts || [];
  const transactions = () => state().transactions || [];
  const isHidden = () => $("#privacyToggle")?.title === "Tampilkan saldo";
  const logoUrl = provider => provider && provider !== "cash" ? LOGO_BASE + encodeURIComponent(provider) + ".svg" : "";
  function logo(provider, type, size=28) {
    if(type === "cash" || provider === "cash") return '<span class="account-logo cash-logo" style="--logo-size:'+size+'px" aria-label="Cash">▤</span>';
    return '<span class="account-logo" style="--logo-size:'+size+'px"><img src="'+logoUrl(provider)+'" alt="" loading="lazy" onerror="this.parentElement.classList.add(\'logo-fallback\');this.remove()"></span>';
  }
  function notify(message, error=false) {
    const region=$("#toastRegion"); if(!region)return;
    const toast=document.createElement("div"); toast.className="toast"+(error?" error":""); toast.textContent=message; region.append(toast);
    setTimeout(()=>toast.remove(),3600);
  }
  async function api(path, options={}) {
    const response=await fetch(path,{method:options.method||"GET",credentials:"same-origin",headers:options.body?{"Content-Type":"application/json"}:{},body:options.body?JSON.stringify(options.body):undefined});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Permintaan tidak berhasil.");
    return data;
  }
  function dateToday() {
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    return parts.find(x=>x.type==="year").value+"-"+parts.find(x=>x.type==="month").value+"-"+parts.find(x=>x.type==="day").value;
  }
  function dateLabel(value) {
    if(!value)return "—";
    return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value+"T12:00:00"));
  }
  function activeAccounts() { return accounts().filter(account=>!account.archivedAt); }
  function accountById(id) { return accounts().find(account=>account.id===id); }
  function accountTitle(account) {
    if(!account)return "Akun tidak ditemukan";
    const number=account.accountNumber ? " · ••••"+account.accountNumber.slice(-4) : "";
    return (account.name || account.providerName || "Account")+number;
  }
  function renderBalance(element,value) {
    if(!element)return;
    element.textContent=money(value);
    element.classList.add("money-display");
    element.classList.toggle("privacy-hidden",isHidden());
  }
  function accountCard(account) {
    const providerLogo=logo(account.provider,account.type,27);
    const number=account.accountNumber ? "•••• "+account.accountNumber.slice(-4) : "No account number";
    const typeLabel=account.type==="ewallet"?"E-WALLET":account.type==="bank"?"BANK":"CASH";
    const balance=money(account.balance);
    return '<article class="account-card" data-account-card="'+esc(account.id)+'">'+
      '<div class="account-card-top"><div class="account-brand-line">'+providerLogo+'<div class="account-brand-copy"><b>'+esc(account.providerName||account.name)+'</b><small>'+typeLabel+'</small></div></div><button class="account-more" type="button" aria-label="Account actions" data-account-menu="'+esc(account.id)+'">···</button></div>'+
      '<div class="account-card-name">'+esc(account.name)+'</div>'+
      '<div class="account-card-foot"><div class="account-number">'+esc(number)+'</div><div class="account-balance-line"><strong class="money-display'+(isHidden()?' privacy-hidden':'')+'">'+esc(balance)+'</strong>'+providerLogo+'</div></div>'+
      '<div class="account-card-actions"><button type="button" data-account-action="history" data-id="'+esc(account.id)+'">History</button><button type="button" data-account-action="edit" data-id="'+esc(account.id)+'">Edit</button><button type="button" data-account-action="delete" data-id="'+esc(account.id)+'">Delete</button></div>'+
      '</article>';
  }
  function renderGroup(targetId, rows, emptyText) {
    const el=$("#"+targetId); if(!el)return;
    el.innerHTML=rows.length?rows.map(accountCard).join(""):'<div class="account-empty">'+esc(emptyText)+'</div>';
  }
  function renderAccounts() {
    const rows=activeAccounts();
    const cash=rows.filter(x=>x.type==="cash"),wallet=rows.filter(x=>x.type==="ewallet"),bank=rows.filter(x=>x.type==="bank");
    renderGroup("cashAccounts",cash,"Belum ada cash account. Tambahkan tempat menyimpan uang tunai.");
    renderGroup("walletAccounts",wallet,"Belum ada e-wallet. Tambahkan DANA, GoPay, OVO, dan lainnya.");
    renderGroup("bankAccounts",bank,"Belum ada rekening bank. Tambahkan rekening pertamamu.");
    renderBalance($("#accountsTotalBalance"),rows.reduce((sum,row)=>sum+Number(row.balance||0),0));
    const count=$("#accountsCountLabel"); if(count)count.textContent=rows.length+" active source"+(rows.length===1?"":"s")+" · "+cash.length+" cash · "+wallet.length+" e-wallet · "+bank.length+" bank";
    if($("#view-accounts")?.classList.contains("active")) {
      $("#view-accounts").querySelectorAll(".money-display").forEach(el=>el.classList.toggle("privacy-hidden",isHidden()));
    }
  }
  function ensureModals() {
    if($("#accountModal"))return;
    const wrap=document.createElement("div");wrap.innerHTML=
      '<div id="accountModal" class="modal-backdrop hidden account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="accountModalTitle"><div class="modal-card account-modal-card"><div class="modal-head"><div><span class="eyebrow">YOUR MONEY, YOUR SPACE</span><h2 id="accountModalTitle">Add account</h2></div><button class="icon-button" type="button" data-close-account-modal aria-label="Close">×</button></div><form id="accountForm" class="modal-form"><input id="accountEditId" type="hidden"><div class="account-kind-tabs"><button type="button" data-kind="cash">▤ Cash</button><button type="button" data-kind="ewallet">◉ E-Wallet</button><button type="button" data-kind="bank">▣ Bank</button></div><div id="providerStep" class="provider-step"><div class="provider-search-wrap"><input id="providerSearch" type="search" placeholder="Search bank or e-wallet..."><span>⌕</span></div><div id="providerGrid" class="provider-grid"></div></div><div id="selectedProvider" class="selected-provider hidden"></div><input id="accountType" type="hidden" value="cash"><input id="accountProvider" type="hidden" value="cash"><input id="accountProviderName" type="hidden" value="Cash"><label>Account name<input id="accountName" type="text" maxlength="60" placeholder="e.g. DANA utama / BCA payroll" required></label><label>Account number / phone <span class="optional">(optional)</span><input id="accountNumber" type="text" inputmode="numeric" maxlength="40" placeholder="Nomor rekening atau nomor HP"></label><label>Opening balance<div class="amount-input"><span>Rp</span><input id="accountOpeningBalance" type="number" min="0" step="1" value="0" required></div></label><p class="account-form-hint">Nomor rekening atau nomor e-wallet hanya disimpan di akun pribadimu. Tidak perlu diisi kalau tidak ingin.</p><div class="modal-actions"><button class="btn btn-ghost" type="button" data-close-account-modal>Cancel</button><button class="btn btn-primary" type="submit" id="saveAccountBtn">Save account</button></div></form></div></div>'+
      '<div id="accountPickerModal" class="modal-backdrop hidden account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="accountPickerTitle"><div class="modal-card account-modal-card"><div class="modal-head"><div><span class="eyebrow">SELECT SOURCE</span><h2 id="accountPickerTitle">Choose account</h2><p id="accountPickerSub">Pilih sumber dana.</p></div><button class="icon-button" type="button" data-close-picker aria-label="Close">×</button></div><div class="provider-search-wrap"><input id="accountPickerSearch" type="search" placeholder="Search your accounts..."><span>⌕</span></div><div id="accountPickerList" class="account-picker-list"></div></div></div>'+
      '<div id="transferModal" class="modal-backdrop hidden account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="transferModalTitle"><div class="modal-card account-modal-card"><div class="modal-head"><div><span class="eyebrow">MOVE MONEY, NOT INCOME</span><h2 id="transferModalTitle">Transfer between accounts</h2><p>Perpindahan saldo tidak mengubah laporan pemasukan/pengeluaran.</p></div><button class="icon-button" type="button" data-close-transfer aria-label="Close">×</button></div><form id="transferForm" class="modal-form transfer-form"><div class="transfer-account-fields"><div><label>From</label><input id="transferFromId" type="hidden"><button class="account-choice-btn" type="button" id="transferFromChoice"><span id="transferFromChoiceContent">Choose source</span><span class="choice-chevron">⌄</span></button></div><div class="transfer-arrow">↓</div><div><label>To</label><input id="transferToId" type="hidden"><button class="account-choice-btn" type="button" id="transferToChoice"><span id="transferToChoiceContent">Choose destination</span><span class="choice-chevron">⌄</span></button></div></div><label>Amount<div class="amount-input"><span>Rp</span><input id="transferAmount" type="number" min="1" step="1" placeholder="0" required></div></label><div class="form-two"><label>Date<input id="transferDate" type="date" required></label><label>Note <span class="optional">(optional)</span><input id="transferNote" type="text" maxlength="160" placeholder="e.g. Top up DANA"></label></div><div class="modal-actions"><button class="btn btn-ghost" type="button" data-close-transfer>Cancel</button><button class="btn btn-primary" type="submit" id="saveTransferBtn">Transfer now</button></div></form></div></div>'+
      '<div id="accountHistoryModal" class="modal-backdrop hidden account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="accountHistoryTitle"><div class="modal-card account-modal-card account-history-modal"><div class="modal-head"><div><span class="eyebrow">ACCOUNT LEDGER</span><h2 id="accountHistoryTitle">Account history</h2><p id="accountHistoryMeta"></p></div><button class="icon-button" type="button" data-close-history aria-label="Close">×</button></div><div id="accountHistoryList" class="account-history-list"></div></div></div>';
    while(wrap.firstChild)document.body.append(wrap.firstChild);
  }
  const accountModal=()=>$("#accountModal"),pickerModal=()=>$("#accountPickerModal"),transferModal=()=>$("#transferModal"),historyModal=()=>$("#accountHistoryModal");
  let editingAccount=null,providerKind="cash",pickerTarget=null,providerChosen=null;
  function providersFor(kind) { return kind==="bank"?BANKS:kind==="ewallet"?WALLETS:[]; }
  function drawProviders() {
    const list=providersFor(providerKind),query=($("#providerSearch")?.value||"").trim().toLowerCase();
    const filtered=list.filter(item=>item.name.toLowerCase().includes(query));
    $("#providerGrid").innerHTML=filtered.map(item=>'<button type="button" class="provider-option" data-provider="'+esc(item.slug)+'" data-provider-name="'+esc(item.name)+'">'+logo(item.slug,providerKind,34)+'<span>'+esc(item.name)+'</span></button>').join("") || '<div class="account-empty">Tidak ada penyedia yang cocok.</div>';
    $("#providerGrid").classList.toggle("hidden",providerKind==="cash");
  }
  function setKind(kind) {
    providerKind=kind;providerChosen=kind==="cash"?{slug:"cash",name:"Cash"}:null;
    $("#accountType").value=kind;$("#accountProvider").value=providerChosen?.slug||"";$("#accountProviderName").value=providerChosen?.name||"";
    document.querySelectorAll("#accountModal [data-kind]").forEach(button=>button.classList.toggle("active",button.dataset.kind===kind));
    $("#providerStep").classList.toggle("hidden",kind==="cash");
    $("#selectedProvider").classList.toggle("hidden",kind!=="cash");
    if(kind==="cash")$("#selectedProvider").innerHTML=logo("cash","cash",32)+'<b>Cash</b><small>Physical money</small>';
    else $("#selectedProvider").innerHTML="";
    $("#accountName").value=kind==="cash"?"Cash":"";
    drawProviders();
  }
  function chooseProvider(slug,name) {
    providerChosen={slug,name};$("#accountProvider").value=slug;$("#accountProviderName").value=name;
    $("#selectedProvider").innerHTML=logo(slug,providerKind,34)+'<div><b>'+esc(name)+'</b><small>'+ (providerKind==="bank"?"Bank account":"Digital wallet")+'</small></div><button type="button" id="changeProviderBtn">Change</button>';
    $("#selectedProvider").classList.remove("hidden");$("#providerStep").classList.add("hidden");
    if(!$("#accountName").value.trim() || $("#accountName").value==="Cash")$("#accountName").value=name;
  }
  function openAccountModal(account=null,kind="cash") {
    ensureModals();editingAccount=account;
    $("#accountForm").reset();$("#accountEditId").value=account?.id||"";
    $("#accountModalTitle").textContent=account?"Edit account":"Add account";
    $("#saveAccountBtn").textContent=account?"Save changes":"Save account";
    $("#accountOpeningBalance").value=account?Number(account.openingBalance||0):0;
    $("#accountName").value=account?.name||"";
    $("#accountNumber").value=account?.accountNumber||"";
    if(account){
      providerKind=account.type;providerChosen={slug:account.provider,name:account.providerName};
      $("#accountType").value=account.type;$("#accountProvider").value=account.provider;$("#accountProviderName").value=account.providerName;
      document.querySelectorAll("#accountModal [data-kind]").forEach(button=>{button.disabled=true;button.classList.toggle("active",button.dataset.kind===account.type);});
      $("#providerStep").classList.add("hidden");$("#selectedProvider").classList.remove("hidden");
      $("#selectedProvider").innerHTML=logo(account.provider,account.type,34)+'<div><b>'+esc(account.providerName)+'</b><small>Provider cannot be changed when editing.</small></div>';
    }else{
      document.querySelectorAll("#accountModal [data-kind]").forEach(button=>button.disabled=false);
      setKind(kind);
      if(kind==="cash")$("#accountName").value="Cash";
    }
    accountModal().classList.remove("hidden");
    if(!account && kind!=="cash")$("#providerSearch").value="";
    drawProviders();
  }
  function closeAccountModal(){accountModal()?.classList.add("hidden");}
  function formatChoice(account) {
    return '<span class="account-choice-leading">'+logo(account.provider,account.type,28)+'<span class="account-choice-copy"><b>'+esc(account.name)+'</b><small>'+esc(account.providerName)+(account.accountNumber?" · ••••"+esc(account.accountNumber.slice(-4)):"")+'</small></span></span><span class="account-choice-trailing"><b class="money-display'+(isHidden()?' privacy-hidden':'')+'">'+esc(money(account.balance))+'</b><i>›</i></span>';
  }
  function setChoice(buttonId,contentId,accountId) {
    const account=accountById(accountId);const button=$("#"+buttonId),content=$("#"+contentId);
    if(!account||!button||!content)return;
    button.dataset.selectedAccount=account.id;content.innerHTML=formatChoice(account);
    button.classList.add("has-selection");
  }
  function chooseFromPicker(account) {
    const target=pickerTarget;
    if(target==="transaction"){
      $("#transactionAccountId").value=account.id;
      setChoice("transactionAccountChoice","transactionAccountChoiceContent",account.id);
    }else if(target==="transferFrom"){
      $("#transferFromId").value=account.id;setChoice("transferFromChoice","transferFromChoiceContent",account.id);
    }else if(target==="transferTo"){
      $("#transferToId").value=account.id;setChoice("transferToChoice","transferToChoiceContent",account.id);
    }
    pickerModal().classList.add("hidden");pickerTarget=null;
  }
  function openPicker(target,title,selectedId) {
    ensureModals();pickerTarget=target;
    $("#accountPickerTitle").textContent=title;$("#accountPickerSub").textContent="Pilih salah satu sumber dana aktif.";
    $("#accountPickerSearch").value="";
    const rows=activeAccounts();
    $("#accountPickerList").innerHTML=rows.map(account=>'<button type="button" class="account-picker-item'+(account.id===selectedId?' selected':'')+'" data-pick-account="'+esc(account.id)+'">'+formatChoice(account)+'</button>').join("")||'<div class="account-empty">Belum ada akun sumber dana. Tambahkan akun terlebih dahulu.</div>';
    pickerModal().classList.remove("hidden");
  }
  function setTransactionSource(id) {
    const account=accountById(id)||activeAccounts()[0];
    if(!account)return;
    $("#transactionAccountId").value=account.id;
    setChoice("transactionAccountChoice","transactionAccountChoiceContent",account.id);
  }
  window.greyAccountsSetTransactionSource=setTransactionSource;
  window.greyAccountsRender=renderAccounts;
  function openTransferModal() {
    ensureModals();$("#transferForm").reset();
    const rows=activeAccounts();
    $("#transferFromId").value=rows[0]?.id||"";
    $("#transferToId").value=rows.find(x=>x.id!==rows[0]?.id)?.id||"";
    if(rows[0])setChoice("transferFromChoice","transferFromChoiceContent",rows[0].id);
    if(rows.find(x=>x.id!==rows[0]?.id))setChoice("transferToChoice","transferToChoiceContent",rows.find(x=>x.id!==rows[0]?.id).id);
    $("#transferDate").value=dateToday();
    transferModal().classList.remove("hidden");
  }
  async function refreshApp() { if(typeof window.greyFinanceRefresh==="function")await window.greyFinanceRefresh();renderAccounts(); }
  function openHistory(account) {
    ensureModals();
    $("#accountHistoryTitle").textContent=account.name;
    $("#accountHistoryMeta").innerHTML=logo(account.provider,account.type,20)+' '+esc(account.providerName)+' · Current balance <b>'+esc(money(account.balance))+'</b>';
    const rows=transactions().filter(row=>row.accountId===account.id).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
    $("#accountHistoryList").innerHTML=rows.length?rows.map(row=>{
      const inbound=row.type==="income"||row.type==="transfer_in";
      const transfer=row.type==="transfer_in"||row.type==="transfer_out";
      const title=transfer?(row.type==="transfer_in"?"Transfer from ":"Transfer to ")+(row.counterpartyName||"another account"):(row.category||"Transaction");
      const prefix=inbound?"+":transfer?"⇄":"−";
      const cls=transfer?"transfer":inbound?"income":"expense";
      const provider=logo(row.accountProvider, row.accountProvider==="cash"?"cash":"",20);
      return '<div class="account-history-row"><div class="account-history-icon">'+provider+'</div><div class="account-history-copy"><b>'+esc(title)+'</b><small>'+esc(row.note||"")+' · '+dateLabel(row.date)+'</small></div><strong class="'+cls+' money-display'+(isHidden()?' privacy-hidden':'')+'">'+prefix+money(row.amount)+'</strong></div>';
    }).join(""):'<div class="account-empty">Belum ada riwayat untuk akun ini.</div>';
    historyModal().classList.remove("hidden");
  }
  function renderAllIfReady() {
    ensureModals();renderAccounts();
    const sourceId=$("#transactionAccountId")?.value||activeAccounts()[0]?.id;
    if(sourceId)setTransactionSource(sourceId);
  }

  $("#addAccountBtn")?.addEventListener("click",()=>openAccountModal());
  $("#openTransferBtn")?.addEventListener("click",openTransferModal);
  document.addEventListener("click",async event=>{
    const add=event.target.closest("[data-add-account-type]");
    const kindButton=event.target.closest("#accountModal [data-kind]");
    const providerButton=event.target.closest("[data-provider]");
    const changeProvider=event.target.closest("#changeProviderBtn");
    const action=event.target.closest("[data-account-action]");
    const pick=event.target.closest("[data-pick-account]");
    if(add)openAccountModal(null,add.dataset.addAccountType);
    if(kindButton){setKind(kindButton.dataset.kind);$("#providerSearch").value="";}
    if(providerButton)chooseProvider(providerButton.dataset.provider,providerButton.dataset.providerName);
    if(changeProvider){$("#providerStep").classList.remove("hidden");$("#selectedProvider").classList.add("hidden");drawProviders();}
    if(pick){const account=accountById(pick.dataset.pickAccount);if(account)chooseFromPicker(account);}
    if(action){
      const account=accountById(action.dataset.id);if(!account)return;
      if(action.dataset.accountAction==="history")openHistory(account);
      if(action.dataset.accountAction==="edit")openAccountModal(account);
      if(action.dataset.accountAction==="delete"){
        if(!confirm('Hapus "'+account.name+'"? Saldo harus Rp0. Riwayat tetap disimpan.'))return;
        try{await api("/api/accounts?id="+encodeURIComponent(account.id),{method:"DELETE"});await refreshApp();notify("Account deleted.");}
        catch(error){notify(error.message,true);}
      }
    }
    const menu=event.target.closest("[data-account-menu]");
    if(menu){
      const id=menu.dataset.accountMenu;
      const card=menu.closest(".account-card");
      card?.querySelector(".account-card-actions")?.classList.toggle("visible");
    }
    if(event.target.closest("[data-close-account-modal]"))closeAccountModal();
    if(event.target.closest("[data-close-picker]"))pickerModal().classList.add("hidden");
    if(event.target.closest("[data-close-transfer]"))transferModal().classList.add("hidden");
    if(event.target.closest("[data-close-history]"))historyModal().classList.add("hidden");
    if(event.target.closest("#transactionAccountChoice"))openPicker("transaction","Choose source account",$("#transactionAccountId").value);
    if(event.target.closest("#transferFromChoice"))openPicker("transferFrom","Transfer from",$("#transferFromId").value);
    if(event.target.closest("#transferToChoice"))openPicker("transferTo","Transfer to",$("#transferToId").value);
  });
  $("#providerSearch")?.addEventListener("input",drawProviders);
  $("#accountPickerSearch")?.addEventListener("input",()=>{
    const q=$("#accountPickerSearch").value.trim().toLowerCase();
    $("#accountPickerList").querySelectorAll("[data-pick-account]").forEach(button=>button.classList.toggle("hidden",!button.textContent.toLowerCase().includes(q)));
  });
  document.addEventListener("click",event=>{
    if(event.target.closest("#changeProviderBtn"))return;
    const card=event.target.closest(".account-card");
    if(!card)document.querySelectorAll(".account-card-actions.visible").forEach(el=>el.classList.remove("visible"));
  });
  $("#accountForm")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const id=$("#accountEditId").value;
    const type=$("#accountType").value,provider=$("#accountProvider").value,providerName=$("#accountProviderName").value;
    if(type!=="cash"&&!providerChosen){notify("Pilih bank atau e-wallet terlebih dahulu.",true);return;}
    const body={type,provider,providerName,name:$("#accountName").value.trim(),accountNumber:$("#accountNumber").value.trim(),openingBalance:Number($("#accountOpeningBalance").value)};
    const submit=$("#saveAccountBtn");submit.disabled=true;
    try{
      await api("/api/accounts",{method:id?"PATCH":"POST",body:id?{...body,id}:body});
      closeAccountModal();await refreshApp();notify(id?"Account updated.":"Account added.");
    }catch(error){notify(error.message,true);}
    finally{submit.disabled=false;}
  });
  $("#transferForm")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const fromAccountId=$("#transferFromId").value,toAccountId=$("#transferToId").value;
    if(!fromAccountId||!toAccountId||fromAccountId===toAccountId){notify("Pilih dua akun yang berbeda.",true);return;}
    const submit=$("#saveTransferBtn");submit.disabled=true;
    const body={fromAccountId,toAccountId,amount:Number($("#transferAmount").value),date:$("#transferDate").value,note:$("#transferNote").value.trim(),transferId:(window.crypto?.randomUUID?crypto.randomUUID():"tr-"+Date.now()+"-"+Math.random().toString(36).slice(2,12))};
    try{await api("/api/transfers",{method:"POST",body});transferModal().classList.add("hidden");await refreshApp();notify("Transfer berhasil dicatat.");}
    catch(error){notify(error.message,true);}
    finally{submit.disabled=false;}
  });
  document.addEventListener("greyfinance:ready",renderAllIfReady);
  document.addEventListener("greyfinance:view",event=>{if(event.detail?.view==="accounts")renderAccounts();});
  document.addEventListener("DOMContentLoaded",ensureModals);
  setTimeout(ensureModals,0);
})();