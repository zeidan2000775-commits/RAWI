/* ======================================================================
 *  روي (RAWI) — Front-End Application Logic
 *  Vanilla ES Module. طبقة بيانات هجينة: Firebase عند توفر الإعداد،
 *  وإلا وضع محلي كامل (localStorage) — كلاهما يعطي تجربة كاملة وسريعة.
 * ==================================================================== */
'use strict';

/* -------------------------------------------------- helpers -------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const cfg = (window.RAWI_CONFIG || {});
const LS = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem('rawi:' + k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('rawi:' + k, JSON.stringify(v)); } catch {} },
};
const todayKey = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();
const uid = () => 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const haptic = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

/** تعقيم الدخل لمنع XSS (Input Sanitization) */
function esc(str = '') {
  return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'الآن';
  if (s < 3600) return `قبل ${Math.floor(s/60)} د`;
  if (s < 86400) return `قبل ${Math.floor(s/3600)} س`;
  if (s < 604800) return `قبل ${Math.floor(s/86400)} ي`;
  return new Date(iso).toLocaleDateString('ar');
}
function fmt(n){ n=+n||0; if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1e3) return (n/1e3).toFixed(1)+'K'; return ''+n; }

/* -------------------------------------------------- visual themes -- */
const THEMES = {
  malaki:  { name:'ملكي',    grad:['#4E1322','#7B2D3A','#9C7A2E'], pat:'arab', accent:'#E8C766' },
  ink:     { name:'حِبر',    grad:['#1F2A44','#0B1020'], pat:'arab', accent:'#E8C766' },
  sahra:   { name:'صحراء',   grad:['#B8860B','#6B4A12'], pat:'geo',  accent:'#FFF1C9' },
  rawdah:  { name:'روضة',    grad:['#2C6E63','#15403A'], pat:'arab', accent:'#CFF3E6' },
  toot:    { name:'توت',     grad:['#7B2D26','#3E120E'], pat:'geo',  accent:'#F6C9B8' },
  layl:    { name:'ليل',     grad:['#3A2A5B','#160F2B'], pat:'arab', accent:'#D9C9FF' },
  ward:    { name:'ورد',     grad:['#C04B6E','#5C1E33'], pat:'geo',  accent:'#FFD6E2' },
  bahr:    { name:'بحر',     grad:['#1E6E8C','#0B2F40'], pat:'arab', accent:'#C6ECFA' },
  turab:   { name:'تراب',    grad:['#8A6D3B','#43331A'], pat:'geo',  accent:'#F1E2C0' },
};
const THEME_KEYS = Object.keys(THEMES);
const PATTERN = {
  arab: "assets/patterns/arabesque.svg#arab",
  geo:  "assets/patterns/geometric.svg#geo",
};

/* -------------------------------------------------- seed content --- */
const VERSES = [
  { body:'إِذا غامَرتَ في شَرَفٍ مَرومِ\nفَلا تَقنَع بِما دونَ النُجومِ', att:'المتنبي' },
  { body:'على قدرِ أهلِ العزمِ تأتي العزائمُ\nوتأتي على قدرِ الكرامِ المكارمُ', att:'المتنبي' },
  { body:'وما نيلُ المطالبِ بالتمنّي\nولكن تؤخذُ الدنيا غِلابا', att:'أحمد شوقي' },
  { body:'سيذكرُني قومي إذا جدَّ جدُّهم\nوفي الليلةِ الظلماءِ يُفتقَدُ البدرُ', att:'أبو فراس الحمداني' },
  { body:'أراك عصيَّ الدمعِ شيمتُك الصبرُ\nأما للهوى نهيٌ عليك ولا أمرُ', att:'أبو فراس الحمداني' },
  { body:'دعِ الأيامَ تفعلُ ما تشاءُ\nوطِبْ نفسًا إذا حكمَ القضاءُ', att:'الإمام الشافعي' },
  { body:'إذا الشعبُ يومًا أرادَ الحياةَ\nفلا بدَّ أن يستجيبَ القدرُ', att:'أبو القاسم الشابي' },
  { body:'وإذا أرادَ اللهُ نشرَ فضيلةٍ\nطُويت أتاحَ لها لسانَ حسودِ', att:'المتنبي' },
  { body:'الخيلُ والليلُ والبيداءُ تعرفني\nوالسيفُ والرمحُ والقرطاسُ والقلمُ', att:'المتنبي' },
  { body:'لا تحسبوا رقصي بينكم طربًا\nفالطيرُ يرقصُ مذبوحًا من الألمِ', att:'منسوب' },
];
const SEED_POSTS = [
  { type:'poem',  title:'على قدرِ أهلِ العزم', theme:'malaki',
    body:'على قدرِ أهلِ العزمِ تأتي العزائمُ\nوتأتي على قدرِ الكرامِ المكارمُ\nوتعظُمُ في عينِ الصغيرِ صغارُها\nوتصغُرُ في عينِ العظيمِ العظائمُ',
    meter:'الطويل', author:{ username:'al_mutanabbi', displayName:'أبو الطيب المتنبي', badges:['poet','verified'] } },
  { type:'quote', title:'', theme:'rawdah',
    body:'وما الحُسنُ في وجهِ الفتاةِ تمامُهُ\nولكنّهُ في الفعلِ والخُلُقِ الحَسَنْ',
    meter:'', author:{ username:'rawi_daily', displayName:'روي · المختارات', badges:['verified'] } },
  { type:'poem',  title:'أراك عصيَّ الدمع', theme:'layl',
    body:'أراك عصيَّ الدمعِ شيمتُك الصبرُ\nأما للهوى نهيٌ عليك ولا أمرُ\nبلى أنا مشتاقٌ وعنديَ لوعةٌ\nولكنّ مثلي لا يُذاعُ له سرُّ',
    meter:'الطويل', author:{ username:'abu_firas', displayName:'أبو فراس الحمداني', badges:['poet'] } },
  { type:'quote', title:'', theme:'sahra',
    body:'إذا لم تستطعْ شيئًا فدعهُ\nوجاوزهُ إلى ما تستطيعُ',
    meter:'', author:{ username:'abu_nuwas', displayName:'أبو نواس', badges:['poet'] } },
  { type:'story', title:'حكمة', theme:'bahr',
    body:'قيلَ لحكيمٍ: ما الغِنى؟ قال: قِلّةُ تمنّيك، ورِضاك بما يكفيك.',
    meter:'', author:{ username:'al_warraq', displayName:'الورّاق', badges:['verified'] } },
  { type:'poem',  title:'دع الأيام', theme:'toot',
    body:'دعِ الأيامَ تفعلُ ما تشاءُ\nوطِبْ نفسًا إذا حكمَ القضاءُ\nولا تجزعْ لحادثةِ الليالي\nفما لحوادثِ الدنيا بقاءُ',
    meter:'الوافر', author:{ username:'al_shafii', displayName:'الإمام الشافعي', badges:['poet','verified'] } },
  { type:'poem',  title:'إرادة الحياة', theme:'ward',
    body:'إذا الشعبُ يومًا أرادَ الحياةَ\nفلا بدَّ أن يستجيبَ القدرُ\nولا بدَّ لليلِ أن ينجلي\nولا بدَّ للقيدِ أن ينكسرُ',
    meter:'المتقارب', author:{ username:'al_shabbi', displayName:'أبو القاسم الشابي', badges:['poet','verified'] } },
  { type:'quote', title:'', theme:'turab',
    body:'العلمُ يرفعُ بيتًا لا عمادَ لهُ\nوالجهلُ يهدمُ بيتَ العزِّ والشرفِ',
    meter:'', author:{ username:'rawi_daily', displayName:'روي · المختارات', badges:['verified'] } },
];
const SEED_ENC = [
  { kind:'poet',  title:'أبو الطيب المتنبي', era:'العصر العباسي',
    summary:'أعظم شعراء العربية، صاحب الحكمة والفخر، وُلد بالكوفة سنة 303هـ.',
    body:'أحمد بن الحسين الجعفي الكندي، المعروف بالمتنبي. شاعرٌ حكيمٌ ملأ الدنيا وشغل الناس، اتّسم شعره بالفخر والحكمة وجزالة اللفظ. اتصل بسيف الدولة الحمداني فكانت أزهى مراحله. قُتل سنة 354هـ.' },
  { kind:'poet',  title:'أبو القاسم الشابي', era:'العصر الحديث',
    summary:'شاعر تونس وصاحب «إرادة الحياة»، رمز التجديد الرومانسي.',
    body:'شاعرٌ تونسيٌّ رومانسيّ (1909–1934)، من أبرز رموز الشعر العربي الحديث، اشتهر بنشيد «إرادة الحياة». تميّز شعره بالعاطفة الجياشة والنزعة التحررية.' },
  { kind:'term',  title:'القافية', era:'علم العروض',
    summary:'آخر ساكنين في البيت وما بينهما، وهي أساس موسيقى القصيدة.',
    body:'القافية هي مجموعة الأصوات الأخيرة في البيت الشعري التي تتكرر في القصيدة، وتمنحها وحدتها الصوتية. وأنواعها متعددة بحسب حركة الروي.' },
  { kind:'term',  title:'الاستعارة', era:'علم البلاغة',
    summary:'تشبيهٌ حُذف أحد طرفيه، من أبلغ صور البيان.',
    body:'الاستعارة مجازٌ لغويّ علاقته المشابهة، وهي تشبيهٌ حُذف أحد طرفيه (المشبّه أو المشبّه به). تنقسم إلى تصريحية ومكنية، وهي من أركان علم البيان.' },
  { kind:'meter', title:'البحر الطويل', era:'علم العروض',
    summary:'أكثر البحور استعمالًا: فعولن مفاعيلن فعولن مفاعيلن.',
    body:'الطويل أشهر بحور الشعر العربي وأكثرها ورودًا. تفعيلاته: فعولن مفاعيلن فعولن مفاعيلن (مكررة). نظم عليه فحول الشعراء كثيرًا من روائعهم.' },
  { kind:'meter', title:'البحر الوافر', era:'علم العروض',
    summary:'مفاعلتن مفاعلتن فعولن — يصلح للحماسة والغزل.',
    body:'الوافر من البحور الصافية، تفعيلته: مفاعلتن مفاعلتن فعولن. يمتاز بموسيقاه القوية، ويصلح لأغراض الحماسة والفخر والغزل.' },
  { kind:'era',   title:'العصر العباسي', era:'132–656هـ',
    summary:'عصر النضج والازدهار الأدبي والعلمي في تاريخ العرب.',
    body:'شهد العصر العباسي ازدهار الشعر والنثر وتطور الأغراض الشعرية ونشوء المذاهب البلاغية. برز فيه المتنبي وأبو تمام والبحتري وأبو العلاء المعري.' },
  { kind:'poet',  title:'الإمام الشافعي', era:'العصر العباسي',
    summary:'الفقيه الشاعر، صاحب الحِكم الخالدة في الأخلاق.',
    body:'محمد بن إدريس الشافعي (150–204هـ)، إمام المذهب الشافعي، وله ديوان شعرٍ زاخر بالحكمة والموعظة والأدب الرفيع.' },
];

