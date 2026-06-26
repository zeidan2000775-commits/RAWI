/* بوت «الورّاق» — الموسوعة والأرشفة (Scribe).
 * ينشئ ويُثري مداخل الموسوعة (شعراء/مصطلحات/بحور/عصور). */
'use strict';
const gemini = require('../lib/gemini');
const queue = require('../lib/queue');
const fb = require('../lib/firebaseAdmin');
const { tokenize } = require('../lib/util');

async function buildEntry(payload) {
  const kind = payload.kind || 'term';
  const subject = payload.title || 'القافية';
  const kindAr = { poet: 'شاعر عربي', term: 'مصطلح بلاغي/عروضي', meter: 'بحر شعري', era: 'عصر أدبي' }[kind];
  const prompt = `اكتب مدخل موسوعة عربية عن «${subject}» باعتباره ${kindAr}. `
    + `أرجع JSON: {"title":"","summary":"سطر واحد","body":"فقرة 3-4 أسطر","era":"الحقبة","related":["مدخل","مدخل"]}`;
  const { json } = await gemini.generateJSON(prompt, { temperature: 0.5 });
  const d = json || { title: subject, summary: subject, body: subject, era: '', related: [] };
  return {
    kind, title: d.title || subject, summary: (d.summary || '').slice(0, 160),
    body: (d.body || '').slice(0, 1200), era: d.era || '',
    related: Array.isArray(d.related) ? d.related.slice(0, 5) : [],
    searchTokens: tokenize(d.title || subject, d.summary, d.body, d.era),
    views: 0, source: 'bot:warraq',
    createdAt: fb.serverTimestamp(), updatedAt: fb.serverTimestamp(),
  };
}

async function tick() {
  const task = await queue.claim('warraq', 'warraq-worker');
  if (!task) return 0;
  try {
    const entry = await buildEntry(task.payload || {});
    if (fb.db) await fb.db.collection('encyclopedia').add(entry);
    await queue.complete(task.id, { title: entry.title });
    return 1;
  } catch (e) { await queue.fail(task.id, e.message); return 0; }
}

module.exports = { buildEntry, tick };
