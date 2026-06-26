#!/usr/bin/env node
/* ======================================================================
 *  روي (RAWI) — المولّد الوحيد: الذكاء الاصطناعي يسحب ويصيغ، ثم يحفظ في Firebase.
 *  لا خادم ولا بوتات — ملف واحد بسيط.
 *
 *  الاستخدام:
 *    node scripts/ai-generate.js            → يولّد 3 منشورات (شعر/اقتباس/حكمة)
 *    node scripts/ai-generate.js 5          → يولّد 5 منشورات
 *    node scripts/ai-generate.js enc 3      → يولّد 3 مداخل موسوعة
 *    node scripts/ai-generate.js seed       → يكتب الإعدادات + بيانات أولية مرة واحدة
 *
 *  المتغيّرات (من .env أو بيئة GitHub Actions):
 *    FIREBASE_SERVICE_ACCOUNT_JSON  (إلزامي)
 *    GEMINI_API_KEY                 (اختياري — بدونه يستخدم معجمًا تراثيًا مختارًا)
 *    GEMINI_MODEL                   (افتراضي: gemini-2.0-flash)
 * ==================================================================== */
'use strict';
try { require('dotenv').config(); } catch {}
const admin = require('firebase-admin');

/* ---------- Firebase ---------- */
function db() {
  if (admin.apps.length) return admin.firestore();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) { console.error('✗ FIREBASE_SERVICE_ACCOUNT_JSON غير مضبوط.'); process.exit(1); }
  const svc = JSON.parse(raw);
  if (svc.private_key && svc.private_key.includes('\\n')) svc.private_key = svc.private_key.replace(/\\n/g, '\n');
  admin.initializeApp({ credential: admin.credential.cert(svc), projectId: svc.project_id });
  const d = admin.firestore(); d.settings({ ignoreUndefinedProperties: true }); return d;
}
const FieldValue = admin.firestore.FieldValue;
const now = () => FieldValue.serverTimestamp();

/* ---------- Gemini (مع إعادة محاولة + Fallback) ---------- */
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const KEY = process.env.GEMINI_API_KEY || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gemini(prompt, temperature = 0.95) {
  if (!KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: 800, topP: 0.95 } }) });
      if (res.status === 429 || res.status >= 500) throw new Error('retry/' + res.status);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      const m = text.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    } catch (e) { await sleep(2 ** i * 1000); }
  }
  return null;
}

/* ---------- أدوات ---------- */
const STOP = new Set(['في','من','على','عن','إلى','أن','إن','ما','لا','و','هو','هي','قد','هذا','هذه','التي','الذي','مع','كل']);
const tokenize = (...p) => [...new Set(p.filter(Boolean).join(' ').toLowerCase()
  .replace(/[^؀-ۿ\s\w]/g, ' ').split(/\s+/).map((w) => w.replace(/^[الـ]+/, ''))
  .filter((w) => w.length >= 2 && !STOP.has(w)))].slice(0, 40);