/* -------------------------------------------------- avatar gen ----- */
function avatarDataURI(seed = 'rawi', opts = {}) {
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hues = [38, 168, 200, 280, 340, 16];
  const hue = hues[h % hues.length];
  const bg = opts.bg || `hsl(${hue} 45% ${document.body.dataset.theme==='dark'?'24%':'88%'})`;
  const fg = opts.fg || `hsl(${hue} 60% ${document.body.dataset.theme==='dark'?'70%':'34%'})`;
  const r = (n) => ((h >> n) & 7);
  const cx = 12, cy = 12;
  const shapes = [
    `<circle cx="${cx}" cy="${cy}" r="${4 + r(2)}" fill="${fg}" opacity=".9"/>`,
    `<path d="M12 4 L20 12 L12 20 L4 12 Z" fill="${fg}" opacity=".85"/>`,
    `<path d="M12 3 l2.4 6 6.3.3-5 4 1.8 6L12 22l-5.5 3.3 1.8-6-5-4 6.3-.3z" fill="${fg}"/>`,
    `<rect x="6" y="6" width="12" height="12" rx="3" fill="${fg}" opacity=".85" transform="rotate(${r(4)*8} 12 12)"/>`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="${bg}"/>${shapes[h%shapes.length]}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* -------------------------------------------------- canvas card ---- */
/** يرسم بطاقة نصية على Canvas (Client-Side rendering — بلا Storage). */
function renderCard(canvas, post) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const W = canvas.width = 800, H = canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  canvas.style.aspectRatio = '4 / 5';
  // device-pixel crispness handled by fixed hi-res buffer
  const th = THEMES[post.theme] || THEMES.ink;
  const g = ctx.createLinearGradient(0, 0, W, H);
  th.grad.forEach((c, i) => g.addColorStop(i / (th.grad.length - 1), c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // soft vignette
  const rg = ctx.createRadialGradient(W/2, H*0.4, 80, W/2, H/2, H*0.8);
  rg.addColorStop(0, 'rgba(255,255,255,.06)'); rg.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  // decorative corner frame
  ctx.strokeStyle = th.accent + '55'; ctx.lineWidth = 2;
  ctx.strokeRect(46, 46, W - 92, H - 92);
  ctx.strokeStyle = th.accent + '99';
  for (const [x, y, dx, dy] of [[46,46,1,1],[W-46,46,-1,1],[46,H-46,1,-1],[W-46,H-46,-1,-1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + dy*40); ctx.lineTo(x, y); ctx.lineTo(x + dx*40, y); ctx.stroke();
  }
  // type label
  ctx.direction = 'rtl'; ctx.textAlign = 'center';
  ctx.fillStyle = th.accent; ctx.font = '600 30px Cairo, sans-serif';
  ctx.fillText({poem:'قصيدة',quote:'اقتباس',story:'حكاية'}[post.type] || 'نص', W/2, 130);
  // title
  let y = 250;
  if (post.title) {
    ctx.fillStyle = '#fff'; ctx.font = '700 46px Amiri, serif';
    ctx.fillText(post.title, W/2, y); y += 30;
  }
  // body (RTL word wrap)
  ctx.fillStyle = '#ffffff'; ctx.font = '700 50px Amiri, serif';
  const maxW = W - 180, lineH = 86;
  const lines = wrapRTL(ctx, post.body || '', maxW);
  const blockH = lines.length * lineH;
  let ty = clamp((H - blockH) / 2 + 30, y + 40, H - 220);
  for (const ln of lines) { ctx.fillText(ln, W/2, ty); ty += lineH; }
  // author
  ctx.fillStyle = th.accent; ctx.font = '600 34px Cairo, sans-serif';
  ctx.fillText('— ' + (post.author?.displayName || 'مجهول'), W/2, H - 150);
  // watermark
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '700 30px Amiri, serif';
  ctx.fillText('روي', W/2, H - 90);
  return canvas;
}
function wrapRTL(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; }
      else line = test;
    }
    if (line) out.push(line);
  }
  return out.slice(0, 9);
}

/* ==================================================================== *
 *  DATA LAYER  (Firebase if configured, else local) — always usable
 * ==================================================================== */
const DB = (() => {
  let fb = null;            // { auth, db, fns... }
  let mode = 'local';
  const fbFeed = { lastDoc: null };
  const live = LS.get('posts', null);

  // يوحّد شكل المنشور القادم من Firestore (تواريخ + أفاتار + عدّادات)
  function normalizePost(id, d) {
    const createdAt = d.createdAt?.toDate?.() ? d.createdAt.toDate().toISOString() : (d.createdAt || nowISO());
    const author = d.author || { username: 'rawi_ai', displayName: 'روي · الراوي', badges: ['verified'] };
    if (!author.avatar) author.avatar = avatarDataURI(author.username || 'rawi');
    return {
      id, type: d.type || 'poem', title: d.title || '', body: d.body || '', meter: d.meter || '',
      theme: typeof d.theme === 'object' ? (d.theme.id || 'ink') : (d.theme || 'ink'),
      author, tags: d.tags || [],
      counts: { likes: 0, comments: 0, bookmarks: 0, views: 0, shares: 0, ...(d.counts || {}) },
      createdAt, status: d.status || 'published', isDeleted: !!d.isDeleted, source: d.source || 'ai',
    };
  }
  function normalizeEnc(id, d) {
    return { id, kind: d.kind || 'term', title: d.title || '', summary: d.summary || '',
      body: d.body || '', era: d.era || '', searchTokens: d.searchTokens || [] };
  }

  function seedAll() {
    const base = SEED_POSTS.map((p, i) => ({
      id: 'seed' + i, ...p,
      author: { ...p.author, avatar: avatarDataURI(p.author.username) },
      counts: { likes: 40 + ((i*37)%900), comments: 3 + (i%12), bookmarks: 5 + (i%30), views: 800 + i*321, shares: i%9 },
      createdAt: new Date(Date.now() - i * 5400e3).toISOString(),
      qualityScore: 8 + (i%2), status: 'published', source: 'seed',
    }));
    return base;
  }
  let posts = live || seedAll();
  if (!live) LS.set('posts', posts);

  const seedComments = {
    seed0: [
      { id:'c1', author:{displayName:'قارئ', username:'reader1'}, body:'بيتٌ خالد! 🌿', createdAt:nowISO() },
      { id:'c2', author:{displayName:'ناقد', username:'critic'}, body:'جزالة المتنبي لا تُضاهى.', createdAt:nowISO() },
    ],
  };
  const comments = LS.get('comments', seedComments);

  async function tryFirebase() {
    if (cfg.forceDemo || !cfg.firebase || !cfg.firebase.apiKey || cfg.firebase.apiKey.startsWith('AIzaSy_')) return false;
    try {
      const [{ initializeApp }, authMod, fsMod] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js'),
      ]);
      const app = initializeApp(cfg.firebase);
      const auth = authMod.getAuth(app);
      const db = fsMod.getFirestore(app);
      fb = { app, auth, db, authMod, fsMod };
      mode = 'firebase';
      // مصادقة مجهولة (best-effort) لتمكين الكتابة وفق القواعد
      authMod.signInAnonymously(auth).catch(() => {});
      return true;
    } catch (e) { console.warn('[RAWI] Firebase غير متاح — الوضع المحلي.', e?.message); return false; }
  }

  /* ---- public API (mode-agnostic; firebase writes are best-effort) ---- */
  return {
    get mode(){ return mode; },
    fb: () => fb,
    init: tryFirebase,

    async getFeed(cursor = 0, n = 5) {
      // قراءة حيّة من Firestore عند توفّره، مع رجوع للبيانات المحلية
      if (mode === 'firebase') {
        try {
          const { db, fsMod } = fb;
          if (cursor === 0) fbFeed.lastDoc = null;
          const parts = [fsMod.where('status', '==', 'published'), fsMod.orderBy('createdAt', 'desc')];
          if (fbFeed.lastDoc) parts.push(fsMod.startAfter(fbFeed.lastDoc));
          parts.push(fsMod.limit(n));
          const snap = await fsMod.getDocs(fsMod.query(fsMod.collection(db, 'posts'), ...parts));
          if (!snap.empty) {
            fbFeed.lastDoc = snap.docs[snap.docs.length - 1];
            const items = snap.docs.map(d => normalizePost(d.id, d.data()));
            return { items, next: snap.size === n ? cursor + n : null };
          }
          if (cursor > 0) return { items: [], next: null };
          // فارغ في الصفحة الأولى → اعرض البذور المحلية مؤقتًا
        } catch (e) { console.warn('[RAWI] feed → محلي:', e?.message); }
      }
      const sorted = posts.filter(p => p.status === 'published' && !p.isDeleted)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const slice = sorted.slice(cursor, cursor + n);
      return { items: slice, next: cursor + n < sorted.length ? cursor + n : null };
    },
    getProfilePosts(username) {
      return Promise.resolve(posts.filter(p => p.author?.username === username && !p.isDeleted)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    },
    getPost(id){ return Promise.resolve(posts.find(p => p.id === id)); },

    publish(draft, user) {
      // Rate limit: 15 منشورًا/يوم
      const rk = 'rate:' + todayKey();
      const used = LS.get(rk, 0);
      if (used >= 15) return Promise.reject(new Error('بلغت حدّ النشر اليومي (15 منشورًا). عُد غدًا ✦'));
      const post = {
        id: uid(), type: draft.type, title: esc(draft.title || ''), body: draft.body,
        theme: draft.theme, meter: draft.meter || '',
        author: { username: user.username, displayName: user.displayName, badges: user.badges || [], avatar: user.avatar },
        counts: { likes:0, comments:0, bookmarks:0, views:0, shares:0 },
        createdAt: nowISO(), status: 'published', source: 'user', qualityScore: 0, isDeleted:false,
      };
      posts.unshift(post); LS.set('posts', posts); LS.set(rk, used + 1);
      if (mode === 'firebase') {
        const { db, fsMod } = fb;
        fsMod.addDoc(fsMod.collection(db, 'posts'), { ...post, createdAt: fsMod.serverTimestamp() })
          .catch(e => console.warn('[RAWI] firestore publish skipped:', e?.message));
      }
      return Promise.resolve(post);
    },

    toggleLike(id) {
      const liked = LS.get('likes', {}); const on = !liked[id];
      liked[id] = on; LS.set('likes', liked);
      const p = posts.find(x => x.id === id); if (p) { p.counts.likes += on ? 1 : -1; LS.set('posts', posts); }
      // عدّاد حيّ على Firestore (best-effort)
      if (mode === 'firebase') {
        try {
          const { db, fsMod, auth } = fb;
          fsMod.updateDoc(fsMod.doc(db, 'posts', id), { counts: { likes: fsMod.increment(on ? 1 : -1) } }).catch(() => {});
          const u = auth.currentUser;
          if (u) {
            const ref = fsMod.doc(db, 'posts', id, 'likes', u.uid);
            (on ? fsMod.setDoc(ref, { createdAt: fsMod.serverTimestamp() }) : fsMod.deleteDoc(ref)).catch(() => {});
          }
        } catch (e) { /* ignore */ }
      }
      return Promise.resolve(on);
    },
    isLiked(id){ return !!LS.get('likes', {})[id]; },
    toggleBookmark(id) {
      const bm = LS.get('bookmarks', {}); const on = !bm[id];
      bm[id] = on; LS.set('bookmarks', bm);
      const p = posts.find(x => x.id === id); if (p) { p.counts.bookmarks += on ? 1 : -1; LS.set('posts', posts); }
      return Promise.resolve(on);
    },
    isBookmarked(id){ return !!LS.get('bookmarks', {})[id]; },
    bookmarkedPosts(){ const bm = LS.get('bookmarks', {}); return Promise.resolve(posts.filter(p => bm[p.id] && !p.isDeleted)); },

    getComments(id){ return Promise.resolve(comments[id] || []); },
    addComment(id, body, user) {
      const c = { id: uid(), author:{ displayName:user.displayName, username:user.username, avatar:user.avatar }, body: esc(body), createdAt: nowISO() };
      (comments[id] = comments[id] || []).push(c); LS.set('comments', comments);
      const p = posts.find(x => x.id === id); if (p) { p.counts.comments++; LS.set('posts', posts); }
      return Promise.resolve(c);
    },

    async search(q) {
      const t = q.trim().toLowerCase();
      if (!t) return this.encByKind('all');
      const toks = t.split(/\s+/);
      const local = SEED_ENC.filter(e => toks.some(tk =>
        (e.title + ' ' + e.summary + ' ' + e.era + ' ' + e.body).toLowerCase().includes(tk)));
      if (mode === 'firebase') {
        try {
          const { db, fsMod } = fb;
          const tok = toks[0].replace(/^[الـ]+/, '');
          const snap = await fsMod.getDocs(fsMod.query(fsMod.collection(db, 'encyclopedia'),
            fsMod.where('searchTokens', 'array-contains', tok), fsMod.limit(15)));
          const live = snap.docs.map(d => normalizeEnc(d.id, d.data()));
          const merged = [...live, ...local.filter(l => !live.some(v => v.title === l.title))];
          if (merged.length) return merged;
        } catch (e) { /* fallback */ }
      }
      return local;
    },
    async encByKind(kind) {
      if (mode === 'firebase') {
        try {
          const { db, fsMod } = fb;
          const parts = kind === 'all' ? [fsMod.limit(30)]
            : [fsMod.where('kind', '==', kind), fsMod.limit(30)];
          const snap = await fsMod.getDocs(fsMod.query(fsMod.collection(db, 'encyclopedia'), ...parts));
          if (!snap.empty) {
            const live = snap.docs.map(d => normalizeEnc(d.id, d.data()));
            const seed = kind === 'all' ? SEED_ENC : SEED_ENC.filter(e => e.kind === kind);
            return [...live, ...seed.filter(s => !live.some(v => v.title === s.title))];
          }
        } catch (e) { /* fallback */ }
      }
      return kind === 'all' ? SEED_ENC : SEED_ENC.filter(e => e.kind === kind);
    },
    async trend() {
      if (mode === 'firebase') {
        try {
          const { db, fsMod } = fb;
          const s = await fsMod.getDoc(fsMod.doc(db, 'config', 'current_trend'));
          if (s.exists()) { const d = s.data(); if (d.topic) return { topic: d.topic, tags: d.tags || [] }; }
        } catch (e) { /* fallback */ }
      }
      return LS.get('trend', { topic: 'الحكمة في شعر المتنبي', tags: ['#حكمة', '#فخر', '#المتنبي'] });
    },

    notifications() {
      return Promise.resolve(LS.get('notifs', [
        { id:'n1', type:'like', actor:{displayName:'سلمى'}, text:'أعجبها بيتك «على قدر أهل العزم»', read:false, createdAt:new Date(Date.now()-3600e3).toISOString() },
        { id:'n2', type:'follow', actor:{displayName:'خالد'}, text:'بدأ بمتابعتك', read:false, createdAt:new Date(Date.now()-7200e3).toISOString() },
        { id:'n3', type:'badge', actor:{displayName:'روي'}, text:'حصلت على وسام «شاعر صاعد» 🏅', read:true, createdAt:new Date(Date.now()-86400e3).toISOString() },
        { id:'n4', type:'comment', actor:{displayName:'نور'}, text:'علّقت على قصيدتك', read:true, createdAt:new Date(Date.now()-172800e3).toISOString() },
      ]));
    },
    stories() {
      const names = ['روي اليوم','المتنبي','الشابي','أبو فراس','شوقي','الشافعي','البحتري'];
      return Promise.resolve(names.map((n,i)=>({ id:'st'+i, name:n, seen:i>3,
        avatar: avatarDataURI(n), verse: VERSES[i%VERSES.length] })));
    },
  };
})();

