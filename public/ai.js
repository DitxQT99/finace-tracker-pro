(() => {
  "use strict";
  const $ = (selector, root=document) => root.querySelector(selector);
  const money = value => new Intl.NumberFormat("id-ID",{style:"currency",currency:$("#currencySelect")?.value||"IDR",maximumFractionDigits:0}).format(Number(value||0));
  const balancesHidden = () => $("#privacyToggle")?.title === "Tampilkan saldo";
  const state = {messages:[],drafts:new Map(),busy:false};
  async function api(path,options={}) {
    const response=await fetch(path,{method:options.method||"GET",credentials:"same-origin",headers:options.body?{"Content-Type":"application/json"}:{},body:options.body?JSON.stringify(options.body):undefined});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Request failed.");
    return data;
  }
  function notify(message,error=false) {
    const region=$("#toastRegion");if(!region)return;
    const toast=document.createElement("div");toast.className="toast"+(error?" error":"");toast.textContent=message;region.append(toast);setTimeout(()=>toast.remove(),3800);
  }
  const nav=document.createElement("button");nav.className="nav-item";nav.dataset.view="grey-ai";nav.innerHTML='<span class="nav-icon">✧</span>Grey AI';
  const overviewNav=$('.side-nav [data-view="overview"]');if(overviewNav)overviewNav.after(nav);
  const view=document.createElement("section");view.id="view-grey-ai";view.className="view";
  view.innerHTML='<div class="section-intro ai-section-intro"><div><div class="eyebrow">YOUR PERSONAL FINANCE COPILOT</div><h2>Grey AI</h2><p>Ngobrol soal transaksi, pengeluaran, anggaran, dan tabunganmu.</p></div><span class="ai-live-pill"><i></i> READY TO HELP</span></div><div class="ai-chat-panel panel"><div class="ai-chat-top"><div class="ai-avatar">✦</div><div><b>Grey AI Assistant</b><small>Finance-aware · Approval required</small></div><span class="ai-secure">PRIVATE SESSION</span></div><div class="ai-privacy-note">Grey AI membaca ringkasan keuangan dan hingga 100 transaksi terbaru. Pesan serta konteks keuangan dikirim ke model AI untuk diproses. Jangan kirim kata sandi, PIN, atau data kartu.</div><div id="aiChatMessages" class="ai-chat-messages" aria-live="polite"></div><div class="ai-suggestions"><button type="button" data-ai-prompt="Ringkas kondisi keuanganku bulan ini.">Ringkas keuanganku</button><button type="button" data-ai-prompt="Apa kategori pengeluaran terbesarku?">Pengeluaran terbesar</button><button type="button" data-ai-prompt="Bagaimana progres target tabunganku?">Progres tabungan</button></div><form id="aiChatForm" class="ai-chat-composer"><textarea id="aiChatInput" rows="1" maxlength="1200" placeholder="Contoh: Aku makan tempek 50k..." required></textarea><button id="aiSendBtn" type="submit" aria-label="Kirim pesan"><span>↑</span></button></form><div class="ai-composer-foot"><span>Enter untuk kirim · Shift + Enter untuk baris baru</span><span id="aiCharCount">0/1200</span></div></div>';
  const transactionView=$("#view-transactions");if(transactionView)transactionView.before(view);
  function showView(){
    document.querySelectorAll(".view").forEach(item=>item.classList.toggle("active",item===view));
    document.querySelectorAll(".nav-item[data-view]").forEach(item=>item.classList.toggle("active",item===nav));
    $("#pageTitle").textContent="Grey AI";$("#sidebar").classList.remove("open");loadHistory();$("#aiChatInput").focus();
  }
  nav.addEventListener("click",showView);
  // Replace browser-native select popups with accessible in-app pickers.
  function decorateSelect(select){
    if(select.closest(".select-menu")||select.dataset.customized==="true")return;
    select.dataset.customized="true";
    const wrapper=document.createElement("div");
    wrapper.className="select-menu select-component-picker";
    if(select.classList.contains("select-quiet"))wrapper.classList.add("select-picker-quiet");
    select.parentNode.insertBefore(wrapper,select);
    wrapper.append(select);
    select.classList.add("select-native");
    select.setAttribute("aria-hidden","true");
    select.tabIndex=-1;
    if(select.id==="transactionCategory")select.required=false;
    const trigger=document.createElement("button");
    trigger.type="button";
    trigger.className="select-trigger";
    trigger.setAttribute("aria-haspopup","listbox");
    trigger.setAttribute("aria-expanded","false");
    trigger.setAttribute("aria-label",select.getAttribute("aria-label")||select.id||"Choose option");
    trigger.innerHTML='<span></span><i>⌄</i>';
    if(select.classList.contains("select-quiet"))trigger.classList.add("select-trigger-quiet");
    const options=document.createElement("div");
    options.className="select-options";
    options.setAttribute("role","listbox");
    Array.from(select.options).forEach(option=>{
      const button=document.createElement("button");
      button.type="button";
      button.setAttribute("role","option");
      button.dataset.value=option.value;
      button.textContent=option.textContent;
      button.disabled=option.disabled;
      options.append(button);
    });
    wrapper.append(trigger,options);
    const sync=()=>{
      trigger.querySelector("span").textContent=select.selectedOptions[0]?.textContent||"Choose option";
      options.querySelectorAll("[role=option]").forEach(button=>button.setAttribute("aria-selected",String(button.dataset.value===select.value)));
    };
    trigger.addEventListener("click",()=>{
      document.querySelectorAll(".select-component-picker.open").forEach(menu=>{if(menu!==wrapper){menu.classList.remove("open");menu.querySelector(".select-trigger")?.setAttribute("aria-expanded","false");}});
      const open=wrapper.classList.toggle("open");
      trigger.setAttribute("aria-expanded",String(open));
    });
    options.addEventListener("click",event=>{
      const button=event.target.closest("[data-value]");
      if(!button||button.disabled)return;
      select.value=button.dataset.value;
      select.dispatchEvent(new Event("change",{bubbles:true}));
      sync();
      wrapper.classList.remove("open");
      trigger.setAttribute("aria-expanded","false");
    });
    select.addEventListener("change",sync);
    sync();
  }
  document.querySelectorAll("select").forEach(decorateSelect);
  window.greyFinanceSyncSelects=()=>document.querySelectorAll(".select-component-picker select").forEach(select=>{
    const trigger=select.parentElement?.querySelector(".select-trigger");
    if(trigger){trigger.querySelector("span").textContent=select.selectedOptions[0]?.textContent||"Choose option";select.parentElement.querySelectorAll("[role=option]").forEach(button=>button.setAttribute("aria-selected",String(button.dataset.value===select.value)));}
  });
  document.addEventListener("click",event=>{
    if(event.target.closest(".select-component-picker"))return;
    document.querySelectorAll(".select-component-picker.open").forEach(menu=>{menu.classList.remove("open");menu.querySelector(".select-trigger")?.setAttribute("aria-expanded","false");});
  });

  function el(tag,className,text){
    const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;
  }
  function renderMessages(){
    const list=$("#aiChatMessages");list.replaceChildren();
    if(!state.messages.length){
      const empty=el("div","ai-empty");empty.append(el("span","","✧"),el("b","","Hai, aku Grey AI."),el("p","","Tanya kondisi keuanganmu atau ceritakan transaksi untuk dibuatkan draft."));list.append(empty);return;
    }
    state.messages.forEach(message=>{
      const row=el("article","ai-message "+(message.role==="user"?"from-user":"from-ai"));
      row.append(el("div","ai-bubble",String(message.content||"")));
      if(message.draftId){
        const draft=state.drafts.get(message.draftId);
        if(draft){
          const card=el("div","ai-draft-card"),status=draft.status||"pending";
          const label=status==="pending"?"MENUNGGU PERSETUJUAN":status==="approved"?"TERSIMPAN":status==="rejected"?"DITOLAK":"KEDALUWARSA";
          const head=el("div","ai-draft-head");head.append(el("b","","TRANSACTION DRAFT"),el("span","ai-pending-tag",label));card.append(head);
          const amount=el("strong","ai-draft-amount money-display"+(balancesHidden()?" privacy-hidden":""),(draft.type==="income"?"+":"−")+money(draft.amount));
          const info=el("div","ai-draft-info");info.append(amount,el("span","",draft.type==="income"?"Pemasukan":"Pengeluaran"));card.append(info);
          const details=el("div","ai-draft-details");
          [["Kategori",draft.category],["Catatan",draft.note],["Tanggal",draft.date]].forEach(pair=>{const line=el("div","ai-draft-detail");line.append(el("span","",pair[0]),el("b","",pair[1]));details.append(line);});
          card.append(details);
          if(status==="pending"){
            const actions=el("div","ai-draft-actions"),approve=el("button","ai-approve","✓ Approve"),reject=el("button","ai-reject","Tolak");
            approve.type="button";approve.dataset.aiAction="approve";approve.dataset.draftId=draft.id;
            reject.type="button";reject.dataset.aiAction="reject";reject.dataset.draftId=draft.id;
            actions.append(approve,reject);card.append(actions,el("small","ai-draft-foot","Belum masuk ke transaksi. Periksa dulu sebelum menyetujui."));
          }else card.append(el("small","ai-draft-foot",status==="approved"?"Transaksi sudah masuk ke riwayat keuangan.":"Draft tidak mengubah data transaksi."));
          row.append(card);
        }
      }
      list.append(row);
    });
    list.scrollTop=list.scrollHeight;
  }
  async function loadHistory(){
    const list=$("#aiChatMessages");list.innerHTML='<div class="ai-loading"><span></span>Memuat percakapan…</div>';
    try{const data=await api("/api/assistant");state.messages=data.messages||[];state.drafts=new Map((data.drafts||[]).map(d=>[d.id,d]));renderMessages();}
    catch(error){list.replaceChildren(el("div","ai-load-error",error.message));}
  }
  function setSending(sending){
    state.busy=sending;$("#aiSendBtn").disabled=sending;$("#aiSendBtn").innerHTML=sending?'<span class="ai-spinner"></span>':'<span>↑</span>';$("#aiChatInput").disabled=sending;
  }
  $("#aiChatInput").addEventListener("input",()=>{$("#aiCharCount").textContent=$("#aiChatInput").value.length+"/1200";});
  $("#aiChatInput").addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();$("#aiChatForm").requestSubmit();}});
  document.querySelectorAll("[data-ai-prompt]").forEach(button=>button.addEventListener("click",()=>{$("#aiChatInput").value=button.dataset.aiPrompt;$("#aiCharCount").textContent=$("#aiChatInput").value.length+"/1200";$("#aiChatInput").focus();}));
  $("#aiChatForm").addEventListener("submit",async event=>{
    event.preventDefault();if(state.busy)return;
    const input=$("#aiChatInput"),message=input.value.trim();if(!message)return;
    setSending(true);
    try{
      const result=await api("/api/assistant",{method:"POST",body:{action:"chat",message}});
      state.messages.push(result.userMessage,result.assistantMessage);if(result.draft)state.drafts.set(result.draft.id,result.draft);
      input.value="";$("#aiCharCount").textContent="0/1200";renderMessages();
    }catch(error){notify(error.message,true);}
    finally{setSending(false);input.focus();}
  });
  $("#aiChatMessages").addEventListener("click",async event=>{
    const button=event.target.closest("[data-ai-action]");if(!button||button.disabled)return;
    const action=button.dataset.aiAction,draftId=button.dataset.draftId,draft=state.drafts.get(draftId);
    if(!draft||draft.status!=="pending")return;
    if(action==="approve"&&!confirm("Simpan transaksi ini ke riwayat Grey Finance?"))return;
    button.disabled=true;
    try{
      const result=await api("/api/assistant",{method:"POST",body:{action,draftId}});
      state.drafts.set(draftId,{...draft,status:result.status,transactionId:result.transactionId||null});
      notify(action==="approve"?"Transaksi disimpan ke Grey Finance.":"Draft ditolak.");renderMessages();
      if(action==="approve")window.greyFinanceRefresh?.();
    }catch(error){notify(error.message,true);button.disabled=false;}
  });
  $("#privacyToggle")?.addEventListener("click",()=>setTimeout(renderMessages,0));
  $("#currencySelect")?.addEventListener("change",renderMessages);
})();