const THEMES = ['malaki', 'ink', 'sahra', 'rawdah', 'toot', 'layl', 'ward', 'bahr', 'turab'];
const TOPICS = ['الحكمة', 'العزّة والفخر', 'الصبر', 'الغزل العفيف', 'الوطن', 'العلم والمعرفة', 'الأمل', 'الزهد', 'الكرم', 'الصداقة'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* معجم احتياطي عند غياب Gemini (لا يفشل المولّد أبدًا) */
const CORPUS = [
  { type:'poem', title:'في العزم', meter:'الطويل', tags:['حكمة','فخر'],
    body:'على قدرِ أهلِ العزمِ تأتي العزائمُ\nوتأتي على قدرِ الكرامِ المكارمُ' },
  { type:'quote', title:'', meter:'', tags:['علم'],
    body:'العلمُ يرفعُ بيتًا لا عمادَ لهُ\nوالجهلُ يهدمُ بيتَ العزِّ والشرفِ' },
  { type:'poem', title:'الصبر', meter:'الوافر', tags:['صبر'],
    body:'دعِ الأيامَ تفعلُ ما تشاءُ\nوطِبْ نفسًا إذا حكمَ القضاءُ' },
  { type:'story', title:'حكمة', meter:'', tags:['حكمة'],
    body:'قيلَ لحكيمٍ: ما الغِنى؟ قال: قِلّةُ تمنّيك، ورِضاك بما يكفيك.' },
];

/* ---------- توليد منشور ---------- */
async function genPost() {
  const topic = pick(TOPICS);
  const type = Math.random() < 0.35 ? 'quote' : 'poem';
  const prompt = `أنت شاعر عربي فصيح. أنشئ ${type === 'quote' ? 'بيتين من الحكمة' : 'مقطوعة شعرية من 4 أبيات'} `
    + `في موضوع «${topic}» بلغة فصيحة سليمة بلا أخطاء. أرجع JSON فقط: `
    + `{"type":"poem|quote","title":"عنوان قصير","meter":"اسم البحر","body":"النص مع \\n بين الأبيات","tags":["وسم","وسم"]}`;
  const ai = await gemini(prompt) || pick(CORPUS);
  const post = {
    type: ai.type || type,
    title: (ai.title || '').slice(0, 60),
    body: (ai.body || '').slice(0, 600),
    meter: ai.meter || '',
    tags: Array.isArray(ai.tags) ? ai.tags.slice(0, 5) : [topic],
    theme: { id: pick(THEMES) },
    author: { username: 'rawi_ai', displayName: 'روي · الراوي', badges: ['verified'], avatar: '' },
    authorId: 'system_rawi',
    searchTokens: tokenize(ai.title, ai.body, topic),
    counts: { likes: 0, comments: 0, bookmarks: 0, views: 0, shares: 0 },
    source: KEY ? 'ai:gemini' : 'ai:fallback',
    status: 'published', isFeatured: false, isDeleted: false,
    createdAt: now(), updatedAt: now(),
  };
  const ref = await db().collection('posts').add(post);
  console.log(`  ✓ منشور [${post.type}] «${post.title || post.body.slice(0, 20)}…» (${post.source}) → ${ref.id}`);
}

/* ---------- توليد مدخل موسوعة ---------- */
async function genEnc() {
  const subjects = [['poet','شاعر عربي'],['term','مصطلح بلاغي'],['meter','بحر شعري'],['era','عصر أدبي']];
  const [kind] = pick(subjects);
  const prompt = `اكتب مدخل موسوعة عربية أدبية (نوع: ${kind}). أرجع JSON فقط: `
    + `{"title":"","summary":"سطر","body":"فقرة 3-4 أسطر","era":"الحقبة","kind":"${kind}"}`;
  const ai = await gemini(prompt, 0.6);
  if (!ai || !ai.title) { console.log('  … تخطّي مدخل (لا ناتج)'); return; }
  const entry = {
    kind: ai.kind || kind, title: ai.title.slice(0, 80),
    summary: (ai.summary || '').slice(0, 160), body: (ai.body || '').slice(0, 1200),
    era: ai.era || '', searchTokens: tokenize(ai.title, ai.summary, ai.body, ai.era),
    views: 0, source: 'ai:gemini', createdAt: now(), updatedAt: now(),
  };
  const ref = await db().collection('encyclopedia').add(entry);
  console.log(`  ✓ موسوعة «${entry.title}» → ${ref.id}`);
}

/* ---------- بذر أولي ---------- */
async function seed() {
  const d = db();
  await d.collection('config').doc('system').set({ readOnly: false, maintenance: false, minVersion: '1.0.0' }, { merge: true });
  await d.collection('config').doc('flags').set({ monetizationEnabled: false, ambientAudio: true }, { merge: true });
  await d.collection('config').doc('current_trend').set({ topic: 'الحكمة في الشعر', tags: ['#حكمة', '#شعر'], updatedAt: now() }, { merge: true });
  console.log('  ✓ الإعدادات (config)');
  for (const c of CORPUS) {
    await d.collection('posts').add({ ...c, theme: { id: pick(THEMES) },
      author: { username: 'rawi_ai', displayName: 'روي · الراوي', badges: ['verified'] }, authorId: 'system_rawi',
      searchTokens: tokenize(c.title, c.body), counts: { likes: 88, comments: 4, bookmarks: 21, views: 1500, shares: 3 },
      source: 'seed', status: 'published', isFeatured: false, isDeleted: false, createdAt: now(), updatedAt: now() });
  }
  console.log(`  ✓ ${CORPUS.length} منشورات أولية`);
}

/* ---------- main ---------- */
(async () => {
  const arg = process.argv[2];
  console.log(`🪶 روي — المولّد (${KEY ? 'Gemini' : 'وضع احتياطي بلا مفتاح'})`);
  try {
    if (arg === 'seed') { await seed(); }
    else if (arg === 'enc') { const n = +process.argv[3] || 3; for (let i = 0; i < n; i++) await genEnc(); }
    else { const n = +arg || 3; for (let i = 0; i < n; i++) await genPost(); }
    console.log('✅ تم.');
    process.exit(0);
  } catch (e) { console.error('✗ خطأ:', e.message); process.exit(1); }
})();