/* ==================================================================== *
 *  USER / SESSION
 * ==================================================================== */
const Session = {
  get user() {
    return LS.get('user', null) || {
      username:'guest_'+ (LS.get('gid', null) || (()=>{const g=uid().slice(0,6);LS.set('gid',g);return g;})()),
      displayName:'ضيف روي', bio:'في رحاب الشعر والأدب 🌿', badges:['reader'],
      avatar: avatarDataURI('guest'), guest:true,
      counts:{ posts:0, followers:12, following:34, likes:0 },
    };
  },
  set user(u){ LS.set('user', u); },
  signIn(method) {
    const names = { google:'مستخدم Google', email:'كاتب روي', guest:'ضيف روي' };
    const u = {
      username: method==='guest' ? this.user.username : 'rawi_' + uid().slice(0,5),
      displayName: names[method] || 'مستخدم روي',
      bio:'في رحاب الشعر والأدب 🌿',
      badges: method==='guest' ? ['reader'] : ['poet','reader'],
      avatar: avatarDataURI(method+Date.now()), guest: method==='guest',
      counts:{ posts:0, followers: method==='guest'?0:18, following: 27, likes:0 },
      method,
    };
    this.user = u; LS.set('onboarded', true); return u;
  },
  signOut(){ localStorage.removeItem('rawi:user'); LS.set('onboarded', false); },
};

