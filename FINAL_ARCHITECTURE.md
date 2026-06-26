# المعمارية النهائية — منصة روي (RAWI)

> منصة عربية للشعر والأدب، **واجهة أولًا**، مربوطة بـ Firebase، ومحتواها يُولّده
> ويصيغه الذكاء الاصطناعي (Gemini). **بنية بسيطة: بلا خادم دائم وبلا بوتات.**

## 1. المكوّنات الثلاثة

```
┌────────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  Gemini (يسحب       │ ──► │  Firebase Firestore  │ ──► │  الواجهة (PWA)        │
│  ويصيغ المحتوى)     │     │  (مجاني — Spark)     │     │  تقرأ مباشرة          │
│  scripts/ai-generate│     │  posts/encyclopedia  │     │  public/rawi.html     │
└────────────────────┘     └─────────────────────┘     └──────────────────────┘
        ▲                                                        │
        │ GitHub Actions (cron مجاني)                            │ نشر/إعجاب (Firebase Auth مجهول)
        └────────────────────────────────────────────────────────┘
```

| الطبقة | التقنية | الاستضافة |
|--------|---------|-----------|
| الواجهة (PWA) | HTML + CSS + Vanilla JS + Firebase Web SDK | Vercel / Firebase Hosting |
| قاعدة البيانات | Cloud Firestore | Firebase (Spark) |
| المصادقة | Firebase Auth (Anonymous / Google) | Firebase |
| التوليد | Node + Gemini + Firebase Admin (ملف واحد) | GitHub Actions (cron) |
| الأمان | Firestore Security Rules | Firebase |

## 2. لماذا هذه البساطة
- **حُذف الخادم الدائم والبوتات الستة والطوابير** — كانت تعقيدًا غير ضروري.
- التوليد = مهمة مجدولة تعمل لدقائق ثم تتوقف (لا تكلفة استضافة، ضمن المجاني).
- الواجهة تتصل بـ Firestore مباشرة (قراءة عامة) — لا حاجة لطبقة API وسيطة.

## 3. خط أنابيب المحتوى
1. GitHub Actions يشغّل `scripts/ai-generate.js` كل 6 ساعات (أو يدويًا).
2. الملف يطلب من Gemini توليد قصيدة/اقتباس/حكمة منسّقة (JSON)، ويولّد `searchTokens`.
3. يكتبها في `posts` (status=published) عبر Admin SDK.
4. الواجهة تقرأ أحدث المنشورات حيًّا (Cursor Pagination) وتعرضها كبطاقات.
- **بلا مفتاح Gemini:** يستخدم معجمًا تراثيًا مختارًا (لا يفشل أبدًا).

## 4. قرارات Zero-Cost (تخدم الواجهة)
- **رسم بطاقات النص على الـ Canvas في العميل** بدل رفعها إلى Storage.
- **Virtual Scroll / DOM Recycling** (≈12 بطاقة) لأداء 60fps وذاكرة ثابتة.
- **بحث بالتوكنات** (`searchTokens` + `array-contains`) بدل بحث مدفوع.
- **عدّادات increment(±1)** + **serverTimestamp** + **Cursor Pagination**.
- **Read-Only Kill Switch** (`config/system.readOnly`) لإيقاف الكتابة عند الطوارئ.

## 5. الأمان
- قراءة المحتوى المنشور عامة؛ الكتابة تتطلب تسجيل دخول (Anonymous/Google).
- الحقول الحسّاسة (`role`, `badges`, `isVerified`) لا تُعدَّل من العميل.
- المولّد يكتب عبر Admin SDK (يتجاوز القواعد بأمان من بيئة موثوقة).
- كل الأسرار عبر متغيّرات البيئة — لا Hardcoded Secrets.
