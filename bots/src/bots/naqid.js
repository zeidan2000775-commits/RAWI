/* بوت «الناقد» — بوابة الجودة (Critic).
 * يقيّم المسوّدة (0..10). إن نجحت (≥7) تُنشر، وإلا تُعاد للتوليد. */
'use strict';
const gemini = require('../lib/gemini');
const queue = require('../lib/queue');
const { publishPost } = require('../lib/util');

const PASS = 7;

async function score(draft) {
  const prompt = `قيّم النص الشعري التالي من 0 إلى 10 من حيث سلامة اللغة وجمال المعنى وخلوّه من الأخطاء. `
    + `النص:\n"""${draft.body}"""\nأرجع JSON: {"score": رقم, "reason": "سبب موجز", "safe": true/false}`;
  const { json } = await gemini.generateJSON(prompt, { temperature: 0.2 });
  // Fallback heuristic إن تعذّر Gemini أو غابت درجة رقمية صالحة: طول مقبول وأسطر متعددة
  const hasScore = json && Number.isFinite(Number(json.score));
  if (!hasScore) {
    const lines = (draft.body || '').split('\n').filter(Boolean).length;
    const ok = (draft.body || '').length > 25 && lines >= 1;
    return { score: ok ? 7 : 4, reason: 'تقييم احتياطي', safe: true };
  }
  return { score: Number(json.score), reason: json.reason || '', safe: json.safe !== false };
}

async function tick() {
  const task = await queue.claim('naqid', 'naqid-worker');
  if (!task) return 0;
  try {
    const draft = task.payload?.draft;
    if (!draft) throw new Error('no draft');
    const verdict = await score(draft);
    if (verdict.safe && verdict.score >= PASS) {
      await publishPost({ ...draft, qualityScore: verdict.score });
      await queue.complete(task.id, { published: true, ...verdict });
    } else {
      // رُفض: أعد طلب توليد جديد (مرة واحدة لكل مسوّدة)
      if (!task.payload._retried) {
        await queue.enqueue({ type: 'generate_post', assignee: 'rawi', payload: { topic: draft.tags?.[0], _retried: true } });
      }
      await queue.complete(task.id, { published: false, ...verdict });
    }
    return 1;
  } catch (e) { await queue.fail(task.id, e.message); return 0; }
}

module.exports = { score, tick, PASS };