/* ==================================================================== *
 *  UI INFRA: router, toast, sheets
 * ==================================================================== */
const App = $('#app');
function toast(msg, icon = 'i-check') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<svg class="svg"><use href="assets/icons/sprite.svg#${icon}"></use></svg>${esc(msg)}`;
  $('#toast').appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 2400);
}
let currentScreen = 'home';
const RENDERERS = {};
function showScreen(name) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  $$('.navb').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  currentScreen = name;
  location.hash = name;
  if (RENDERERS[name]) RENDERERS[name]();
  const sc = $('#screen-' + name + ' .scroll'); if (sc && name!=='home') sc.scrollTop = 0;
}
let activeSheet = null;
function openSheet(id) {
  activeSheet = id; $('#scrim').classList.add('show'); $('#' + id).classList.add('show');
}
function closeSheet() {
  if (!activeSheet) return;
  $('#' + activeSheet).classList.remove('show'); $('#scrim').classList.remove('show'); activeSheet = null;
}
$('#scrim').addEventListener('click', closeSheet);
$$('.sheet .grip').forEach(g => g.addEventListener('click', closeSheet));

/* ==================================================================== *
 *  ONBOARDING
 * ==================================================================== */
let verseIdx = 0;
function renderVerse() {
  const v = VERSES[verseIdx % VERSES.length];
  const box = $('#obVerse');
  box.style.opacity = 0;
  setTimeout(() => {
    box.innerHTML = `<svg class="deco" aria-hidden="true" style="width:100%;height:100%"><use href="${PATTERN.arab}"></use></svg>
      <div>${esc(v.body).replace(/\n/g,'<br>')}</div><div class="att">— ${esc(v.att)}</div>`;
    box.style.opacity = 1;
  }, 180);
  verseIdx++;
}
function initOnboarding() {
  renderVerse();
  $('#obVerse').addEventListener('click', renderVerse);
  $('#obActions').innerHTML = `
    <button class="btn btn-gold auth" data-m="google"><svg class="svg" style="width:20px"><use href="assets/icons/sprite.svg#i-google"></use></svg>المتابعة عبر Google</button>
    <button class="btn btn-line auth" data-m="email"><svg class="svg" style="width:20px"><use href="assets/icons/sprite.svg#i-edit"></use></svg>التسجيل بالبريد</button>
    <button class="btn btn-ghost auth" data-m="guest">الدخول كضيف</button>`;
  $$('#obActions .auth').forEach(b => b.addEventListener('click', () => {
    Session.signIn(b.dataset.m); haptic(12);
    toast('أهلًا بك في روي ✦');
    $('#screen-onboarding').classList.remove('active');
    bootMain();
  }));
}

/* ==================================================================== *
 *  HOME — stories + virtualized feed (DOM recycling)
 * ==================================================================== */
async function renderStories() {
  const wrap = $('#stories');
  const list = await DB.stories();
  wrap.innerHTML = `<div class="story add" id="addStory"><div class="ring"><div class="av">
      <svg class="svg" style="width:26px"><use href="assets/icons/sprite.svg#i-studio"></use></svg></div></div>
      <span class="nm">قصتك</span></div>` +
    list.map(s => `<div class="story ${s.seen?'seen':''}" data-story="${esc(s.id)}">
        <div class="ring"><div class="av"><img src="${s.avatar}" alt="" width="56" height="56" loading="lazy"/></div></div>
        <span class="nm">${esc(s.name)}</span></div>`).join('');
  $('#addStory').addEventListener('click', () => showScreen('studio'));
  $$('#stories [data-story]').forEach(el => el.addEventListener('click', () => {
    const s = list.find(x => x.id === el.dataset.story);
    el.classList.add('seen');
    toast(`«${s.verse.att}»: ${s.verse.body.split('\n')[0]}`, 'i-stories');
  }));
}

/* ---- feed virtualization ---- */
const Feed = {
  cursor: 0, next: 0, loading: false, items: [], io: null, sentinel: null,
  async reset() {
    this.cursor = 0; this.next = 0; this.items = []; this.loading = false;
    const feed = $('#feed'); feed.innerHTML = '';
    // skeletons
    for (let i=0;i<2;i++){ const sk=document.createElement('div'); sk.className='skeleton'; feed.appendChild(sk); }
    const { items, next } = await DB.getFeed(0, 5);
    feed.innerHTML = '';
    this.items = items; this.next = next;
    items.forEach(p => feed.appendChild(capsuleEl(p)));
    this.attachSentinel();
    this.recycle();
  },
  attachSentinel() {
    const feed = $('#feed');
    if (this.sentinel) this.sentinel.remove();
    this.sentinel = document.createElement('div'); this.sentinel.style.height = '1px';
    feed.appendChild(this.sentinel);
    if (this.io) this.io.disconnect();
    this.io = new IntersectionObserver(es => { if (es[0].isIntersecting) this.loadMore(); },
      { root: $('#homeScroll'), rootMargin: '600px' });
    this.io.observe(this.sentinel);
  },
  async loadMore() {
    if (this.loading || this.next == null) return;
    this.loading = true;
    const { items, next } = await DB.getFeed(this.next, 4);
    const feed = $('#feed');
    items.forEach(p => { this.items.push(p); feed.insertBefore(capsuleEl(p), this.sentinel); });
    this.next = next; this.loading = false;
    if (next == null && this.sentinel) {
      const end = document.createElement('div'); end.className='empty';
      end.innerHTML = `<svg class="svg" style="width:30px;color:var(--gold)"><use href="assets/patterns/divider.svg#"></use></svg><p style="font-family:var(--font-serif)">بلغتَ نهاية المختارات ✦</p>`;
      feed.insertBefore(end, this.sentinel); this.io.disconnect();
    }
    this.recycle();
  },
  /** DOM Recycling: أبقِ ~12 بطاقة فقط حول منطقة العرض. */
  recycle() {
    const caps = $$('#feed .capsule');
    if (caps.length <= 12) return;
    const scroll = $('#homeScroll'); const top = scroll.scrollTop, vh = scroll.clientHeight;
    caps.forEach(c => {
      const oy = c.offsetTop, oh = c.offsetHeight;
      const visible = oy + oh > top - vh*2 && oy < top + vh*3;
      if (!visible) {
        if (!c.dataset.h) { c.dataset.h = oh; c.dataset.placeholder = '1'; c.style.height = oh + 'px'; c._inner = c.innerHTML; c.innerHTML=''; c.style.background='var(--surface)'; }
      } else if (c.dataset.placeholder) {
        c.innerHTML = c._inner; c.style.height=''; delete c.dataset.placeholder;
      }
    });
  },
};
function capsuleEl(p) {
  const th = THEMES[p.theme] || THEMES.ink;
  const liked = DB.isLiked(p.id), bookmarked = DB.isBookmarked(p.id);
  const el = document.createElement('article');
  el.className = 'capsule'; el.dataset.id = p.id;
  el.innerHTML = `
    <div class="cap-art">
      <div class="cap-grad" style="background:linear-gradient(150deg,${th.grad.join(',')})"></div>
      <div class="pat" style="background-image:url(&quot;${PATTERN[th.pat].split('#')[0]}&quot;)"></div>
    </div>
    <div class="cap-body">
      <span class="cap-type">${({poem:'قصيدة',quote:'اقتباس',story:'حكاية'})[p.type]||'نص'}</span>
      <div class="cap-text"><div>
        ${p.title?`<p class="cap-title">${esc(p.title)}</p>`:''}
        <p>${esc(p.body)}</p>
      </div></div>
      <div class="cap-foot">
        <div class="av"><img src="${p.author.avatar||avatarDataURI(p.author.username)}" alt="" width="38" height="38" loading="lazy"></div>
        <div><div class="who">${esc(p.author.displayName)} ${p.author.badges?.includes('verified')?'<svg class="svg"><use href="assets/icons/sprite.svg#i-verified"></use></svg>':''}</div>
          <div class="meta">@${esc(p.author.username)} · ${timeAgo(p.createdAt)}</div></div>
        ${p.meter?`<span class="cap-meter">${esc(p.meter)}</span>`:''}
      </div>
    </div>
    <div class="rail">
      <button class="act like ${liked?'on':''}" data-act="like" aria-label="إعجاب">
        <svg class="svg"><use href="assets/icons/sprite.svg#${liked?'i-heart-fill':'i-heart'}"></use></svg><b class="c">${fmt(p.counts.likes)}</b></button>
      <button class="act" data-act="comment" aria-label="تعليق">
        <svg class="svg"><use href="assets/icons/sprite.svg#i-comment"></use></svg><b>${fmt(p.counts.comments)}</b></button>
      <button class="act bm ${bookmarked?'on':''}" data-act="bookmark" aria-label="حفظ">
        <svg class="svg"><use href="assets/icons/sprite.svg#${bookmarked?'i-bookmark-fill':'i-bookmark'}"></use></svg><b class="c">${fmt(p.counts.bookmarks)}</b></button>
      <button class="act" data-act="share" aria-label="مشاركة">
        <svg class="svg"><use href="assets/icons/sprite.svg#i-share"></use></svg><b>${fmt(p.counts.shares)}</b></button>
    </div>`;
  el.querySelector('[data-act="like"]').addEventListener('click', e => onLike(e.currentTarget, p));
  el.querySelector('[data-act="bookmark"]').addEventListener('click', e => onBookmark(e.currentTarget, p));
  el.querySelector('[data-act="comment"]').addEventListener('click', () => openComments(p));
  el.querySelector('[data-act="share"]').addEventListener('click', () => sharePost(p));
  return el;
}
async function onLike(btn, p) {
  haptic(); const on = await DB.toggleLike(p.id); // optimistic already in store
  btn.classList.toggle('on', on); btn.classList.add('pulse');
  btn.querySelector('use').setAttribute('href', `assets/icons/sprite.svg#${on?'i-heart-fill':'i-heart'}`);
  btn.querySelector('.c').textContent = fmt(p.counts.likes);
  setTimeout(()=>btn.classList.remove('pulse'),420);
}
async function onBookmark(btn, p) {
  haptic(); const on = await DB.toggleBookmark(p.id);
  btn.classList.toggle('on', on); btn.classList.add('pulse');
  btn.querySelector('use').setAttribute('href', `assets/icons/sprite.svg#${on?'i-bookmark-fill':'i-bookmark'}`);
  btn.querySelector('.c').textContent = fmt(p.counts.bookmarks);
  toast(on?'حُفظ في ديوانك ✦':'أُزيل من المحفوظات', 'i-bookmark');
  setTimeout(()=>btn.classList.remove('pulse'),420);
}
async function sharePost(p) {
  const text = `${p.body}\n— ${p.author.displayName} · عبر روي`;
  p.counts.shares++; // optimistic UI only
  try {
    if (navigator.share) { await navigator.share({ title:'روي', text }); }
    else { await navigator.clipboard.writeText(text); toast('نُسخ النص ✦', 'i-share'); }
  } catch {}
}

