/* بوت «الخبير» — التحليلات والاتجاهات (Analyst).
 * يحلّل المنشورات الحديثة، يحسب الوسوم الرائجة، ويحدّث config/current_trend. */
'use strict';
const fb = require('../lib/firebaseAdmin');

async function computeTrend() {
  if (!fb.db) return null;
  const snap = await fb.db.collection('posts').where('status', '==', 'published')
    .orderBy('createdAt', 'desc').limit(120).get();
  const tagScore = {};
  let topPost = null;
  snap.forEach((d) => {
    const p = d.data();
    const weight = 1 + (p.counts?.likes || 0) * 0.1 + (p.counts?.comments || 0) * 0.2;
    (p.tags || []).forEach((t) => { tagScore[t] = (tagScore[t] || 0) + weight; });
    if (!topPost || (p.counts?.likes || 0) > (topPost.likes || 0)) topPost = { title: p.title, likes: p.counts?.likes || 0 };
  });
  const tags = Object.entries(tagScore).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t.startsWith('#') ? t : '#' + t);
  const topic = topPost?.title || (tags[0] ? tags[0].replace('#', '') : 'مختارات اليوم');
  return { topic, tags, sampleSize: snap.size };
}

async function tick(ctx) {
  if (!fb.db) return 0;
  const trend = await computeTrend();
  if (!trend) return 0;
  await fb.db.collection('config').doc('current_trend').set(
    { topic: trend.topic, tags: trend.tags, updatedAt: fb.serverTimestamp() }, { merge: true });
  return 1;
}

/** تقرير يومي موجز للأدمن. */
async function report() {
  if (!fb.db) return 'لا بيانات.';
  const [posts, users] = await Promise.all([
    fb.db.collection('posts').where('status', '==', 'published').count().get().catch(() => null),
    fb.db.collection('users').count().get().catch(() => null),
  ]);
  const t = await computeTrend();
  return `📈 <b>تقرير الخبير</b>\nمنشورات منشورة: ${posts?.data().count ?? '—'}\nمستخدمون: ${users?.data().count ?? '—'}\n`
    + `الاتجاه: ${t?.topic || '—'}\n${(t?.tags || []).join(' ')}`;
}

module.exports = { computeTrend, tick, report };
