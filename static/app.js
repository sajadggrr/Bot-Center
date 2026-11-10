(() => {
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();

  const params = new URLSearchParams(location.search);
  const botSlug = params.get("bot") || "contact";
  let lang = "ar";

  const langBtn = document.getElementById("langBtn");
  const message = document.getElementById("message");
  const count = document.getElementById("count");
  const statusBox = document.getElementById("status");
  const sendBtn = document.getElementById("sendBtn");

  function setStatus(text, error = false) {
    statusBox.textContent = text;
    statusBox.classList.toggle("error", error);
  }

  function setLang(next) {
    lang = next;
    document.body.classList.toggle("en", lang === "en");
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-ar]").forEach(el => {
      const value = el.dataset[lang];
      if (value !== undefined) el.innerHTML = value;
    });

    message.placeholder = lang === "ar" ? "اكتب رسالتك هنا..." : "Write your message here...";
    langBtn.textContent = lang === "ar" ? "EN" : "عربي";
  }

  langBtn.addEventListener("click", () => setLang(lang === "ar" ? "en" : "ar"));
  message.addEventListener("input", () => {
    count.textContent = String(message.value.length);
  });

  sendBtn.addEventListener("click", async () => {
    const text = message.value.trim();
    setStatus("");

    if (!text) {
      setStatus(lang === "ar" ? "اكتب رسالتك أولاً." : "Please write a message first.", true);
      message.focus();
      return;
    }

    if (!tg?.initData) {
      setStatus(
        lang === "ar"
          ? "افتح التطبيق من زر البوت داخل تيليجرام."
          : "Open this app from your bot in Telegram.",
        true
      );
      return;
    }

    sendBtn.disabled = true;
    setStatus(lang === "ar" ? "جاري الإرسال..." : "Sending...");

    try {
      // This endpoint must be provided by your deployed backend.
      const apiUrl = window.BOT_CENTER_API_URL || "/api/message";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Init-Data": tg.initData
        },
        body: JSON.stringify({ bot: botSlug, message: text })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || (response.status === 404
          ? "API endpoint not found. Backend is not connected."
          : "Request failed"));
      }

      message.value = "";
      count.textContent = "0";
      setStatus(lang === "ar" ? "تم إرسال رسالتك بنجاح ✓" : "Your message was sent ✓");
      tg.HapticFeedback?.notificationOccurred("success");
    } catch (error) {
      const isMissingApi = error instanceof TypeError || /API endpoint not found/i.test(error.message);
      const messageText = isMissingApi
        ? (lang === "ar"
            ? "الواجهة تعمل، لكن خادم إرسال الرسائل غير مربوط بعد."
            : "The interface is live, but the message backend is not connected yet.")
        : (lang === "ar" ? "تعذر الإرسال: " : "Could not send: ") + error.message;
      setStatus(messageText, true);
      tg?.HapticFeedback?.notificationOccurred("error");
    } finally {
      sendBtn.disabled = false;
    }
  });

  setLang("ar");
})();