/* ---- comments sheet ---- */
let commentPost = null;
async function openComments(p) {
  commentPost = p; openSheet('commentSheet');
  const list = $('#commentList'); list.innerHTML = '<div class="empty"><svg class="svg spin" style="width:30px"><use href="assets/illustrations/loading.svg#"></use></svg></div>';
  const cs = await DB.getComments(p.id);
  list.innerHTML = cs.length ? cs.map(c => `
    <div class="comment"><div class="av"><img src="${c.author.avatar||avatarDataURI(c.author.username||'u')}" width="38" height="38" alt=""></div>
      <div class="c-main"><b>${esc(c.author.displayName)}</b> <span>· ${timeAgo(c.createdAt)}</span>
        <p>${esc(c.body)}</p></div></div>`).join('')
    : `<div class="empty"><img src="assets/illustrations/empty-feed.svg" alt=""><p>كن أول من يعلّق ✦</p></div>`;
}
$('#commentSend').addEventListener('click', sendComment);
$('#commentInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendComment(); });
async function sendComment() {
  const inp = $('#commentInput'); const v = inp.value.trim(); if (!v || !commentPost) return;
  await DB.addComment(commentPost.id, v, Session.user); inp.value='';
  openComments(commentPost);
  // refresh count on card
  const card = $(`#feed .capsule[data-id="${commentPost.id}"]`);
  if (card) card.querySelector('[data-act="comment"] b').textContent = fmt(commentPost.counts.comments);
}

/* ==================================================================== *
 *  EXPLORE / ENCYCLOPEDIA
 * ==================================================================== */
const ENC_KINDS = [['all','الكل'],['poet','الشعراء'],['term','مصطلحات'],['meter','البحور'],['era','العصور']];
let encKind = 'all';
async function renderExplore() {
  if (!$('#encFilters').dataset.init) {
    $('#encFilters').dataset.init = '1';
    $('#encFilters').innerHTML = ENC_KINDS.map(([k,l]) =>
      `<button class="chip ${k==='all'?'active':''}" data-k="${k}">${l}</button>`).join('');
    $$('#encFilters .chip').forEach(c => c.addEventListener('click', () => {
      encKind = c.dataset.k; $$('#encFilters .chip').forEach(x=>x.classList.toggle('active',x===c)); fillEnc();
    }));
    $('#searchInput').addEventListener('input', debounce(fillEnc, 220));
    const tr = await DB.trend();
    $('#trendCard').innerHTML = `<div class="t"><svg class="svg" style="width:16px"><use href="assets/icons/sprite.svg#i-trend"></use></svg>الأكثر تداولًا اليوم</div>
      <div class="v">${esc(tr.topic)}</div>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">${tr.tags.map(t=>`<span class="chip" style="background:rgba(255,255,255,.16);color:#fff">${esc(t)}</span>`).join('')}</div>`;
  }
  fillEnc();
}
async function fillEnc() {
  const q = $('#searchInput').value.trim();
  const grid = $('#encGrid');
  let items = q ? await DB.search(q) : await DB.encByKind(encKind);
  if (!items.length) {
    grid.style.gridTemplateColumns='1fr';
    grid.innerHTML = `<div class="empty"><img src="assets/illustrations/empty-search.svg" alt=""><h3>لا نتائج</h3><p>جرّب كلمة أخرى مثل «المتنبي» أو «القافية».</p></div>`;
    return;
  }
  grid.style.gridTemplateColumns='1fr 1fr';
  const ico = { poet:'i-profile', term:'i-feather', meter:'i-poetry', era:'i-encyclopedia' };
  const kn = { poet:'شاعر', term:'مصطلح', meter:'بحر', era:'عصر' };
  grid.innerHTML = items.map((e,i) => `
    <div class="enc-card k-${e.kind}" data-i="${i}">
      <div class="ico"><svg class="svg" style="width:22px"><use href="assets/icons/sprite.svg#${ico[e.kind]||'i-encyclopedia'}"></use></svg></div>
      <span class="enc-kind">${kn[e.kind]||''} · ${esc(e.era)}</span>
      <h4>${esc(e.title)}</h4><p>${esc(e.summary)}</p></div>`).join('');
  $$('#encGrid .enc-card').forEach(c => c.addEventListener('click', () => openEntry(items[+c.dataset.i])));
}
function openEntry(e) {
  openSheet('entrySheet');
  const kn = { poet:'شاعر', term:'مصطلح', meter:'بحر', era:'عصر' };
  $('#entryBody').innerHTML = `<span class="kind">${kn[e.kind]||''} · ${esc(e.era)}</span>
    <h2>${esc(e.title)}</h2>
    <img src="assets/patterns/divider.svg" alt="" style="width:160px;color:var(--gold);margin:8px 0;opacity:.8">
    <div class="body">${esc(e.body)}</div>`;
}

/* ==================================================================== *
 *  STUDIO
 * ==================================================================== */
const Studio = { type:'poem', theme:'ink', title:'', body:'' };
function initStudio() {
  $('#themePicker').innerHTML = THEME_KEYS.map(k =>
    `<button class="theme-dot ${k==='ink'?'active':''}" data-t="${k}" title="${THEMES[k].name}"
      style="background:linear-gradient(135deg,${THEMES[k].grad[0]},${THEMES[k].grad[1]})"></button>`).join('');
  $$('#themePicker .theme-dot').forEach(d => d.addEventListener('click', () => {
    Studio.theme = d.dataset.t; $$('#themePicker .theme-dot').forEach(x=>x.classList.toggle('active',x===d)); previewCard();
  }));
  $$('#typeTabs .typetab').forEach(t => t.addEventListener('click', () => {
    Studio.type = t.dataset.type; $$('#typeTabs .typetab').forEach(x=>x.classList.toggle('active',x===t)); previewCard();
  }));
  $('#stTitle').addEventListener('input', e => { Studio.title = e.target.value; previewCard(); });
  $('#stBody').addEventListener('input', e => {
    Studio.body = e.target.value;
    const n = e.target.value.length; const c = $('#stCount');
    c.textContent = `${n} / 600`; c.classList.toggle('warn', n > 540);
    previewCard();
  });
  $('#publishBtn').addEventListener('click', publish);
  $('#downloadCard').addEventListener('click', downloadCard);
  previewCard();
}
function draftPost() {
  return { type:Studio.type, title:Studio.title, body:Studio.body || 'يظهر نصّك هنا…\nاكتب بيتًا أو حكمة.',
    theme:Studio.theme, meter:'', author:Session.user };
}
function previewCard(){ renderCard($('#studioCanvas'), draftPost()); }
async function publish() {
  if (!Studio.body.trim()) { toast('اكتب نصًّا أولًا ✦', 'i-edit'); return; }
  try {
    const post = await DB.publish({ ...draftPost(), body:Studio.body.trim() }, Session.user);
    const u = Session.user; u.counts.posts = (u.counts.posts||0)+1; Session.user = u;
    toast('نُشر في روي بنجاح ✦'); haptic(16);
    Studio.title=''; Studio.body=''; $('#stTitle').value=''; $('#stBody').value=''; $('#stCount').textContent='0 / 600';
    previewCard(); Feed.reset(); showScreen('home');
  } catch (e) { toast(e.message || 'تعذّر النشر', 'i-bell'); }
}
function downloadCard() {
  renderCard($('#studioCanvas'), draftPost());
  $('#studioCanvas').toBlob(b => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b);
    a.download = 'rawi-card.png'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    toast('حُفظت البطاقة كصورة ✦', 'i-qr');
  }, 'image/png');
}

