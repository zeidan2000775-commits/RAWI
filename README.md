<div align="center">

# 🪶 روي · RAWI

**منصة عربية للشعر والأدب** — واجهة PWA فائقة الجمال، مربوطة بـ **Firebase**،
ومحتواها **يُولّده ويصيغه الذكاء الاصطناعي (Gemini)** تلقائيًا. بلا خوادم معقّدة.

</div>

---

## ✨ الفكرة ببساطة
```
   Gemini (يسحب ويصيغ)  ──►  Firebase (Firestore)  ──►  الواجهة (PWA)
        ملف واحد                  مجاني                  تقرأ مباشرة
   scripts/ai-generate.js                              public/rawi.html
```
- **لا خادم دائم، ولا بوتات، ولا طوابير.** ملف توليد واحد + قاعدة بيانات + واجهة.
- الواجهة **تقرأ المحتوى حيًّا من Firebase**، وتعمل فورًا (ببيانات جاهزة) حتى قبل أي إعداد.
- التوليد يعمل تلقائيًا عبر **GitHub Actions** كل 6 ساعات (مجاني، بلا خادم).

## 🗂️ الهيكل
```
public/                 الواجهة (PWA)
  rawi.html  app.js     التطبيق الكامل (يقرأ من Firebase)
  home-feed.html        شاشة Home Feed مستقلّة (عرض نظام التصميم)
  sw.js  manifest  config.js
  assets/               +45 رسم SVG أصلي (شعار، أيقونات، رسومات، أنماط)
scripts/
  ai-generate.js        ⭐ المولّد الوحيد: Gemini → Firebase
  serve.js  deploy-rules.sh
.github/workflows/
  ai-generate.yml       تشغيل المولّد تلقائيًا (cron)
firestore.rules  firestore.indexes.json  firebase.json
DEPLOY.md  FINAL_ARCHITECTURE.md  DATABASE_SCHEMA.md  PROJECT_STRUCTURE.md  IMPLEMENTATION_PLAN.md
```

## 🚀 التشغيل محليًا
```bash
npm install
npm run dev                 # الواجهة: http://localhost:5173/rawi.html  (تعمل فورًا)

# (اختياري) لتفعيل التوليد والربط الحيّ:
cp .env.example .env        # املأ FIREBASE_SERVICE_ACCOUNT_JSON و GEMINI_API_KEY
npm run seed                # إعدادات + بيانات أولية في Firestore
npm run ai:generate 5       # يولّد 5 منشورات بالذكاء الاصطناعي
npm run ai:enc 3            # يولّد 3 مداخل موسوعة
```

## ☁️ النشر (مختصر — التفاصيل في DEPLOY.md)
1. **الواجهة → Vercel:** Output Directory = `public`. تعمل فورًا بلا أي مفتاح.
2. **القواعد → Firebase:** `npm run deploy:rules`.
3. **التوليد التلقائي → GitHub Actions:** أضف `FIREBASE_SERVICE_ACCOUNT_JSON` و`GEMINI_API_KEY`
   في Secrets، وسيعمل كل 6 ساعات (أو يدويًا من تبويب Actions).

## 🔐 المفاتيح
- إعداد Firebase **للويب** عام ومضمّن في `public/config.js` (لا حاجة لإضافته).
- الأسرار (Admin SDK + Gemini) **للمولّد فقط** — تُضاف في `.env` محليًا أو GitHub Secrets.
  لا أسرار داخل الكود. (`.env` مُستثنى من Git.)

## 🎨 الواجهة
- نظام تصميم فاخر: خلفية شفقية حيّة (Aurora)، Glassmorphism، ظلال ناعمة متعددة الطبقات،
  حركة نابضة (Spring)، طباعة Amiri/Cairo، وضع فاتح/داكن، تدرّج «ملكي» (عنابي + ذهبي معتق).
- +45 رسم SVG أصلي، Virtual Scroll، توليد بطاقات على الـ Canvas، PWA كاملة.

---
<div align="center"><sub>صُنع بشغفٍ للأدب العربي ✦</sub></div>
