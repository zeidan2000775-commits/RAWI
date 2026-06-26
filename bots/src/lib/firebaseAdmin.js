/* روي — تهيئة Firebase Admin SDK من متغيرات البيئة (مرة واحدة، مشتركة). */
'use strict';
const admin = require('firebase-admin');

let app = null, db = null, ready = false;

function init() {
  if (ready) return { admin, db, app, ready };
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn('[firebase] FIREBASE_SERVICE_ACCOUNT_JSON غير مضبوط — عمليات قاعدة البيانات معطّلة.');
    return { admin, db: null, app: null, ready: false };
  }
  try {
    const svc = JSON.parse(raw);
    if (svc.private_key && svc.private_key.includes('\\n')) svc.private_key = svc.private_key.replace(/\\n/g, '\n');
    app = admin.apps.length ? admin.app() : admin.initializeApp({
      credential: admin.credential.cert(svc),
      projectId: svc.project_id || process.env.FIREBASE_PROJECT_ID,
    });
    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    ready = true;
    console.log('[firebase] Admin SDK جاهز (project:', svc.project_id + ')');
  } catch (e) {
    console.error('[firebase] فشل التهيئة:', e.message);
  }
  return { admin, db, app, ready };
}

const FieldValue = admin.firestore.FieldValue;
const serverTimestamp = () => FieldValue.serverTimestamp();

module.exports = { init, get db() { return db; }, admin, FieldValue, serverTimestamp };