/* ==================================================================== *
 *  NOTIFICATIONS
 * ==================================================================== */
async function renderNotif() {
  const list = $('#notifList');
  const ns = await DB.notifications();
  $('#notifDot').style.display = ns.some(n=>!n.read) ? '' : 'none';
  const ic = { like:'i-heart-fill', comment:'i-comment', follow:'i-profile', badge:'i-badge', system:'i-bell' };
  list.innerHTML = ns.length ? `<div style="padding:8px 16px">` + ns.map(n => `
    <div class="set-row" style="border:0;border-bottom:1px solid var(--line);background:${n.read?'transparent':'color-mix(in srgb,var(--gold) 7%,transparent)'};border-radius:14px;margin-bottom:6px">
      <div class="ic" style="color:${n.type==='like'?'var(--rose)':'var(--gold)'}"><svg class="svg" style="width:20px"><use href="assets/icons/sprite.svg#${ic[n.type]||'i-bell'}"></use></svg></div>
      <div class="lbl"><b>${esc(n.actor.displayName)}</b><span>${esc(n.text)} · ${timeAgo(n.createdAt)}</span></div>
    </div>`).join('') + `</div>`
    : `<div class="empty"><img src="assets/illustrations/empty-notifications.svg" alt=""><h3>لا إشعارات بعد</h3><p>سنُعلِمك عند التفاعل مع كتاباتك.</p></div>`;
  const marked = ns.map(n=>({ ...n, read:true })); LS.set('notifs', marked);
  setTimeout(()=>{ $('#notifDot').style.display='none'; }, 800);
}

