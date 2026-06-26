# هيكل المشروع — روي (RAWI)

```
RAWI/
├── public/                      # الواجهة الأمامية (PWA) — الأولوية القصوى
│   ├── rawi.html                # التطبيق كاملًا (App Shell + كل الشاشات)
│   ├── manifest.webmanifest     # بيان PWA (التثبيت على الهاتف)
│   ├── sw.js                    # Service Worker (Offline Caching / App Shell)
│   ├── config.js                # إعداد Firebase العام (يُحقن من .env عبر build أو يدويًا)
│   └── assets/
│       ├── brand/               # الشعار والهوية (SVG)
│       │   ├── logo.svg  logo-mark.svg  logo-wordmark.svg  splash.svg
│       ├── icons/               # أيقونات الأقسام والتفاعل (SVG sprite + مفردة)
│       │   ├── sprite.svg       # كل الأيقونات كـ <symbol> (أداء)
│       │   └── *.svg            # نسخ مفردة قابلة لإعادة الاستخدام
│       ├── illustrations/       # رسومات الحالات (فارغة/خطأ/ترحيب)
│       │   ├── empty-feed.svg  empty-search.svg  error-500.svg  offline.svg  welcome.svg
│       └── patterns/            # خلفيات وزخارف عربية + Patterns
│           ├── arabesque.svg  geometric.svg  divider.svg  ...
│
├── server/                      # الـ API (Node + Express + Firebase Admin)
│   ├── package.json
│   ├── vercel.json
│   └── src/
│       ├── index.js             # نقطة الدخول (Express app)
│       ├── lib/
│       │   ├── firebaseAdmin.js # تهيئة Admin SDK من process.env
│       │   ├── gemini.js        # عميل Gemini + إعادة المحاولة + Fallback
│       │   └── rateLimit.js     # حدود الطلبات + Kill Switch
│       └── routes/
│           ├── health.js  feed.js  search.js  fcm.js  appcheck.js
│
├── bots/                        # 6 خدمات بوتات Telegram
│   ├── package.json
│   ├── render.yaml              # نشر العمّال على Render
│   └── src/
│       ├── index.js             # مشغّل كل البوتات (long-poll أو webhook)
│       ├── lib/
│       │   ├── telegram.js      # غلاف Telegram Bot API (بدون تبعيات ثقيلة)
│       │   ├── firebaseAdmin.js
│       │   ├── gemini.js
│       │   └── queue.js         # سحب/قفل مهام pending_tasks
│       └── bots/
│           ├── rawi.js   haris.js  warraq.js  naqid.js  khazin.js  khabir.js
│           └── adminPanel.js    # لوحة تحكم Telegram (Inline Keyboards)
│
├── shared/
│   └── botRegistry.js           # تعريف البوتات الستة وأدوارها (مصدر واحد للحقيقة)
│
├── scripts/
│   ├── set-webhooks.js          # ضبط/حذف webhooks للبوتات
│   ├── seed.js                  # بذر بيانات أولية (موسوعة + منشورات تجريبية)
│   └── deploy-rules.sh          # نشر Security Rules + Indexes
│
├── firebase.json  firestore.rules  firestore.indexes.json
├── FINAL_ARCHITECTURE.md  DATABASE_SCHEMA.md  PROJECT_STRUCTURE.md  IMPLEMENTATION_PLAN.md
├── .env.example  .gitignore  README.md  package.json
```

## أين يُشغَّل كل شيء؟
| المكوّن | محليًا | الإنتاج |
|---------|--------|---------|
| الواجهة | `npm run dev` (خادم ساكن على :5173) | Vercel / Firebase Hosting |
| الـ API | `npm --prefix server start` (:8080) | Vercel / Render |
| البوتات | `npm --prefix bots start` | Render (Background Worker) |
| القواعد | `firebase deploy --only firestore` | Firebase |
