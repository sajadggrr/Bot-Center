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

  let cachedBots=[];
  function renderBots(filter=""){
    const box=byId("myBotsList");
    const q=filter.trim().toLowerCase();
    const bots=cachedBots.filter(bot=>[bot.username,bot.display_name,bot.notes].some(v=>(v||"").toLowerCase().includes(q)));
    box.innerHTML=bots.length?bots.map(bot=>{
      const name=esc(bot.display_name||("@"+bot.username));
      return '<div class="bot-entry"><div class="admin-row"><div class="row-main"><b>🤖 '+name+'</b><small>@'+esc(bot.username)+' · رقم الربط: #'+bot.id+' · تاريخ الإضافة: '+date(bot.created_at)+'</small><span class="bot-state">مرتبط فقط · التشغيل خارجي</span></div><div class="bot-entry-actions"><button class="bot-disconnect" data-disconnect-bot="'+bot.id+'">فصل</button></div></div>'+
      '<button class="bot-details-btn bot-details-open" type="button" data-bot-details="'+bot.id+'">📋 عرض تفاصيل البوت</button><div class="bot-details-panel" id="botDetails-'+bot.id+'" hidden>'+
      '<div class="bot-detail-grid"><div><small>اسم المستخدم</small><b>@'+esc(bot.username)+'</b></div><div><small>رقم الربط</small><b>#'+bot.id+'</b></div><div><small>تاريخ الربط</small><b>'+date(bot.created_at)+'</b></div><div><small>نوع الربط</small><b>توكن خارجي</b></div></div>'+
      '<div class="bot-settings-form"><label for="botDisplayName-'+bot.id+'">اسم مخصص للبوت (اختياري)</label><input id="botDisplayName-'+bot.id+'" maxlength="80" value="'+esc(bot.display_name||"")+'" placeholder="مثلاً: بوت التحميل"><label for="botNotes-'+bot.id+'">ملاحظاتك وإعداداتك الخاصة</label><textarea id="botNotes-'+bot.id+'" maxlength="1000" rows="3" placeholder="اكتب وصف البوت أو ملاحظاتك هنا...">'+esc(bot.notes||"") +'</textarea><button type="button" class="bot-details-btn bot-save-settings" data-save-bot="'+bot.id+'">💾 حفظ الإعدادات</button><small class="bot-save-status" id="botSaveStatus-'+bot.id+'" role="status"></small></div>'+
      '<p>حالة Bot Center: التوكن محفوظ بشكل مشفّر. هذه إعدادات تنظيمية داخل المنصة فقط؛ لا تغيّر كود البوت أو تشغيله في المصنع الخارجي.</p><div class="bot-activity"><div class="bot-activity-heading">🕘 سجل نشاط البوت</div><div class="bot-activity-list" id="botActivity-'+bot.id+'"><small>افتح التفاصيل لعرض سجل النشاط...</small></div></div>'+
      '<div class="bot-detail-actions"><button type="button" class="bot-details-btn" data-copy-bot="'+esc(bot.username)+'">نسخ اسم البوت</button><a href="https://t.me/'+encodeURIComponent(bot.username)+'" target="_blank" rel="noopener">فتح في تيليجرام ↗</a></div></div></div>';
    }).join(""):'<p class="empty-state">'+(q?"ما لكيت بوت يطابق البحث.":"ما عندك بوتات مرتبطة حالياً.")+'</p>';
  }
  async function loadBots(){
    const box=byId("myBotsList");
    box.innerHTML='<p class="empty-state">جاري تحميل البوتات...</p>';
    try{cachedBots=await api("/api/bots");renderBots(byId("botSearch")?.value||"");}
    catch(e){box.innerHTML='<p class="empty-state error-text">'+esc(e.message)+'</p>';}
  }
  byId("addBotBtn").addEventListener("click",async()=>{
    const input=byId("botToken"),status=byId("botStatus"),button=byId("addBotBtn");
    const token=input.value.trim();status.classList.remove("error");
    if(!token){status.textContent="أدخل توكن البوت أولاً.";status.classList.add("error");return;}
    if(!tg?.initData){status.textContent="افتح المنصة من داخل تيليجرام.";status.classList.add("error");return;}
    button.disabled=true;status.textContent="جاري التحقق من التوكن...";
    try{
      const result=await api("/api/bots",{method:"POST",body:JSON.stringify({token})});
      input.value="";status.textContent="تم ربط @"+result.username+" بنجاح ✓";
      await loadBots();tg.HapticFeedback?.notificationOccurred("success");
    }catch(e){status.textContent="تعذر الربط: "+e.message;status.classList.add("error");}
    finally{button.disabled=false;}
  });
  byId("refreshBots").addEventListener("click",loadBots);
  byId("botSearch")?.addEventListener("input",event=>renderBots(event.target.value));
  async function loadBotActivity(id){
    const box=byId("botActivity-"+id);
    if(!box)return;
    box.innerHTML='<small>جاري تحميل سجل النشاط...</small>';
    try{
      const items=await api("/api/bots/"+id+"/activity");
      box.innerHTML=items.length?items.map(item=>`
        <div class="bot-activity-item">
          <span class="bot-activity-dot">●</span>
          <div><b>${esc(item.action)}</b><small>${esc(item.details||"")} · ${date(item.created_at)}</small></div>
        </div>`).join(""):'<small>لا توجد أنشطة مسجلة بعد.</small>';
    }catch(e){box.innerHTML='<small class="error-text">'+esc(e.message)+'</small>';}
  }
  byId("myBotsList").addEventListener("click",async event=>{
    const details=event.target.closest("[data-bot-details]");
    if(details){
      const panel=byId("botDetails-"+details.dataset.botDetails);
      if(panel){panel.hidden=!panel.hidden;details.textContent=panel.hidden?"📋 عرض تفاصيل البوت":"إخفاء التفاصيل";if(!panel.hidden)loadBotActivity(details.dataset.botDetails);}
      return;
    }
    const save=event.target.closest("[data-save-bot]");
    if(save){
      const id=save.dataset.saveBot;
      const name=byId("botDisplayName-"+id).value.trim();
      const notes=byId("botNotes-"+id).value.trim();
      const status=byId("botSaveStatus-"+id);
      save.disabled=true;status.textContent="جاري الحفظ...";
      try{
        await api("/api/bots/"+id,{method:"PUT",body:JSON.stringify({display_name:name,notes})});
        status.textContent="تم حفظ الإعدادات ✓";
        tg?.HapticFeedback?.notificationOccurred("success");
      }catch(e){status.textContent="تعذر الحفظ: "+e.message;}
      finally{save.disabled=false;}
      return;
    }
    const copy=event.target.closest("[data-copy-bot]");
    if(copy){
      try{await navigator.clipboard.writeText("@"+copy.dataset.copyBot);copy.textContent="تم النسخ ✓";}
      catch(e){alert("تعذر النسخ تلقائياً: @"+copy.dataset.copyBot);}
      return;
    }
    const button=event.target.closest("[data-disconnect-bot]");
    if(!button)return;
    if(!confirm("فصل هذا البوت من Bot Center؟ هذا لا يوقفه في المصنع الخارجي."))return;
    button.disabled=true;
    try{await api("/api/bots/"+button.dataset.disconnectBot,{method:"DELETE"});await loadBots();}
    catch(e){alert("تعذر الفصل: "+e.message);button.disabled=false;}
  });
  loadBots();

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
  const paymentLabels={stars:"⭐ نجوم تيليجرام",asiacell:"📱 آسياسيل",bank_transfer:"🏦 التحويل البنكي",card:"💳 الكارت"};
  async function loadPaymentMethodsAdmin(){
    const box=byId("paymentMethodsAdmin");
    box.innerHTML='<p class="empty-state">جاري التحميل...</p>';
    try{
      const result=await api("/api/admin/payment-methods");
      box.innerHTML=Object.entries(result.methods).map(([key,item])=>`
        <div class="payment-method-editor" data-payment-method="${key}">
          <div class="payment-method-top"><b>${paymentLabels[key]||esc(item.label)}</b>
            <label class="switch-label"><input class="method-enabled" type="checkbox" ${item.enabled?"checked":""}> تفعيل</label>
          </div>
          <label>تعليمات الدفع / رقم الحساب
            <textarea class="method-instructions" maxlength="1500" rows="3" placeholder="اكتب تفاصيل الدفع التي ستظهر للمستخدم">${esc(item.instructions||"")}</textarea>
          </label>
        </div>`).join("");
    }catch(e){box.innerHTML='<p class="empty-state error-text">'+esc(e.message)+'</p>';}
  }
  async function savePaymentMethods(){
    const status=byId("paymentMethodsStatus");
    const methods={};
    document.querySelectorAll("[data-payment-method]").forEach(card=>{
      methods[card.dataset.paymentMethod]={
        enabled:card.querySelector(".method-enabled").checked,
        instructions:card.querySelector(".method-instructions").value.trim()
      };
    });
    status.textContent="جاري الحفظ...";
    try{
      await api("/api/admin/payment-methods",{method:"PUT",body:JSON.stringify({methods})});
      status.textContent="تم حفظ وسائل الدفع بنجاح ✓";
      await loadPublicPaymentMethods();
    }catch(e){status.textContent="تعذر الحفظ: "+e.message;}
  }
  async function loadPublicPaymentMethods(){
    const box=byId("publicPaymentMethods");
    try{
      const result=await fetch(API+"/api/payment-methods");
      const data=await result.json().catch(()=>({}));
      if(!result.ok)throw new Error(data.detail||"تعذر تحميل وسائل الدفع");
      const methods=Object.entries(data.methods||{});
      box.innerHTML=methods.length?methods.map(([key,item])=>`
        <button type="button" class="public-payment-button" data-public-method="${key}" data-instructions="${esc(item.instructions||"")}" data-label="${esc(item.label||paymentLabels[key]||key)}">
          <span>${paymentLabels[key]||esc(item.label||key)}</span><small>إرسال طلب اشتراك</small>
        </button>`).join(""):'<p class="empty-state">لا توجد وسائل دفع متاحة حالياً.</p>';
      box.dataset.price=data.plan?.price||"";
    }catch(e){box.innerHTML='<p class="empty-state error-text">'+esc(e.message)+'</p>';}
  }
  byId("publicPaymentMethods").addEventListener("click",async event=>{
    const button=event.target.closest("[data-public-method]");
    if(!button)return;
    if(!tg?.initData){alert("افتح المنصة من داخل تيليجرام حتى ترسل طلب الدفع.");return;}
    const instructions=button.dataset.instructions||"لا توجد تعليمات إضافية.";
    alert(button.dataset.label+"\\n\\n"+instructions);
    const amount=prompt("أدخل المبلغ المطلوب دفعه:",byId("publicPaymentMethods").dataset.price||"");
    if(amount===null||!amount.trim())return;
    const reference=prompt("أدخل رقم العملية أو ملاحظة الدفع (اختياري):")||"";
    button.disabled=true;
    try{
      const response=await api("/api/payments",{method:"POST",body:JSON.stringify({method:button.dataset.publicMethod,amount:amount.trim(),reference:reference.trim()||null})});
      alert("تم إرسال طلب الدفع رقم "+response.id+" بنجاح. انتظر مراجعة الإدارة.");
    }catch(e){alert("تعذر إرسال الطلب: "+e.message);}
    finally{button.disabled=false;}
  });
  byId("refreshPaymentMethods").addEventListener("click",loadPaymentMethodsAdmin);
  byId("savePaymentMethods").addEventListener("click",savePaymentMethods);
  loadPublicPaymentMethods();

  async function loadFadehostApps(){
    const box=byId("fadehostAppsList"),status=byId("fadehostStatus");
    if(!box)return;
    box.innerHTML='<p class="empty-state">جاري الاتصال بـ FadeHost...</p>';
    if(status)status.textContent="";
    try{
      const result=await api("/api/admin/fadehost/bots");
      const raw=result.bots;
      const items=Array.isArray(raw)?raw:
        Array.isArray(raw?.bots)?raw.bots:
        Array.isArray(raw?.apps)?raw.apps:
        raw?[raw]:[];
      if(!items.length){
        box.innerHTML='<p class="empty-state">تم الاتصال، لكن لم ترجع القائمة أي تطبيقات.</p>';
        return;
      }
      box.innerHTML=items.map(item=>{
        const name=esc(item.name||item.app_name||item.display_name||item.id||"تطبيق FadeHost");
        const id=esc(item.id||item.app_id||"—");
        const state=esc(item.status||item.state||"غير محدد");
        const runtime=esc(item.runtime||item.language||"");
        const repo=esc(item.repository||item.repo||item.github_repo||"");
        return '<div class="bot-entry"><div class="admin-row"><div class="row-main"><b>☁️ '+name+'</b><small>المعرّف: '+id+(runtime?' · البيئة: '+runtime:'')+(repo?' · المستودع: '+repo:'')+'</small><span class="bot-state">الحالة: '+state+'</span><button type="button" class="text-refresh" data-fadehost-logs="'+id+'">📄 عرض السجلات</button></div></div><pre class="fadehost-log-output" hidden style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:360px;overflow:auto;padding:12px;border-radius:10px;background:#080d18;color:#d7e2f3;font-size:12px;direction:ltr;text-align:left"></pre></div>';
      }).join("");
      if(status)status.textContent="تم جلب قائمة FadeHost بنجاح ✓";
    }catch(e){
      box.innerHTML='<p class="empty-state error-text">'+esc(e.message)+'</p>';
      if(status)status.textContent="تعذر تحميل تطبيقات FadeHost.";
    }
  }
  async function refreshAdmin(){
    byId("refreshAdmin").disabled=true;
    try{await Promise.all([loadStats(),loadPlan(),loadUsers(),loadPayments(),loadPaymentMethodsAdmin(),loadFadehostApps()]);}
    catch(e){console.error(e);}
    finally{byId("refreshAdmin").disabled=false;}
  }
  async function initAdmin(){
    const access=byId("adminAccessStatus");
    try{
      const me=await api("/api/me");
      if(me.is_owner){
        access.hidden=true;
        byId("adminPanel").hidden=false;
        await refreshAdmin();
      }else{
        access.hidden=false;
        access.textContent="تم فتح التطبيق، لكن حساب تيليجرام الحالي ليس معرّف المطوّر المسجّل في إعدادات الخادم.";
      }
    }catch(e){
      access.hidden=false;
      access.textContent="تعذر التحقق من صلاحية المطوّر: "+e.message;
      console.warn("Admin panel unavailable:",e.message);
    }
  }
  byId("refreshAdmin").addEventListener("click",refreshAdmin);
  byId("refreshFadehost")?.addEventListener("click",loadFadehostApps);
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
    const logsButton=event.target.closest("[data-fadehost-logs]");
    if(logsButton){
      const botId=logsButton.dataset.fadehostLogs;
      const output=logsButton.closest(".bot-entry")?.querySelector(".fadehost-log-output");
      if(!output)return;
      logsButton.disabled=true;
      logsButton.textContent="⏳ جاري جلب السجلات...";
      output.hidden=false;
      output.textContent="جاري الاتصال بـ FadeHost...";
      try{
        const result=await api("/api/admin/fadehost/bots/"+encodeURIComponent(botId)+"/logs");
        const logs=result.logs;
        output.textContent=typeof logs==="string"?logs:JSON.stringify(logs,null,2);
        if(!output.textContent)output.textContent="لا توجد سجلات متاحة حالياً.";
        logsButton.textContent="↻ تحديث السجلات";
      }catch(e){
        output.textContent="تعذر جلب السجلات: "+e.message;
        logsButton.textContent="📄 إعادة المحاولة";
      }finally{logsButton.disabled=false;}
      return;
    }
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