/* ==================================================================== *
 *  PROFILE
 * ==================================================================== */
let profileTab = 'posts';
async function renderProfile() {
  const u = Session.user;
  const posts = await DB.getProfilePosts(u.username);
  const saved = await DB.bookmarkedPosts();
  const badgeMeta = { poet:['شاعر','i-poetry'], verified:['موثّق','i-verified'], reader:['قارئ','i-encyclopedia'], vip:['VIP','i-badge'] };
  const scroll = $('#profileScroll');
  scroll.innerHTML = `
    <div class="prof-head">
      <div class="prof-cover"><div class="pat" style="background-image:url(&quot;assets/patterns/geometric.svg&quot;)"></div></div>
      <div class="prof-av"><img src="${u.avatar}" width="96" height="96" alt=""></div>
      <div class="prof-name">${esc(u.displayName)} ${u.badges?.includes('verified')?'<svg class="svg"><use href="assets/icons/sprite.svg#i-verified"></use></svg>':''}</div>
      <div class="prof-handle">@${esc(u.username)}</div>
      <div class="prof-bio">${esc(u.bio||'')}</div>
      <div class="badges">${(u.badges||[]).slice(0,4).map(b=>`<span class="bdg"><svg class="svg"><use href="assets/icons/sprite.svg#${(badgeMeta[b]||['','i-badge'])[1]}"></use></svg>${(badgeMeta[b]||[b])[0]}</span>`).join('')}</div>
      <div class="stats">
        <div class="stat"><b>${posts.length}</b><span>منشور</span></div>
        <div class="stat"><b>${fmt(u.counts.followers)}</b><span>متابِع</span></div>
        <div class="stat"><b>${fmt(u.counts.following)}</b><span>يتابِع</span></div>
      </div>
      <button class="btn btn-line" style="margin-top:12px" data-nav="settings"><svg class="svg" style="width:18px"><use href="assets/icons/sprite.svg#i-edit"></use></svg>تعديل الملف</button>
    </div>
    <div class="tabs">
      <div class="tab ${profileTab==='posts'?'active':''}" data-tab="posts">منشوراتي</div>
      <div class="tab ${profileTab==='saved'?'active':''}" data-tab="saved">المحفوظات</div>
    </div>
    <div id="profGrid"></div>`;
  scroll.querySelector('[data-nav="settings"]').addEventListener('click', ()=>showScreen('settings'));
  $$('#profileScroll .tab').forEach(t => t.addEventListener('click', () => { profileTab=t.dataset.tab; renderProfile(); }));
  const data = profileTab==='posts' ? posts : saved;
  const grid = $('#profGrid');
  if (!data.length) {
    grid.innerHTML = `<div class="empty"><img src="assets/illustrations/${profileTab==='saved'?'empty-feed':'empty-feed'}.svg" alt="">
      <h3>${profileTab==='saved'?'لا محفوظات':'لا منشورات بعد'}</h3>
      <p>${profileTab==='saved'?'احفظ ما يعجبك ليظهر هنا.':'ابدأ الكتابة من الاستوديو ✦'}</p>
      ${profileTab==='posts'?'<button class="btn btn-gold" style="max-width:200px" id="goStudio2">اكتب الآن</button>':''}</div>`;
    const g=$('#goStudio2'); if(g) g.addEventListener('click',()=>showScreen('studio'));
    return;
  }
  grid.className='mini-grid';
  grid.innerHTML = data.map(p => {
    const th = THEMES[p.theme]||THEMES.ink;
    return `<div class="mini" style="background:linear-gradient(150deg,${th.grad.join(',')})"><p>${esc(p.body)}</p></div>`;
  }).join('');
}

