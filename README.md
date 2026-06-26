<div align="center">

# 🪶 روي · RAWI

**منصة عربية اجتماعية وموسوعية للشعر والأدب** — بتجربة بمستوى TikTok / Instagram، ومحسّنة للبقاء ضمن خطة Firebase المجانية (Spark).

PWA (واجهة أولًا) · Firebase · 6 بوتات تيليجرام · Gemini AI

</div>

---

## ✨ نظرة عامة

روي تطبيق ويب تقدّمي (PWA) يقدّم تغذية أدبية على هيئة «كبسولات» شعرية، قصص يومية،
موسوعة أدبية قابلة للبحث، واستوديو لكتابة القصائد مع توليد بطاقات صور على جهاز المستخدم.
المحتوى يُولَّد ويُدار عبر **6 بوتات تيليجرام** متخصّصة مدعومة بـ **Gemini**، وكلها مُحسَّنة
لتقليل قراءات/كتابات Firestore (Zero-Cost).

> **الواجهة الأمامية هي المرجع الأساسي للمشروع** — كل قرار في الخلفية يخدم تجربة المستخدم.

## 🗂️ الهيكل
```
public/      الواجهة (PWA): rawi.html · app.js · sw.js · manifest · assets/ (شعار، أيقونات، رسومات، أنماط SVG)
server/      واجهة API (Express + Firebase Admin): feed/search/trend/fcm + Telegram webhook
bots/        6 خدمات بوتات + Gemini + طابور المهام + لوحة تحكم تيليجرام
shared/      botRegistry.js (تعريف البوتات الستة)
scripts/     serve · seed · set-webhooks · deploy-rules
firestore.rules · firestore.indexes.json · firebase.json
FINAL_ARCHITECTURE.md · DATABASE_SCHEMA.md · PROJECT_STRUCTURE.md · IMPLEMENTATION_PLAN.md
```

## 🤖 البوتات الستة (مختارة ومضبوطة)

| البوت | الدور | المسؤولية |
|------|------|-----------|
| 🪶 **الراوي** | Narrator | توليد القصائد/الاقتباسات عبر Gemini ووضعها في الطابور |
| ⚖️ **الناقد** | Critic | بوابة الجودة: تقييم (0..10) واعتماد/رفض قبل النشر |
| 📜 **الورّاق** | Scribe | بناء وإثراء الموسوعة (شعراء/مصطلحات/بحور) |
| 🛡️ **الحارس** | Guardian | الإشراف، البلاغات، الحظر الناعم، ملخّصات الإشعارات |
| 🏆 **الخازن** | Treasurer | المسابقات، الأوسمة، علم التحقيق من الدخل (Feature Flag) |
| 📈 **الخبير** | Analyst | الاتجاهات (current_trend) والتقارير اليومية |

> اختير 6 بوتات من 7 المتاحة (البوت السابع احتياطي). الأدوار موحّدة في `shared/botRegistry.js`.
> أسماء البوتات الفعلية في تيليجرام ثابتة (تُغيَّر عبر BotFather)، لكن **أدوارها** مضبوطة في الكود.
> تحكّم بكل شيء عبر تيليجرام: أرسل `/panel` للوحة الأزرار التفاعلية (Inline Keyboards).

## 🚀 التشغيل محليًا
```bash
cp .env.example .env          # املأ القيم (انظر «الأسرار» أدناه)
npm run install:all           # تثبيت تبعيات server + bots

npm run dev                   # الواجهة:  http://localhost:5173/rawi.html
npm run server                # الـ API:   http://localhost:8080/health
npm run bots                  # 6 بوتات (long-polling) — أرسل /panel في تيليجرام
npm run seed                  # (اختياري) بذر موسوعة + منشورات + إعدادات
```
> الواجهة تعمل فورًا حتى دون Firebase (وضع تجريبي ببيانات محلية كاملة)، لتجربة فورية.

## 🔐 الأسرار (مهم)
- **كل الأسرار عبر `process.env` فقط** — لا Hardcoded Secrets. `.env` مُستثنى من Git.
- الـ **Firebase Web config** عام بطبيعته (يُشحن مع العميل، محمي بـ Security Rules + App Check) وموجود في `public/config.js`.
- الأسرار الخادمية (Admin SDK، Gemini، Telegram tokens) **لا تُرفع إلى Git** — ضعها في `.env` محليًا، وفي لوحة البيئة عند النشر.
- ⚠️ **مفتاح Admin SDK الخاص**: لم يكن قابلًا للاستخراج الكامل من ملف الـ PDF (مقسّم على صفحات). الصق `private_key` الكامل في `FIREBASE_SERVICE_ACCOUNT_JSON` داخل `.env` لتفعيل البوتات/الخادم.

## ☁️ النشر
1. **القواعد:** `npm run deploy:rules` (يتطلب `firebase login`).
2. **الواجهة:** Vercel (مجلد `public` عبر `vercel.json`) أو `firebase deploy --only hosting`.
3. **الـ API:** Vercel (`server/vercel.json`) أو Render.
4. **البوتات:** Render Background Worker (`bots/render.yaml`).
   - long-polling افتراضيًا. للـ webhook: عيّن `PUBLIC_WEBHOOK_BASE` ثم `npm run webhooks:set`.
5. أضف كل الأسرار في Environment لكل خدمة.

## 🧠 قرارات هندسية (Zero-Cost) — لماذا
- **رسم البطاقات على الـ Canvas في العميل** بدل رفعها إلى Storage → توفير المساحة + فورية.
- **Virtual Scroll / DOM Recycling** (≈10 بطاقات في DOM) → 60fps وذاكرة ثابتة.
- **بحث بالتوكنات** (`searchTokens` + `array-contains`) بدل Full-Text المدفوع.
- **عدّادات مجمّعة (±1)** + **serverTimestamp** + **Cursor Pagination** لتقليل العمليات.
- **Read-Only Kill Switch** (`config/system.readOnly`) لإيقاف الكتابة فورًا عند الطوارئ.
- **Feature Flags** (`config/flags.monetizationEnabled`) لتفعيل ميزات دون نشر جديد.

## 🎨 الهوية البصرية
أكثر من **20 رسمًا متجهًا (SVG)** أصليًا داخل `public/assets/` (شعار، أيقونات الأقسام والتفاعل،
رسومات الحالات الفارغة/الخطأ/التحميل، أنماط زخرفية عربية، فواصل) — خفيفة، قابلة لإعادة الاستخدام،
ومتوافقة مع الوضعين الفاتح والداكن عبر `currentColor`.

---
<div align="center"><sub>صُنع بشغفٍ للأدب العربي ✦</sub></div>
