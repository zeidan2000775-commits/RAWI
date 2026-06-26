# المعمارية النهائية — منصة روي (RAWI)

> منصة عربية اجتماعية + موسوعية للأدب والشعر، تعمل بأسلوب TikTok / Instagram،
> ومحسّنة بالكامل للبقاء ضمن خطة **Firebase Spark المجانية**.
> **الواجهة الأمامية هي المرجع الأساسي** — كل قرار في الخلفية يخدم تجربة المستخدم.

---

## 1. نظرة عامة

| الطبقة | التقنية | الاستضافة |
|--------|---------|-----------|
| Front-End (PWA) | HTML5 + CSS3 + Vanilla JS + Firebase Web SDK (modular, CDN) | Vercel / Firebase Hosting |
| API | Node.js + Express + Firebase Admin SDK | Render / Vercel |
| Bots (×6) | Telegram Bot API + Gemini | Render (worker) |
| Database | Cloud Firestore (NoSQL) | Firebase |
| Auth | Firebase Auth (Google / Email) | Firebase |
| Push | Firebase Cloud Messaging (FCM) | Firebase |
| AI | Gemini API (`gemini-2.0-flash`) | Google |
| Security | Firestore Security Rules + App Check | Firebase |

**الأسرار:** جميعها عبر `process.env` فقط. لا Hardcoded Secrets. (الـ Firebase *web config*
عام بطبيعته ويُحمى بـ Security Rules + App Check.)

---

## 2. فلسفة Zero-Cost (لماذا هذه القرارات)

تم اعتماد القرارات الهندسية التالية تحديدًا لإبقاء الاستهلاك ضمن حدود Spark المجانية،
**دون أي تنازل عن تجربة المستخدم**:

1. **Client-Side Canvas Rendering** — تُولَّد بطاقات القصص/الأبيات كصور على جهاز المستخدم
   عبر `<canvas>` + `OffscreenCanvas`، ولا تُرفع إلى Firebase Storage. يوفّر مساحة التخزين
   بالكامل ويجعل التحرير فوريًا (0 تكلفة تخزين، 0 زمن رفع).
2. **DOM Recycling / Virtual Scroll** — يبقى في DOM ~10 بطاقات فقط مهما طال التمرير،
   ما يحافظ على 60fps واستهلاك ذاكرة ثابت.
3. **Tokenized Search (Array `contains`)** — بدل قراءة كل الوثائق، نخزّن مصفوفة كلمات مفتاحية
   (`searchTokens`) ونستعلم بـ `array-contains` لتقليل القراءات.
4. **Batched Counters** — التفاعلات (إعجاب/مشاهدة) تُجمَّع وتُكتب دفعة واحدة (FieldValue.increment)
   لتفادي سباق الكتابة (Race Condition) وتقليل عمليات الكتابة.
5. **Offline Caching + Service Worker** — قراءة أولى من الكاش (App Shell) ثم تحديث،
   لتقليل القراءات المتكررة.
6. **Cursor Pagination (`startAfter`)** بدل `offset` لتفادي قراءة الوثائق المتجاوَزة.
7. **Trend Doc واحدة** (`config/current_trend`) يقرؤها كل البوتات بدل استعلامات متعددة.

## 3. خط أنابيب المحتوى (Data Pipeline)

```
[Telegram Admin] → /generate → بوت الراوي
        │
        ▼
  pending_tasks (Firestore queue)  ←──────────────┐
        │                                          │
        ▼                                          │
  بوت الراوي يسحب المهمة → Gemini → تنسيق Output   │
        │                                          │
        ▼                                          │
  بوت الناقد يقيّم الجودة (score ≥ 7؟) ─── لا ──────┘ (إعادة توليد)
        │ نعم
        ▼
  posts / encyclopedia (published) → FCM Broadcast
```

كل بوت = Micro-service مستقل بطابور مهام خاص. يتواصلون عبر Firestore (لا حالة مشتركة في الذاكرة).

## 4. البوتات الستة (الأدوار)

| البوت | الدور | المسؤوليات |
|-------|------|------------|
| **الراوي** | Narrator | توليد القصص/الأبيات عبر Gemini، التنسيق، النشر في الطابور |
| **الحارس** | Guardian | الإشراف، تجميع البلاغات (Notification Digests)، الحظر الناعم (`isShadowBanned`) |
| **الوراق** | Scribe | بناء وإثراء الموسوعة (الشعراء/المصطلحات)، الأرشفة الباردة |
| **الناقد** | Critic | تقييم جودة المحتوى المُولَّد قبل النشر (Quality Gate) |
| **الخازن** | Treasurer | المسابقات، توزيع الأوسمة/الشارات، علم `MONETIZATION_ENABLED` |
| **الخبير** | Analyst | تحليل الاتجاهات، تحديث `current_trend`، التقارير اليومية |

البوت السابع المتاح (`@The_Heraald_Bot`) **غير مُستخدم** (احتياطي).

## 5. الأمان (Security)

- **Firestore Security Rules** — الكتابة تتطلب `request.auth != null`، والعدّادات لا تُعدَّل من العميل
  إلا عبر `increment(±1)`، والحقول الحسّاسة (`isVerified`, `badges`, `role`) للخادم فقط.
- **App Check (reCAPTCHA v3)** — يمنع إساءة استخدام API من خارج التطبيق.
- **serverTimestamp()** دائمًا للوقت (لا توقيت العميل).
- **Rate Limiting** — حد النشر 15 منشورًا/يوم، 100 إعجاب/يوم (يُفرض في Rules + الخادم).
- **Input Sanitization** — تعقيم HTML ومنع XSS قبل العرض/التخزين.
- **Read-Only Kill Switch** (`KILL_SWITCH` / `config/system.readOnly`) — يوقف الكتابة فورًا عند الطوارئ.

## 6. الواجهة الأمامية (المرجع)

PWA بملف `public/rawi.html`، إطار جوال `max-width: 480px` مُتمركز على الديسكتوب. الشاشات:
`onboarding` · `stories` (قصص يومية، Canvas/Carousel) · `home` (تغذية كبسولات عمودية + Virtual Scroll)
· `explore` (الموسوعة + بحث) · `studio` (محرّك القصائد + محرّر Canvas) · `profile` (شرائح مكدّسة + أوسمة)
· `settings`. تفاصيلها في `PROJECT_STRUCTURE.md` و`IMPLEMENTATION_PLAN.md`.

## 7. التوسّع (Scalability)

- البنية متعددة الخدمات تسمح بترقية أي بوت أو الـ API بشكل مستقل.
- الانتقال إلى Blaze plan لاحقًا لا يتطلب تغيير المعمارية (فقط رفع الحدود).
- Feature Flags (`MONETIZATION_ENABLED`) تتيح تفعيل ميزات دون نشر جديد.
