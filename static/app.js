(() => {
  const tg = window.Telegram?.WebApp;
  tg?.ready(); tg?.expand();
  const params = new URLSearchParams(location.search);
  const botSlug = params.get("bot") || "contact";
  const API = "https://bot-center-v2.vercel.app";
  const authHeaders = () => ({
    "Content-Type": "application/json",
    "X-Telegram-Init-Data": tg?.initData || ""
  });
  let lang = "ar";
  const langBtn=document.getElementById("langBtn"), message=document.getElementById("message");
  const count=document.getElementById("count"), statusBox=document.getElementById("status"), sendBtn=document.getElementById("sendBtn");
  function setStatus(text,error=false){statusBox.textContent=text;statusBox.classList.toggle("error",error);}
  function setLang(next){
    lang=next;document.body.classList.toggle("en",lang==="en");
    document.documentElement.dir=lang==="ar"?"rtl":"ltr";document.documentElement.lang=lang;
    document.querySelectorAll("[data-ar]").forEach(el=>{const value=el.dataset[lang];if(value!==undefined)el.innerHTML=value;});
    message.placeholder=lang==="ar"?"اكتب رسالتك هنا...":"Write your message here...";
    langBtn.textContent=lang==="ar"?"EN":"عربي";
  }
  langBtn.addEventListener("click",()=>setLang(lang==="ar"?"en":"ar"));
  message.addEventListener("input",()=>{count.textContent=String(message.value.length);});
  sendBtn.addEventListener("click",async()=>{
    const text=message.value.trim();setStatus("");
    if(!text){setStatus(lang==="ar"?"اكتب رسالتك أولاً.":"Please write a message first.",true);message.focus();return;}
    if(!tg?.initData){setStatus(lang==="ar"?"افتح التطبيق من زر البوت داخل تيليجرام.":"Open this app from Telegram.",true);return;}
    sendBtn.disabled=true;setStatus(lang==="ar"?"جاري الإرسال...":"Sending...");
    try{
      const response=await fetch(window.BOT_CENTER_API_URL||API+"/api/message",{method:"POST",headers:authHeaders(),body:JSON.stringify({bot:botSlug,message:text})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.detail||"Request failed");
      message.value="";count.textContent="0";setStatus(lang==="ar"?"تم إرسال رسالتك بنجاح ✓":"Your message was sent ✓");
      tg.HapticFeedback?.notificationOccurred("success");
    }catch(error){setStatus((lang==="ar"?"تعذر الإرسال: ":"Could not send: ")+error.message,true);tg?.HapticFeedback?.notificationOccurred("error");}
    finally{sendBtn.disabled=false;}
  });

  async function api(path,options={}){
    if(!tg?.initData)throw new Error("افتح التطبيق من داخل تيليجرام");
    const response=await fetch(API+path,{...options,headers:{...authHeaders(),...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.detail||"تعذر تنفيذ الطلب");
    return data;
  }
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date=value=>value?new Date(value*1000).toLocaleDateString("ar-IQ"):"—";
  async function loadStats(){
    const s=await api("/api/admin/stats");
    byId("statUsers").textContent=s.users;byId("statBots").textContent=s.bots;
    byId("statPayments").textContent=s.pending_payments;byId("statBanned").textContent=s.banned_users;
  }
  async function loadPlan(){
    const p=await api("/api/admin/plan");
    byId("planName").value=p.name;byId("planPrice").value=p.price;byId("planDays").value=p.duration_days;
  }
  async function loadUsers(){
    const box=byId("usersList");box.innerHTML='<p class="empty-state">جاري التحميل...</p>';
    try{
      const users=await api("/api/admin/users");
      box.innerHTML=users.length?users.map(u=>`<div class="admin-row"><div class="row-main"><b>${esc(u.first_name||"مستخدم")}</b><small>${u.username?"@"+esc(u.username):"بدون اسم مستخدم"} · ID: ${u.id} · ${date(u.created_at)}</small></div><button class="mini-action ${u.is_banned?"unban":""}" data-user="${u.id}" data-banned="${u.is_banned}">${u.is_banned?"إلغاء الحظر":"حظر"}</button></div>`).join(""):'<p class="empty-state">لا يوجد مستخدمون بعد.</p>';
    }catch(e){box.innerHTML='<p class="empty-state error-text">'+esc(e.message)+'</p>';}
  }
  async function loadPayments(){
    const box=byId("paymentsList");box.innerHTML='<p class="empty-state">جاري التحميل...</p>';
    try{
      const payments=await api("/api/admin/payments?status=pending");
      box.innerHTML=payments.length?payments.map(p=>`<div class="admin-row payment-row"><div class="row-main"><b>طلب #${p.id} · ${esc(p.amount)}</b><small>المستخدم: ${p.user_id} · الطريقة: ${esc(p.method)} · المرجع: ${esc(p.reference||"—")}</small><small>${date(p.created_at)}</small></div><div class="row-actions"><button class="mini-action approve" data-payment="${p.id}" data-approve="true">قبول</button><button class="mini-action reject" data-payment="${p.id}" data-approve="false">رفض</button></div></div>`).join(""):'<p class="empty-state">لا توجد طلبات دفع معلّقة.</p>';
    }catch(e){box.innerHTML='<p class="empty-state error-text">'+esc(e.message)+'</p>';}
  }
  async function refreshAdmin(){
    byId("refreshAdmin").disabled=true;
    try{await Promise.all([loadStats(),loadPlan(),loadUsers(),loadPayments()]);}
    catch(e){console.error(e);}
    finally{byId("refreshAdmin").disabled=false;}
  }
  async function initAdmin(){
    try{
      const me=await api("/api/me");
      if(me.is_owner){byId("adminPanel").hidden=false;await refreshAdmin();}
    }catch(e){console.warn("Admin panel unavailable:",e.message);}
  }
  byId("refreshAdmin").addEventListener("click",refreshAdmin);
  byId("refreshUsers").addEventListener("click",loadUsers);
  byId("refreshPayments").addEventListener("click",loadPayments);
  byId("savePlan").addEventListener("click",async()=>{
    const status=byId("planStatus");status.textContent="جاري الحفظ...";
    try{
      await api("/api/admin/plan",{method:"PUT",body:JSON.stringify({name:byId("planName").value.trim(),price:byId("planPrice").value.trim(),duration_days:Number(byId("planDays").value)})});
      status.textContent="تم حفظ إعدادات الخطة بنجاح ✓";
    }catch(e){status.textContent="تعذر الحفظ: "+e.message;}
  });
  document.addEventListener("click",async event=>{
    const ban=event.target.closest("[data-user]");
    if(ban){
      const id=ban.dataset.user,banned=ban.dataset.banned!=="true";
      if(!confirm(banned?"تأكيد حظر هذا المستخدم؟":"تأكيد إلغاء الحظر؟"))return;
      ban.disabled=true;
      try{await api("/api/admin/users/"+id+"/ban",{method:"POST",body:JSON.stringify({banned})});await Promise.all([loadUsers(),loadStats()]);}
      catch(e){alert(e.message);ban.disabled=false;}
      return;
    }
    const payment=event.target.closest("[data-payment]");
    if(payment){
      const approve=payment.dataset.approve==="true";
      if(!confirm(approve?"قبول الطلب وتفعيل الاشتراك؟":"رفض طلب الدفع؟"))return;
      payment.disabled=true;
      try{await api("/api/admin/payments/"+payment.dataset.payment+"/decision",{method:"POST",body:JSON.stringify({approve,plan_name:byId("planName").value||"Premium",duration_days:Number(byId("planDays").value)||30})});await Promise.all([loadPayments(),loadStats()]);}
      catch(e){alert(e.message);payment.disabled=false;}
    }
  });
  setLang("ar");
  initAdmin();
})();