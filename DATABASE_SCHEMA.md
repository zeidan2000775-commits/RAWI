# مخطط قاعدة البيانات — Firestore (روي)

> مُصمَّم لتقليل القراءات/الكتابات (Spark plan). كل مجموعة مُسطّحة (Flattened) قدر الإمكان،
> مع denormalization مدروس لتفادي الانضمامات (joins) المكلفة.

## اصطلاحات
- المعرّفات: `camelCase` للحقول.
- الوقت: `serverTimestamp()` فقط (`createdAt`, `updatedAt`).
- الحذف: ناعم (`isDeleted: true`) + `deletedAt`.

---

## `users/{uid}`
```jsonc
{
  "uid": "string",
  "username": "string",          // فريد، يُحجز في usernames/
  "displayName": "string",
  "bio": "string",               // ≤ 250 حرف
  "avatar": {                    // أفاتار SVG مولّد (≤ 600 بايت) — لا تخزين صور
    "seed": "string",
    "bg": "#hex", "fg": "#hex"
  },
  "role": "user|moderator|admin",     // الخادم فقط
  "badges": ["poet","verified","vip"],// ≤ 4 ظاهرة — الخادم فقط
  "isVerified": false,                // الخادم فقط
  "isShadowBanned": false,            // الحارس فقط
  "counts": { "posts": 0, "followers": 0, "following": 0, "likes": 0 },
  "fcmTokens": ["..."],
  "createdAt": "ts", "updatedAt": "ts"
}
```

## `usernames/{usernameLower}`  (حجز الأسماء الفريدة — Strict Onboarding)
```jsonc
{ "uid": "string", "createdAt": "ts" }
```

## `posts/{postId}`   (كبسولات التغذية: شعر/قصة/اقتباس)
```jsonc
{
  "id": "string",
  "authorId": "uid",
  "author": { "username":"", "displayName":"", "avatar":{}, "badges":[] }, // denormalized
  "type": "poem|story|quote",
  "title": "string",
  "body": "string",              // النص (RTL)
  "meter": "string|null",        // البحر الشعري (للقصائد)
  "theme": { "id":"ink", "palette":["#.."] }, // ثيم البطاقة لرسم Canvas
  "tags": ["string"],
  "searchTokens": ["string"],    // للبحث array-contains
  "counts": { "likes":0, "comments":0, "bookmarks":0, "views":0, "shares":0 },
  "source": "user|bot:rawi",
  "qualityScore": 0,             // من بوت الناقد (0..10)
  "status": "published|pending|rejected",
  "isFeatured": false,           // Feature Flag للمميّز
  "isDeleted": false,
  "createdAt": "ts", "updatedAt": "ts"
}
```

## `posts/{postId}/comments/{commentId}`
```jsonc
{ "authorId":"uid", "author":{}, "body":"", "likes":0, "isDeleted":false, "createdAt":"ts" }
```

## `posts/{postId}/likes/{uid}`   (وجود الوثيقة = إعجاب — يمنع الغش)
```jsonc
{ "createdAt": "ts" }
```

## `users/{uid}/bookmarks/{postId}` · `users/{uid}/following/{targetUid}`
```jsonc
{ "createdAt": "ts", "snapshot": { "title":"", "type":"" } } // bookmarks denormalized
```

## `stories/{storyId}`   (القصص اليومية — Carousel)
```jsonc
{
  "authorId":"uid", "author":{},
  "kind":"daily|user",
  "verse":"string", "attribution":"string",
  "theme":{ "palette":["#.."], "pattern":"arabesque-1" },
  "expiresAt":"ts",             // 24h (TTL منطقي)
  "views":0, "createdAt":"ts"
}
```

## `encyclopedia/{entryId}`   (الموسوعة: شعراء/مصطلحات/بحور)
```jsonc
{
  "id":"string",
  "kind":"poet|term|meter|era",
  "title":"string",
  "summary":"string",
  "body":"string",             // Markdown مبسّط
  "era":"string",
  "searchTokens":["string"],
  "related":["entryId"],
  "views":0,
  "source":"bot:warraq",
  "createdAt":"ts", "updatedAt":"ts"
}
```

## `notifications/{uid}/items/{notifId}`
```jsonc
{ "type":"like|comment|follow|badge|system", "actor":{}, "postId":"", "read":false, "createdAt":"ts" }
```

## `pending_tasks/{taskId}`   (طابور البوتات — Task Queue)
```jsonc
{
  "type":"generate_post|review|enrich|digest|trend",
  "assignee":"rawi|naqid|warraq|haris|khazin|khabir",
  "status":"queued|processing|done|failed",
  "payload":{ "...":"..." },
  "attempts":0,
  "lockedBy":"string|null", "lockedAt":"ts|null", // قفل تشاؤمي بسيط
  "createdAt":"ts", "updatedAt":"ts"
}
```

## `config/{docId}`   (إعدادات عامة — وثيقة واحدة لكل مفتاح)
```jsonc
// config/system
{ "readOnly": false, "minVersion":"1.0.0", "maintenance": false }
// config/flags
{ "monetizationEnabled": false, "ambientAudio": true, "premiumBadges": false }
// config/current_trend  (يحدّثها الخبير)
{ "topic":"الغزل", "tags":["..."], "updatedAt":"ts" }
```

## `reports/{reportId}`   (بلاغات → الحارس)
```jsonc
{ "targetType":"post|comment|user", "targetId":"", "reporterId":"uid",
  "reason":"", "status":"open|resolved", "createdAt":"ts" }
```

## `rate_limits/{uid}_{yyyymmdd}`   (الحدود اليومية)
```jsonc
{ "posts":0, "likes":0, "comments":0 }
```

---

## الفهارس المركّبة (انظر `firestore.indexes.json`)
- `posts`: `status ==` + `createdAt desc`  (التغذية)
- `posts`: `type ==` + `createdAt desc`
- `posts`: `searchTokens array-contains` + `createdAt desc`
- `posts`: `authorId ==` + `createdAt desc`  (الملف الشخصي)
- `encyclopedia`: `kind ==` + `title asc`
- `pending_tasks`: `assignee ==` + `status ==` + `createdAt asc`