/* ==================================================================== *
 *  SETTINGS
 * ==================================================================== */
function applyTheme(mode) {
  LS.set('theme', mode);
  const sysDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = mode === 'dark' || (mode === 'system' && sysDark);
  document.body.dataset.theme = dark ? 'dark' : 'light';
  const tc = $('meta[name="theme-color"]'); if (tc) tc.content = dark ? '#0E1116' : '#FBF7EF';
}
function applyFontScale(s){ document.documentElement.style.setProperty('--fs', s); LS.set('fontScale', s); }
function renderSettings() {
  const theme = LS.get('theme','system');
  const scale = LS.get('fontScale', 1);
  const audio = LS.get('ambient', false);
  const u = Session.user;
  $('#settingsBody').innerHTML = `
    <div class="set-group">
      <div class="gh">المظهر</div>
      <div class="set-row"><div class="ic"><svg class="svg" style="width:20px"><use href="assets/icons/sprite.svg#i-moon"></use></svg></div>
        <div class="lbl"><b>السمة</b><span>فاتح · داكن · النظام</span></div>
        <div class="seg" id="themeSeg">
          <button data-v="light" class="${theme==='light'?'active':''}">فاتح</button>
          <button data-v="dark" class="${theme==='dark'?'active':''}">داكن</button>
          <button data-v="system" class="${theme==='system'?'active':''}">النظام</button></div></div>
      <div class="set-row"><div class="ic"><svg class="svg" style="width:20px"><use href="assets/icons/sprite.svg#i-poetry"></use></svg></div>
        <div class="lbl"><b>حجم الخط</b><span>راحة القراءة</span></div>
        <div class="seg" id="fontSeg">
          <button data-v="0.9" class="${scale==0.9?'active':''}">صغير</button>
          <button data-v="1" class="${scale==1?'active':''}">عادي</button>
          <button data-v="1.15" class="${scale==1.15?'active':''}">كبير</button></div></div>
    </div>
    <div class="set-group">
      <div class="gh">التجربة</div>
      <div class="set-row"><div class="ic"><svg class="svg" style="width:20px"><use href="assets/icons/sprite.svg#i-audio"></use></svg></div>
        <div class="lbl"><b>الأجواء الصوتية</b><span>نغمة هادئة أثناء القراءة</span></div>
        <div class="switch ${audio?'on':''}" id="audioSw" role="switch" aria-checked="${audio}"></div></div>
      <div class="set-row"><div class="ic"><svg class="svg" style="width:20px"><use href="assets/icons/sprite.svg#i-globe"></use></svg></div>
        <div class="lbl"><b>اللغة</b><span>العربية</span></div></div>
    </div>
    <div class="set-group">
      <div class="gh">عن روي</div>
      <div class="set-row"><div class="ic"><svg class="svg" style="width:20px"><use href="assets/icons/sprite.svg#i-feather"></use></svg></div>
        <div class="lbl"><b>الإصدار</b><span>روي v${esc(cfg.version||'1.0.0')} · وضع البيانات: ${DB.mode==='firebase'?'Firebase':'محلي'}</span></div></div>
      <div class="set-row"><div class="ic"><svg class="svg" style="width:20px"><use href="assets/icons/sprite.svg#i-qr"></use></svg></div>
        <div class="lbl"><b>شارك التطبيق</b><span>ادعُ محبّي الأدب</span></div></div>
    </div>
    <button class="btn btn-line" id="signOutBtn" style="color:var(--maroon)"><svg class="svg" style="width:18px"><use href="assets/icons/sprite.svg#i-logout"></use></svg>${u.guest?'تسجيل الدخول':'تسجيل الخروج'}</button>
    <div style="text-align:center;color:var(--muted);font-size:.74rem;padding:8px">صُنع بشغفٍ للأدب العربي ✦</div>`;
  $$('#themeSeg button').forEach(b => b.addEventListener('click', () => { applyTheme(b.dataset.v); renderSettings(); }));
  $$('#fontSeg button').forEach(b => b.addEventListener('click', () => { applyFontScale(+b.dataset.v); renderSettings(); }));
  $('#audioSw').addEventListener('click', () => { const on=!LS.get('ambient',false); LS.set('ambient',on); Ambient.toggle(on); renderSettings(); });
  $('#signOutBtn').addEventListener('click', () => {
    Session.signOut(); toast('إلى اللقاء ✦');
    setTimeout(()=>location.reload(), 600);
  });
}

/* ---- Adaptive Ambient Audio (WebAudio, خفيف) ---- */
const Ambient = {
  ctx:null, osc:null,
  toggle(on) {
    if (on) {
      try {
        this.ctx = this.ctx || new (window.AudioContext||window.webkitAudioContext)();
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type='sine'; o.frequency.value=196; g.gain.value=0.015;
        o.connect(g); g.connect(this.ctx.destination); o.start(); this.osc={o,g};
        toast('الأجواء الصوتية مفعّلة 🎵','i-audio');
      } catch {}
    } else if (this.osc) { try{this.osc.o.stop();}catch{} this.osc=null; }
  }
};

/* ==================================================================== *
 *  WIRING / BOOT
 * ==================================================================== */
RENDERERS.home = () => { renderStories(); Feed.reset(); };
RENDERERS.explore = renderExplore;
RENDERERS.studio = () => {};
RENDERERS.notif = renderNotif;
RENDERERS.profile = renderProfile;
RENDERERS.settings = renderSettings;

function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }

$$('[data-nav]').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.nav)));
$('#goNotif').addEventListener('click', () => showScreen('notif'));
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

function bootMain() {
  initStudio();
  showScreen(location.hash.replace('#','') in RENDERERS ? location.hash.replace('#','') : 'home');
}

async function boot() {
  // theme + font from storage
  applyTheme(LS.get('theme','system'));
  applyFontScale(LS.get('fontScale',1));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (LS.get('theme','system')==='system') applyTheme('system');
  });
  // data layer
  await DB.init();
  // splash
  setTimeout(() => $('#splash').classList.add('hide'), 850);
  // route to onboarding or app
  if (!LS.get('onboarded', false)) {
    initOnboarding();
    setTimeout(()=>$('#screen-onboarding').classList.add('active'), 300);
    initStudio(); // ready for later
  } else {
    bootMain();
  }
  // PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
  // ambient resume
  if (LS.get('ambient',false)) { /* requires gesture; will start on toggle */ }
}
boot();
