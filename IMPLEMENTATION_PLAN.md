# خطة التنفيذ — روي (RAWI)

بنية مبسّطة: **واجهة + Firebase + مولّد ذكاء اصطناعي**. لا خادم دائم، لا بوتات.

## ما هو مُنجَز ✅
1. **الواجهة (PWA)** `public/rawi.html` + `app.js`:
   - 7 شاشات، وضع فاتح/داكن، خطوط Amiri/Cairo، Virtual Scroll، رسم Canvas، PWA.
   - نظام تصميم فاخر: Aurora حيّة، Glassmorphism، ظلال ناعمة، حركة Spring، تدرّج «ملكي».
   - **مربوطة بـ Firebase**: تقرأ المنشورات/الموسوعة/الاتجاه حيًّا، وتكتب النشر/الإعجاب.
   - رجوع آمن لبيانات محلية عند غياب Firebase (تعمل دائمًا).
2. **الهوية البصرية**: +45 رسم SVG أصلي + `home-feed.html` (عرض نظام التصميم).
3. **المولّد** `scripts/ai-generate.js`: Gemini → Firestore (شعر/اقتباس/حكمة/موسوعة)
   مع رجوع لمعجم تراثي عند غياب المفتاح.
4. **الأتمتة** `.github/workflows/ai-generate.yml`: تشغيل تلقائي كل 6 ساعات (مجاني).
5. **Firebase**: `firestore.rules` + `firestore.indexes.json` + `firebase.json`.

## كيفية التشغيل
```bash
npm install
npm run dev                 # الواجهة: http://localhost:5173/rawi.html
cp .env.example .env        # (اختياري) لتفعيل Firebase/Gemini
npm run seed                # بيانات أولية
npm run ai:generate 5       # توليد 5 منشورات
```

## النشر
1. الواجهة → Vercel (Output Directory: `public`).
2. القواعد → `npm run deploy:rules`.
3. التوليد → GitHub Actions Secrets (`FIREBASE_SERVICE_ACCOUNT_JSON`, `GEMINI_API_KEY`).

التفاصيل الكاملة في `DEPLOY.md`.

## قرارات معدّلة عن النسخة السابقة (مع السبب)
- **حُذف الخادم والبوتات الستة:** تعقيد غير ضروري. استُبدل بمولّد واحد + Actions (أبسط، أرخص، أوضح).
- **الواجهة تتصل بـ Firestore مباشرة:** لا حاجة لطبقة API وسيطة لقراءة المحتوى.
