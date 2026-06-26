/* روي — تهيئة Firebase Admin (الخادم). نسخة متطابقة منطقيًا مع نسخة البوتات. */
'use strict';
const admin = require('firebase-admin');
let db = null, ready = false;

function init() {
  if (ready) return { admin, db, ready };
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) { console.warn('[firebase] لا يوجد service account — وضع محدود.'); return { admin, db: null, ready: false }; }
  try {
    const svc = JSON.parse(raw);
    if (svc.private_key?.includes('\\n')) svc.private_key = svc.private_key.replace(/\\n/g, '\n');
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(svc), projectId: svc.project_id });
    db = admin.firestore(); db.settings({ ignoreUndefinedProperties: true }); ready = true;
    console.log('[firebase] جاهز:', svc.project_id);
  } catch (e) { console.error('[firebase] فشل:', e.message); }
  return { admin, db, ready };
}
module.exports = { init, admin, get db() { return db; } };
