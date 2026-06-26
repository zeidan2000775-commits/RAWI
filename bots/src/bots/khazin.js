/* بوت «الخازن» — المسابقات والأوسمة (Treasurer).
 * يدير مسابقة أسبوعية، يمنح الأوسمة للأكثر تفاعلًا، ويتحكم بعلم التحقيق من الدخل. */
'use strict';
const fb = require('../lib/firebaseAdmin');
const { getFlag, setFlag } = require('../lib/util');

/** يمنح وسامًا لمستخدم (الخادم فقط — يتجاوز قيود العميل). */
async function grantBadge(uid, badge) {
  if (!fb.db) return;
  await fb.db.collection('users').doc(uid).set(
    { badges: fb.FieldValue.arrayUnion(badge), updatedAt: fb.serverTimestamp() }, { merge: true });
  await fb.db.collection('notifications').doc(uid).collection('items').add({
    type: 'badge', actor: { displayName: 'روي' }, text: `حصلت على وسام «${badge}» 🏅`,
    read: false, createdAt: fb.serverTimestamp(),
  });
}

/** يحدّد منشور الأسبوع (الأعلى إعجابًا) ويمنح صاحبه وسامًا. */
async function weeklyAward() {
  if (!fb.db) return null;
  const since = Date.now() - 7 * 864e5;
  const snap = await fb.db.collection('posts').where('status', '==', 'published')
    .orderBy('createdAt', 'desc').limit(100).get();
  let best = null;
  snap.forEach((d) => { const p = d.data(); const c = p.counts?.likes || 0;
    if ((!best || c > best.likes) && p.authorId && p.authorId !== 'system_rawi') best = { id: d.id, uid: p.authorId, likes: c }; });
  if (best && best.likes > 0) { await grantBadge(best.uid, 'شاعر الأسبوع'); return best; }
  return null;
}

/** تبديل علم التحقيق من الدخل (Feature Flag). */
async function setMonetization(on) { await setFlag('monetizationEnabled', !!on); return on; }
async function getMonetization() { return getFlag('monetizationEnabled', false); }

async function tick() { return 0; } // الجوائز تُشغَّل عبر لوحة الأدمن/مهمة مجدولة

module.exports = { grantBadge, weeklyAward, setMonetization, getMonetization, tick };
