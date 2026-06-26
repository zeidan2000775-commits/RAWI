# 🚀 دليل نشر روي (RAWI) — خطوة بخطوة

المشروع 3 أجزاء تُنشر بشكل مستقل. **الواجهة وحدها كافية لموقع يعمل فورًا** —
والبقية تُفعّل الحفظ الحيّ والبوتات.

> 🔑 **كل المفاتيح تُضاف كـ Environment Variables في لوحة المنصة (Vercel/Render)، لا داخل الكود.**
> تقدر تضيفها لاحقًا — الموقع يعمل قبلها ببيانات جاهزة.

---

## ① الواجهة (Frontend) → Vercel  ✅ الأهم
**لا تحتاج أي مفتاح سرّي** — إعداد Firebase للويب عام ومضمّن في `public/config.js`.

1. ارفع المستودع إلى GitHub (تم).
2. في Vercel: **New Project** → اختر المستودع.
3. الإعدادات:
   - **Framework Preset:** Other
   - **Root Directory:** `.` (الجذر)
   - **Output Directory:** `public`
   - **Build Command:** اتركه فارغًا (موقع ثابت)
4. **Deploy** — سيعمل الموقع فورًا على `https://<اسمك>.vercel.app` ويفتح على `rawi.html`.

> ملاحظة: الواجهة تقرأ المحتوى محليًا (بيانات شعرية مختارة) لتعمل دائمًا بسرعة وبلا تكلفة.
> لتفعيل الحفظ الحيّ من المستخدمين، انشر قواعد Firebase (القسم ③) ثم سيكتب التطبيق إلى Firestore.

---

## ② قواعد البيانات (Firebase) → مرة واحدة
1. ثبّت الأدوات: `npm i -g firebase-tools` ثم `firebase login`.
2. انشر القواعد والفهارس:
   ```bash
   npm run deploy:rules        # firestore.rules + firestore.indexes.json
   ```
3. (اختياري) ابذر بيانات أولية:
   ```bash
   cp .env.example .env        # املأ FIREBASE_SERVICE_ACCOUNT_JSON
   npm run seed
   ```
4. في Firebase Console: فعّل **Authentication → Google** و**Firestore Database**.

---

## ③ الـ API (server) → Vercel (مشروع منفصل) — اختياري
يلزم فقط لإشعارات FCM وWebhooks. 
- **Root Directory:** `server` — Vercel يلتقط `server/vercel.json` تلقائيًا.
- أضف المتغيّرات (القسم «مصفوفة المفاتيح» أدناه).

---

## ④ البوتات (bots) → Render — اختياري
1. Render → **New → Background Worker** → اربط المستودع.
2. **Root Directory:** `bots` · **Build:** `npm install` · **Start:** `node src/index.js`
   (أو استخدم `bots/render.yaml` عبر Blueprint).
3. أضف المتغيّرات (أدناه)، ثم انشر. أرسل `/panel` لأي بوت في تيليجرام للوحة التحكم.

---

## 🔐 مصفوفة المفاتيح — أين تُضاف كل قيمة

| المتغيّر | Vercel (الواجهة) | Vercel (server) | Render (bots) |
|---------|:---:|:---:|:---:|
| `FIREBASE_*` (web) | مضمّنة في config.js | — | — |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | — | ✅ | ✅ |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | — | — | ✅ |
| `TELEGRAM_ADMIN_CHAT_ID` | — | (للـ webhook) | ✅ |
| `BOT_RAWI_TOKEN` … `BOT_KHABIR_TOKEN` (×6) | — | (للـ webhook) | ✅ |
| `WEBHOOK_SECRET` | — | ✅ | ✅ |
| `KILL_SWITCH` / `MONETIZATION_ENABLED` | — | ✅ | ✅ |

> القيم نفسها موجودة في `.env.example`. للتشغيل المحلي: `cp .env.example .env` واملأها.
> ⚠️ **مفتاح Admin الخاص (private_key):** الصق النص الكامل داخل `FIREBASE_SERVICE_ACCOUNT_JSON`.

---

## ✅ أسرع طريق لموقع حيّ الآن
1. ارفع إلى GitHub → Vercel (Output Directory = `public`) → **Deploy**.
2. خلاص! الموقع شغّال. أضف مفاتيح Firebase/Gemini/Telegram لاحقًا متى ما حبيت لتفعيل الحفظ والبوتات.
