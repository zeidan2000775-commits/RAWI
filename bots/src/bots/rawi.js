/* بوت «الراوي» — مولّد المحتوى (Narrator).
 * يسحب مهام التوليد، يستدعي Gemini، ثم يرسل الناتج للناقد عبر الطابور. */
'use strict';
const gemini = require('../lib/gemini');
const queue = require('../lib/queue');

const THEMES = ['ink', 'sahra', 'rawdah', 'toot', 'layl', 'ward', 'bahr', 'turab'];
const TOPICS = ['الحكمة', 'العزّة والفخر', 'الصبر', 'الغزل العفيف', 'الوطن', 'العلم والمعرفة', 'الأمل', 'الزهد'];

function buildPrompt(topic, type) {
  const t = topic || TOPICS[Math.floor(Math.random() * TOPICS.length)];
  return `أنت شاعر عربي فصيح. أنشئ ${type === 'quote' ? 'بيتين من الحكمة' : 'مقطوعة شعرية من 4 أبيات'} `
    + `في موضوع «${t}» على نمط الشعر العربي الكلاسيكي الفصيح، بلغة سليمة وبلا أخطاء عروضية واضحة. `
    + `أرجع النتيجة JSON بالحقول: {"type":"poem|quote","title":"عنوان قصير","meter":"اسم البحر","body":"النص مع \\n بين الأبيات","tags":["وسم","وسم"]}`;
}

/** يولّد منشورًا واحدًا (يُستخدم من الطابور ومن لوحة الأدمن). */
async function generate(payload = {}) {
  const type = payload.type || (Math.random() < 0.35 ? 'quote' : 'poem');
  const { json, source } = await gemini.generateJSON(buildPrompt(payload.topic, type), { temperature: 1.0 });
  const data = json || {};
  return {
    type: data.type || type,
    title: (data.title || '').slice(0, 60),
    body: (data.body || '').slice(0, 600),
    meter: data.meter || '',
    tags: Array.isArray(data.tags) ? data.tags.slice(0, 5) : [],
    theme: { id: THEMES[Math.floor(Math.random() * THEMES.length)] },
    source: 'bot:rawi',
    _aiSource: source,
  };
}

/** دورة عمل: اسحب مهمة generate_post، ولّد، ثم أنشئ مهمة مراجعة للناقد. */
async function tick() {
  const task = await queue.claim('rawi', 'rawi-worker');
  if (!task) return 0;
  try {
    const draft = await generate(task.payload);
    if (!draft.body) throw new Error('empty draft');
    await queue.enqueue({ type: 'review', assignee: 'naqid', payload: { draft } });
    await queue.complete(task.id, { generated: true, aiSource: draft._aiSource });
    return 1;
  } catch (e) { await queue.fail(task.id, e.message); return 0; }
}

module.exports = { generate, tick };
