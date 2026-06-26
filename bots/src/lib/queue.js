/* روي — طابور المهام pending_tasks: إضافة/سحب-مع-قفل/إكمال.
 * قفل تشاؤمي بسيط عبر transaction لتفادي معالجة المهمة مرتين. */
'use strict';
const fb = require('./firebaseAdmin');

const LOCK_MS = 2 * 60 * 1000; // 2 دقيقة

async function enqueue(task) {
  if (!fb.db) return null;
  const ref = await fb.db.collection('pending_tasks').add({
    type: task.type, assignee: task.assignee, status: 'queued',
    payload: task.payload || {}, attempts: 0, lockedBy: null, lockedAt: null,
    createdAt: fb.serverTimestamp(), updatedAt: fb.serverTimestamp(),
  });
  return ref.id;
}

/** يسحب أقدم مهمة queued لهذا الـ assignee ويقفلها ذرّيًا. */
async function claim(assignee, workerId) {
  if (!fb.db) return null;
  const q = await fb.db.collection('pending_tasks')
    .where('assignee', '==', assignee).where('status', '==', 'queued')
    .orderBy('createdAt', 'asc').limit(1).get();
  if (q.empty) return null;
  const docRef = q.docs[0].ref;
  try {
    return await fb.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const d = snap.data();
      if (!d || d.status !== 'queued') return null;
      tx.update(docRef, { status: 'processing', lockedBy: workerId, lockedAt: fb.serverTimestamp(),
        attempts: (d.attempts || 0) + 1, updatedAt: fb.serverTimestamp() });
      return { id: snap.id, ...d };
    });
  } catch { return null; }
}

async function complete(id, result = {}) {
  if (!fb.db) return;
  await fb.db.collection('pending_tasks').doc(id).update({
    status: 'done', result, lockedBy: null, updatedAt: fb.serverTimestamp(),
  });
}

async function fail(id, error) {
  if (!fb.db) return;
  const ref = fb.db.collection('pending_tasks').doc(id);
  const snap = await ref.get();
  const attempts = snap.data()?.attempts || 0;
  // إعادة للطابور حتى 3 محاولات، ثم Dead Letter
  await ref.update({
    status: attempts >= 3 ? 'failed' : 'queued',
    lastError: String(error).slice(0, 300), lockedBy: null, updatedAt: fb.serverTimestamp(),
  });
}

module.exports = { enqueue, claim, complete, fail, LOCK_MS };
