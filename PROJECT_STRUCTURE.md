# هيكل المشروع — روي (RAWI)

```
RAWI/
├── public/                      # الواجهة الأمامية (PWA) — تقرأ مباشرة من Firebase
│   ├── rawi.html                # التطبيق كاملًا (App Shell + كل الشاشات + الأنماط)
│   ├── app.js                   # المنطق: طبقة بيانات Firebase + الشاشات + Canvas + Virtual Scroll
│   ├── home-feed.html           # شاشة Home Feed مستقلّة (عرض نظام التصميم الفاخر)
│   ├── manifest.webmanifest     # بيان PWA
│   ├── sw.js                    # Service Worker (Offline Caching)
│   ├── config.js                # إعداد Firebase العام (للويب)
│   └── assets/                  # +45 رسم SVG أصلي
│       ├── brand/ icons/ illustrations/ patterns/
│
├── scripts/
│   ├── ai-generate.js           # ⭐ المولّد الوحيد: Gemini → Firebase (يسحب ويصيغ ويحفظ)
│   ├── serve.js                 # خادم ساكن للتطوير المحلي
│   └── deploy-rules.sh          # نشر Security Rules + Indexes
│
├── .github/workflows/
│   └── ai-generate.yml          # تشغيل المولّد تلقائيًا (cron كل 6 ساعات)
│
├── firebase.json                # إعداد Hosting + Firestore
├── firestore.rules              # قواعد الأمان
├── firestore.indexes.json       # الفهارس المركّبة
├── vercel.json  .vercelignore   # نشر الواجهة على Vercel
├── package.json                 # السكربتات + تبعيتان فقط (firebase-admin, dotenv)
├── .env.example                 # قالب المفاتيح (للمولّد)
└── *.md                         # الوثائق + DEPLOY.md
```

## أين يُشغَّل كل شيء؟
| المكوّن | محليًا | الإنتاج |
|---------|--------|---------|
| الواجهة | `npm run dev` (:5173) | Vercel / Firebase Hosting |
| المولّد | `npm run ai:generate` | GitHub Actions (cron) |
| القواعد | `npm run deploy:rules` | Firebase |

> لا يوجد خادم API دائم ولا بوتات — الواجهة تتصل بـ Firestore مباشرة عبر Firebase Web SDK،
> والمولّد يكتب المحتوى عبر Firebase Admin SDK.
