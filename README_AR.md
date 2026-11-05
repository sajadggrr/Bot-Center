# Bot Center — منصة Mini Apps متعددة البوتات

نسخة بداية قابلة للتطوير من منصة Bot Center. الواجهة عربية/إنجليزية وداكنة، وتحتوي حالياً على تطبيق التواصل. البنية تسمح بإضافة بوتات أخرى باستخدام `bot` slug ورابط Mini App لكل بوت.

## مهم قبل التشغيل
- لا تضع Bot Token داخل ملفات الواجهة أو JavaScript.
- لا ترسل التوكن داخل المحادثات أو الصور.
- إذا ظهر التوكن في صورة أو انكشف، ألغِه من BotFather باستخدام `/revoke` أو زر Revoke، ثم استخدم الجديد.
- يجب تشغيل التطبيق على استضافة HTTPS عامة حتى يعمل Mini App في تيليجرام. Pydroid مناسب للتجربة المحلية، لكنه لا يوفر رابط HTTPS عاماً وحده.

## 1) إعداد المشروع
1. فك ضغط `Bot_Center.zip`.
2. انسخ `.env.example` إلى ملف اسمه `.env`.
3. افتح `.env` وضع توكن بوت التواصل الجديد مكان `CONTACT_BOT_TOKEN`.
4. تأكد من `OWNER_ID` وأنه رقم حسابك الرقمي الصحيح.
5. غيّر `ADMIN_KEY` إلى كلمة طويلة وسرية.

## 2) التشغيل على الكمبيوتر أو الاستضافة
```bash
python -m pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
ثم اربط الدومين مع HTTPS (مثلاً عبر Render أو Railway أو VPS مع نطاق وشهادة SSL).

## 3) إعداد Mini App في BotFather
لكل بوت:
1. افتح `@BotFather` ثم `/mybots`.
2. اختر البوت ثم إعدادات Mini App.
3. فعّل Mini App وأرسل رابط التطبيق، مثال:
   `https://YOUR-DOMAIN.example/?bot=contact`
4. استخدم نفس الدومين لبقية البوتات مع slug مختلف، مثل:
   `https://YOUR-DOMAIN.example/?bot=orders`

## 4) إضافة بوتات أخرى
أضف إعداد كل بوت إلى `BOTS_JSON` داخل `.env` ثم أعد تشغيل الخادم:
```json
{
  "contact": {
    "name": "بوت التواصل",
    "token": "123:ABC",
    "owner_id": 1916071119,
    "username": "YourContactBot",
    "contact_enabled": true
  },
  "orders": {
    "name": "بوت الطلبات",
    "token": "456:DEF",
    "owner_id": 1916071119,
    "username": "YourOrdersBot",
    "contact_enabled": true
  }
}
```
ثم اضبط رابط Mini App للبوت الثاني:
`https://YOUR-DOMAIN.example/?bot=orders`

## 5) ما الذي يعمل في هذه النسخة؟
- واجهة Mini App داكنة متجاوبة.
- تبديل اللغة عربي/إنجليزي.
- قراءة هوية المستخدم من Telegram WebApp initData والتحقق منها على الخادم بتوكن البوت المحدد.
- نموذج إرسال رسالة من Mini App إلى مالك البوت.
- تخزين الرسائل والمستخدمين في SQLite.
- إحصائيات إدارية وقراءة الرسائل عبر API محمي بمفتاح `ADMIN_KEY`.
- endpoint لإضافة بوت والتحقق من التوكن، لكن الإضافة عبر API لا تحفظ التوكن في `.env`؛ للإعداد الدائم أضفه إلى `BOTS_JSON` ثم أعد التشغيل.

## API إدارية
أرسل الهيدر `X-Admin-Key: قيمة_ADMIN_KEY`:
- `GET /api/admin/stats`
- `GET /api/admin/messages?limit=50`
- `POST /api/admin/bots` مع JSON: `slug`, `token`, `name`, `owner_id`, و`username` اختياري.

## ملاحظات إنتاجية
هذه حزمة تأسيسية وليست منصة إنتاج نهائية بعد. قبل فتحها للجمهور، أضف لوحة إدارة بواجهة مستخدم، إدارة آمنة للأسرار، حدود إرسال ومكافحة إساءة الاستخدام، نسخاً احتياطياً لقاعدة البيانات، وسياسة خصوصية. لا تستخدم SQLite على تخزين مؤقت يختفي عند إعادة نشر الاستضافة.
