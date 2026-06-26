#!/usr/bin/env node
/* روي — بذر بيانات أولية: مداخل موسوعة + منشورات مختارة + إعدادات النظام.
 *   node scripts/seed.js
 * يتطلب FIREBASE_SERVICE_ACCOUNT_JSON. آمن لإعادة التشغيل (idempotent عبر معرّفات ثابتة).
 */
'use strict';
try { require('dotenv').config(); } catch {}
const fb = require('../bots/src/lib/firebaseAdmin');
const { tokenize } = require('../bots/src/lib/util');

const ENC = [
  { id: 'poet-mutanabbi', kind: 'poet', title: 'أبو الطيب المتنبي', era: 'العصر العباسي',
    summary: 'أعظم شعراء العربية، صاحب الحكمة والفخر.',
    body: 'أحمد بن الحسين الجعفي الكوفي (303–354هـ)، شاعرٌ حكيمٌ ملأ الدنيا وشغل الناس. اتصل بسيف الدولة الحمداني فكانت أزهى مراحله.' },
  { id: 'poet-shabbi', kind: 'poet', title: 'أبو القاسم الشابي', era: 'العصر الحديث',
    summary: 'شاعر تونس وصاحب «إرادة الحياة».',
    body: 'شاعرٌ تونسيٌّ رومانسيّ (1909–1934)، من رموز الشعر العربي الحديث، اشتهر بنشيد «إرادة الحياة».' },
  { id: 'term-qafiya', kind: 'term', title: 'القافية', era: 'علم العروض',
    summary: 'آخر ساكنين في البيت وما بينهما.',
    body: 'القافية مجموعة الأصوات الأخيرة المتكررة في القصيدة، تمنحها وحدتها الصوتية.' },
  { id: 'meter-taweel', kind: 'meter', title: 'البحر الطويل', era: 'علم العروض',
    summary: 'فعولن مفاعيلن فعولن مفاعيلن.',
    body: 'الطويل أشهر بحور الشعر العربي وأكثرها ورودًا، نظم عليه الفحول كثيرًا من روائعهم.' },
];
const POSTS = [
  { id: 'seed-azm', type: 'poem', title: 'على قدر أهل العزم', meter: 'الطويل', theme: { id: 'ink' },
    body: 'على قدرِ أهلِ العزمِ تأتي العزائمُ\nوتأتي على قدرِ الكرامِ المكارمُ',
    author: { username: 'al_mutanabbi', displayName: 'أبو الطيب المتنبي', badges: ['poet', 'verified'] }, tags: ['حكمة', 'فخر'] },
  { id: 'seed-sabr', type: 'poem', title: 'دع الأيام', meter: 'الوافر', theme: { id: 'toot' },
    body: 'دعِ الأيامَ تفعلُ ما تشاءُ\nوطِبْ نفسًا إذا حكمَ القضاءُ',
    author: { username: 'al_shafii', displayName: 'الإمام الشافعي', badges: ['poet', 'verified'] }, tags: ['صبر', 'حكمة'] },
];

async function main() {
  fb.init();
  if (!fb.db) { console.error('FIREBASE_SERVICE_ACCOUNT_JSON غير مضبوط.'); process.exit(1); }
  const now = fb.serverTimestamp();

  await fb.db.collection('config').doc('system').set({ readOnly: false, maintenance: false, minVersion: '1.0.0' }, { merge: true });
  await fb.db.collection('config').doc('flags').set({ monetizationEnabled: false, ambientAudio: true, premiumBadges: false }, { merge: true });
  await fb.db.collection('config').doc('current_trend').set({ topic: 'الحكمة في شعر المتنبي', tags: ['#حكمة', '#فخر', '#المتنبي'], updatedAt: now }, { merge: true });
  console.log('✓ config');

  for (const e of ENC) {
    await fb.db.collection('encyclopedia').doc(e.id).set(
      { ...e, searchTokens: tokenize(e.title, e.summary, e.body, e.era), views: 0, source: 'seed', createdAt: now, updatedAt: now }, { merge: true });
  }
  console.log(`✓ ${ENC.length} مداخل موسوعة`);

  for (const p of POSTS) {
    await fb.db.collection('posts').doc(p.id).set({
      ...p, authorId: 'system_rawi', source: 'seed', status: 'published', isFeatured: false, isDeleted: false,
      qualityScore: 9, searchTokens: tokenize(p.title, p.body, (p.tags || []).join(' ')),
      counts: { likes: 120, comments: 6, bookmarks: 30, views: 2400, shares: 4 }, createdAt: now, updatedAt: now,
    }, { merge: true });
  }
  console.log(`✓ ${POSTS.length} منشورات`);
  console.log('🌱 اكتمل البذر.');
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
