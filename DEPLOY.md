# 🚀 دليل نشر روي (RAWI) — مبسّط

البنية: **واجهة (Vercel) + قاعدة بيانات (Firebase) + مولّد ذكاء اصطناعي (GitHub Actions)**.
لا خادم دائم ولا بوتات.

> 🔑 كل المفاتيح تُضاف كـ Environment Variables / Secrets — لا داخل الكود.
> الموقع يعمل قبل إضافة أي مفتاح (ببيانات جاهزة).

---

## ① الواجهة → Vercel  ✅ (بدون أي مفتاح)
1. ارفع المستودع إلى GitHub.
2. Vercel → **New Project** → اختر المستودع.
3. الإعدادات: **Framework: Other** · **Root Directory: `.`** · **Output Directory: `public`** · Build فارغ.
4. **Deploy** → الموقع حيّ فورًا على `https://<اسمك>.vercel.app`.

إعداد Firebase للويب عام ومضمّن في `public/config.js`، فالواجهة تقرأ من Firestore مباشرة.

---

## ② قاعدة البيانات → Firebase (مرة واحدة)
1. في Firebase Console: فعّل **Firestore Database** و**Authentication → Anonymous** (و**Google** اختياريًا).
2. انشر القواعد والفهارس:
   ```bash
   npm i -g firebase-tools && firebase login
   npm run deploy:rules
   ```
3. (اختياري) بيانات أولية:
   ```bash
   cp .env.example .env       # املأ FIREBASE_SERVICE_ACCOUNT_JSON
   npm run seed
   ```

---

## ③ التوليد بالذكاء الاصطناعي → GitHub Actions (مجاني، تلقائي)
1. في المستودع: **Settings → Secrets and variables → Actions → New repository secret**، أضِف:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — محتوى ملف الـ service account (سطر JSON واحد).
   - `GEMINI_API_KEY` — مفتاح Gemini.
2. الوركفلو `.github/workflows/ai-generate.yml` يعمل **كل 6 ساعات** تلقائيًا،
   أو شغّله يدويًا من تبويب **Actions → AI Generate → Run workflow**.

> بدّل التوقيت من `cron` في الوركفلو. بدون `GEMINI_API_KEY` يستخدم المولّد معجمًا تراثيًا (لا يفشل).

---

## 🔐 أين تُضاف كل قيمة
| المتغيّر | Vercel (الواجهة) | GitHub Actions / محليًا |
|---------|:---:|:---:|
| Firebase Web (config.js) | مضمّن | — |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | — | ✅ |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | — | ✅ |

⚠️ **private_key:** الصق النص الكامل داخل `FIREBASE_SERVICE_ACCOUNT_JSON`.

---

## ✅ أسرع طريق
GitHub → Vercel (Output = `public`) → **Deploy**. خلاص الموقع شغّال.
أضف مفاتيح Firebase/Gemini لاحقًا لتفعيل الربط الحيّ والتوليد التلقائي.
