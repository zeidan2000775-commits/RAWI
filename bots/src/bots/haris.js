/* بوت «الحارس» — الإشراف والبلاغات (Guardian).
 * يعالج البلاغات المفتوحة، يطبّق الحظر الناعم، ويُرسل ملخص إشعارات للأدمن. */
'use strict';
const fb = require('../lib/firebaseAdmin');

const THRESHOLD = 3; // بلاغات لنفس الهدف ⇐ حظر ناعم تلقائي

/** يجمّع البلاغات المفتوحة ويعيد ملخصًا (Notification Digest). */
async function digest() {
  if (!fb.db) return { open: 0, lines: [] };
  const snap = await fb.db.collection('reports').where('status', '==', 'open').limit(50).get();
  const byTarget = {};
  snap.forEach((d) => { const r = d.data(); const k = `${r.targetType}:${r.targetId}`; (byTarget[k] = byTarget[k] || []).push(d.id); });
  const lines = Object.entries(byTarget).map(([k, ids]) => `• ${k} — ${ids.length} بلاغ`);
  return { open: snap.size, groups: byTarget, lines };
}

/** يطبّق الحظر الناعم على الأهداف المتجاوزة للحد. */
async function enforce() {
  if (!fb.db) return 0;
  const { groups } = await digest();
  let acted = 0;
  for (const [key, ids] of Object.entries(groups || {})) {
    if (ids.length < THRESHOLD) continue;
    const [type, id] = key.split(':');
    if (type === 'user') {
      await fb.db.collection('users').doc(id).set({ isShadowBanned: true, updatedAt: fb.serverTimestamp() }, { merge: true });
      acted++;
    } else if (type === 'post') {
      await fb.db.collection('posts').doc(id).set({ status: 'pending', isDeleted: true, updatedAt: fb.serverTimestamp() }, { merge: true });
      acted++;
    }
  }
  return acted;
}

/** دورة عمل دورية: يطبّق ويُرسل ملخصًا للأدمن عند وجود بلاغات. */
async function tick(ctx) {
  if (!fb.db) return 0;
  const acted = await enforce();
  const d = await digest();
  if (d.open > 0 && ctx?.notifyAdmin) {
    await ctx.notifyAdmin(`🛡️ <b>الحارس</b> — بلاغات مفتوحة: ${d.open}\n${d.lines.join('\n')}\nإجراءات تلقائية: ${acted}`);
  }
  return acted;
}

module.exports = { digest, enforce, tick, THRESHOLD };
