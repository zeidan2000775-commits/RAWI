/* روي — عميل Gemini مع إعادة المحاولة (Exponential Backoff) + Fallback محلي.
 * لا يفشل خط الأنابيب أبدًا: عند تعذّر Gemini يعود لمولّد محلي من معجم مختار. */
'use strict';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const KEY = process.env.GEMINI_API_KEY || '';
const ENDPOINT = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(prompt, { temperature = 0.9, retries = 3 } = {}) {
  if (!KEY) return { text: fallback(prompt), source: 'fallback', reason: 'no_key' };
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(ENDPOINT(MODEL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: 800, topP: 0.95 },
        }),
      });
      if (res.status === 429 || res.status >= 500) throw new Error('rate/' + res.status);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      if (!text) throw new Error('empty');
      return { text: text.trim(), source: 'gemini' };
    } catch (e) {
      lastErr = e;
      await sleep(2 ** i * 1000); // 1s, 2s, 4s
    }
  }
  console.warn('[gemini] تعذّر التوليد، استخدام Fallback:', lastErr?.message);
  return { text: fallback(prompt), source: 'fallback', reason: lastErr?.message };
}

/** يطلب JSON منظّمًا ويحاول تحليله بأمان. */
async function generateJSON(prompt, opts = {}) {
  const { text, source } = await generate(prompt + '\n\nأعد الإجابة بصيغة JSON صالحة فقط دون أي شرح.', opts);
  const m = text.match(/\{[\s\S]*\}/);
  try { return { json: JSON.parse(m ? m[0] : text), source }; }
  catch { return { json: null, source, raw: text }; }
}

/* ---- مولّد احتياطي محلي (معجم مختار من التراث) ---- */
const CORPUS = [
  { type: 'poem', title: 'في العزم', meter: 'الطويل',
    body: 'على قدرِ أهلِ العزمِ تأتي العزائمُ\nوتأتي على قدرِ الكرامِ المكارمُ' },
  { type: 'quote', title: '', meter: '',
    body: 'العلمُ يرفعُ بيتًا لا عمادَ لهُ\nوالجهلُ يهدمُ بيتَ العزِّ والشرفِ' },
  { type: 'poem', title: 'الصبر', meter: 'الوافر',
    body: 'دعِ الأيامَ تفعلُ ما تشاءُ\nوطِبْ نفسًا إذا حكمَ القضاءُ' },
  { type: 'story', title: 'حكمة', meter: '',
    body: 'قيلَ لحكيمٍ: ما الغِنى؟ قال: قِلّةُ تمنّيك، ورِضاك بما يكفيك.' },
];
function fallback() { return JSON.stringify(CORPUS[Math.floor(Math.random() * CORPUS.length)]); }

module.exports = { generate, generateJSON, MODEL };
