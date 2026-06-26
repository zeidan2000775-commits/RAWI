/* ======================================================================
 *  روي (RAWI) — خادم الـ API (Express)
 *  مسارات: /health · /api/feed · /api/search · /api/trend · /api/fcm/register
 *          · /telegram/webhook/:bot  (بديل عن long-polling)
 *  كل الأسرار من process.env. Kill Switch عبر config/system.readOnly.
 * ==================================================================== */
'use strict';
try { require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); } catch {}

const express = require('express');
const cors = require('cors');
const fb = require('./lib/firebaseAdmin');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));
fb.init();

/* ---------- بوابة Kill Switch للكتابة ---------- */
async function readOnly() {
  if (!fb.db) return false;
  try { const s = await fb.db.collection('config').doc('system').get(); return s.exists && s.data().readOnly === true; }
  catch { return false; }
}

/* ---------- health ---------- */
app.get('/health', (req, res) => res.json({ ok: true, service: 'rawi-api', db: !!fb.db, time: new Date().toISOString() }));

/* ---------- feed (قراءة عامة، مرقّمة بالمؤشّر) ---------- */
app.get('/api/feed', async (req, res) => {
  if (!fb.db) return res.json({ items: [], next: null, note: 'db-offline' });
  try {
    const limit = Math.min(+req.query.limit || 6, 20);
    let q = fb.db.collection('posts').where('status', '==', 'published').orderBy('createdAt', 'desc').limit(limit);
    if (req.query.after) {
      const cur = await fb.db.collection('posts').doc(req.query.after).get();
      if (cur.exists) q = q.startAfter(cur);
    }
    const snap = await q.get();
    const items = snap.docs.filter((d) => !d.data().isDeleted).map((d) => ({ id: d.id, ...d.data() }));
    res.json({ items, next: items.length === limit ? items[items.length - 1].id : null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ---------- search (tokenized array-contains) ---------- */
app.get('/api/search', async (req, res) => {
  if (!fb.db) return res.json({ items: [] });
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json({ items: [] });
  try {
    const token = q.split(/\s+/)[0].replace(/^[الـ]+/, '');
    const [posts, enc] = await Promise.all([
      fb.db.collection('posts').where('searchTokens', 'array-contains', token).limit(10).get(),
      fb.db.collection('encyclopedia').where('searchTokens', 'array-contains', token).limit(10).get(),
    ]);
    res.json({
      posts: posts.docs.map((d) => ({ id: d.id, ...d.data() })),
      encyclopedia: enc.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ---------- trend ---------- */
app.get('/api/trend', async (req, res) => {
  if (!fb.db) return res.json({ topic: 'مختارات اليوم', tags: [] });
  try { const s = await fb.db.collection('config').doc('current_trend').get();
    res.json(s.exists ? s.data() : { topic: 'مختارات اليوم', tags: [] }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* ---------- تسجيل توكن FCM (يتطلب مصادقة عبر idToken) ---------- */
app.post('/api/fcm/register', async (req, res) => {
  if (await readOnly()) return res.status(429).json({ error: 'read-only' });
  if (!fb.db) return res.status(503).json({ error: 'db-offline' });
  try {
    const { idToken, token } = req.body || {};
    if (!idToken || !token) return res.status(400).json({ error: 'missing fields' });
    const decoded = await fb.admin.auth().verifyIdToken(idToken);
    await fb.db.collection('users').doc(decoded.uid).set(
      { fcmTokens: fb.admin.firestore.FieldValue.arrayUnion(token) }, { merge: true });
    res.json({ ok: true });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

/* ---------- Telegram webhook (بديل عن long-polling) ---------- */
let adminPanel = null, Telegram = null, registry = null;
try {
  adminPanel = require('../../bots/src/bots/adminPanel');
  ({ Telegram } = require('../../bots/src/lib/telegram'));
  registry = require('../../shared/botRegistry');
} catch { /* البوتات اختيارية على الخادم */ }

app.post('/telegram/webhook/:bot', async (req, res) => {
  if (!adminPanel || !Telegram || !registry) return res.sendStatus(404);
  const secret = req.get('X-Telegram-Bot-Api-Secret-Token');
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) return res.sendStatus(401);
  const def = registry.byKey(req.params.bot);
  const token = def && process.env[def.envToken];
  if (!token) return res.sendStatus(404);
  res.sendStatus(200); // أقرّ فورًا
  try { await adminPanel.handle(req.body, new Telegram(token, def.name)); }
  catch (e) { console.error('[webhook]', e.message); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🪶 روي API على المنفذ ${PORT}`));

module.exports = app;
