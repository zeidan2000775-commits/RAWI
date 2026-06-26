# خطة التنفيذ — روي (RAWI)

أربع مراحل. كل مرحلة Production-Ready (لا TODO، لا placeholder).

## PHASE 1 — FOUNDATION ✅
- هيكل المشروع، الأسرار عبر `.env`، `.gitignore`.
- وثائق المعمارية الأربع.
- **الواجهة الأمامية الكاملة** `public/rawi.html` (الأولوية): App Shell، الثيمات (فاتح/داكن)،
  الخطوط (Amiri/Cairo/Playfair/Inter)، التنقّل، كل الشاشات السبع، PWA (manifest + sw.js).
- الهوية البصرية: **+20 ملف SVG** أصلي (شعار، أيقونات، رسومات حالات، أنماط، زخارف).
- `firestore.rules` + `firestore.indexes.json` + `firebase.json`.

## PHASE 2 — CONTENT & AI ✅
- `server/` : Express API (health, feed, search, fcm, appcheck) + Gemini client (مع Fallback وKill Switch).
- خط أنابيب المحتوى: `pending_tasks` queue + قفل تشاؤمي.
- بوت **الراوي** (توليد) + بوت **الناقد** (بوابة جودة) + بوت **الوراق** (إثراء الموسوعة).

## PHASE 3 — SOCIAL ✅
- بوت **الحارس** (إشراف/بلاغات/Digests) + بوت **الخازن** (مسابقات/أوسمة/Feature Flag)
  + بوت **الخبير** (اتجاهات/تحليلات).
- لوحة تحكم Telegram (`adminPanel.js`) بأزرار Inline.
- إشعارات FCM (Broadcast عند نشر محتوى جديد).

## PHASE 4 — PRODUCTION ✅
- إعداد النشر: `vercel.json` (الواجهة + API)، `render.yaml` (البوتات).
- سكربتات: `set-webhooks.js`, `seed.js`, `deploy-rules.sh`.
- README شامل بخطوات التشغيل والنشر خطوة بخطوة.

---

## كيفية التشغيل (محليًا)
```bash
cp .env.example .env        # ثم املأ القيم
npm install                 # الجذر (أدوات)
npm --prefix server install
npm --prefix bots install

npm run dev                 # الواجهة على http://localhost:5173/rawi.html
npm --prefix server start   # API على :8080
npm --prefix bots start     # 6 بوتات (long-polling)
```

## النشر
1. **القواعد:** `firebase deploy --only firestore:rules,firestore:indexes`
2. **الواجهة:** اربط المستودع بـ Vercel (مجلد `public`) أو `firebase deploy --only hosting`.
3. **API:** Vercel (`server/vercel.json`) أو Render.
4. **البوتات:** Render Background Worker (`bots/render.yaml`)، ثم `node scripts/set-webhooks.js`.
5. أضف كل الأسرار في لوحة البيئة (Environment) لكل خدمة — لا تضعها في الكود.

## قرارات هندسية معدّلة عن المواصفات (مع السبب)
- **تخزين الصور:** أُلغي رفع الصور إلى Storage؛ التوليد على الـ Canvas في العميل (توفير مساحة + فورية).
- **البحث:** بدل Full-Text Search مدفوع، استخدمنا `searchTokens` + `array-contains` (مجاني ضمن Spark).
- **عدد البوتات:** اختير 6 من 7 المتاحة؛ السابع احتياطي. الأسماء أُعيدت لأدوار وظيفية واضحة.
