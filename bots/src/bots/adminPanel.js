/* روي — لوحة تحكم تيليجرام (Admin Panel) بأزرار Inline.
 * تستجيب لمعرّف الأدمن فقط (TELEGRAM_ADMIN_CHAT_ID). */
'use strict';
const { kb, btn } = require('../lib/telegram');
const queue = require('../lib/queue');
const fb = require('../lib/firebaseAdmin');
const { BOTS } = require('../../../shared/botRegistry');
const khabir = require('./khabir');
const khazin = require('./khazin');
const haris = require('./haris');

const ADMIN = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '');

function isAdmin(chatId) { return ADMIN && String(chatId) === ADMIN; }

const mainMenu = () => kb([
  [btn('🪶 توليد منشور', 'gen'), btn('📜 إثراء موسوعة', 'enrich')],
  [btn('📈 الاتجاهات', 'trend'), btn('📊 تقرير', 'report')],
  [btn('🏆 جائزة الأسبوع', 'award'), btn('🛡️ بلاغات', 'reports')],
  [btn('⚙️ الأعلام', 'flags'), btn('🛑 وضع القراءة', 'kill')],
]);

async function setReadOnly(on) {
  if (!fb.db) return;
  await fb.db.collection('config').doc('system').set({ readOnly: !!on, updatedAt: fb.serverTimestamp() }, { merge: true });
}
async function getReadOnly() {
  if (!fb.db) return false;
  const s = await fb.db.collection('config').doc('system').get();
  return s.exists ? s.data().readOnly === true : false;
}

/** يعالج رسالة نصية (أمر). */
async function onMessage(msg, tg) {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) { await tg.sendMessage(chatId, 'هذا البوت خاص بإدارة منصة «روي». 🌿'); return; }
  const text = (msg.text || '').trim();
  const [cmd, ...rest] = text.split(/\s+/);
  const arg = rest.join(' ');

  switch (cmd) {
    case '/start':
    case '/help':
    case '/panel':
      await tg.sendMessage(chatId, `🪶 <b>لوحة تحكم روي</b>\nأهلًا بك. اختر إجراءً:`, mainMenu());
      break;
    case '/generate':
      await queue.enqueue({ type: 'generate_post', assignee: 'rawi', payload: { topic: arg } });
      await tg.sendMessage(chatId, `✅ أُضيفت مهمة توليد${arg ? ` عن «${arg}»` : ''} إلى الطابور.`);
      break;
    case '/enrich': {
      const [kind, ...t] = rest;
      await queue.enqueue({ type: 'enrich', assignee: 'warraq', payload: { kind: kind || 'term', title: t.join(' ') } });
      await tg.sendMessage(chatId, `✅ أُضيفت مهمة إثراء موسوعة إلى الطابور.`);
      break;
    }
    case '/trend': {
      const t = await khabir.computeTrend();
      await tg.sendMessage(chatId, t ? `📈 الاتجاه: <b>${t.topic}</b>\n${t.tags.join(' ')}` : 'قاعدة البيانات غير متصلة.');
      break;
    }
    case '/report':
      await tg.sendMessage(chatId, await khabir.report());
      break;
    case '/killswitch':
      await setReadOnly(/on|تشغيل|1/i.test(arg));
      await tg.sendMessage(chatId, `🛑 وضع القراءة فقط: <b>${await getReadOnly() ? 'مُفعّل' : 'مُعطّل'}</b>`);
      break;
    default:
      await tg.sendMessage(chatId, 'أمر غير معروف. أرسل /panel للوحة التحكم.');
  }
}

/** يعالج ضغط زر Inline. */
async function onCallback(cb, tg) {
  const chatId = cb.message.chat.id;
  if (!isAdmin(chatId)) { await tg.answerCallback(cb.id, 'غير مصرّح'); return; }
  const data = cb.data;
  const reply = (t, extra) => tg.sendMessage(chatId, t, extra);

  switch (data) {
    case 'gen':
      await queue.enqueue({ type: 'generate_post', assignee: 'rawi', payload: {} });
      await tg.answerCallback(cb.id, 'أُضيفت مهمة توليد'); await reply('🪶 جارٍ توليد منشور جديد عبر الراوي ← الناقد ← النشر.');
      break;
    case 'enrich':
      await queue.enqueue({ type: 'enrich', assignee: 'warraq', payload: { kind: 'term' } });
      await tg.answerCallback(cb.id, 'أُضيفت مهمة إثراء'); await reply('📜 جارٍ إثراء الموسوعة عبر الورّاق.');
      break;
    case 'trend': {
      await tg.answerCallback(cb.id);
      const t = await khabir.computeTrend();
      await reply(t ? `📈 الاتجاه الحالي: <b>${t.topic}</b>\n${t.tags.join(' ')}\n(عيّنة: ${t.sampleSize})` : 'قاعدة البيانات غير متصلة.');
      break;
    }
    case 'report': await tg.answerCallback(cb.id); await reply(await khabir.report()); break;
    case 'award': {
      await tg.answerCallback(cb.id, 'جارٍ التحكيم…');
      const w = await khazin.weeklyAward();
      await reply(w ? `🏆 شاعر الأسبوع: <code>${w.uid}</code> بـ ${w.likes} إعجاب.` : 'لا مرشّح هذا الأسبوع.');
      break;
    }
    case 'reports': {
      await tg.answerCallback(cb.id);
      const d = await haris.digest();
      await reply(`🛡️ بلاغات مفتوحة: ${d.open}\n${d.lines.join('\n') || 'لا بلاغات.'}`);
      break;
    }
    case 'flags': {
      await tg.answerCallback(cb.id);
      const mon = await khazin.getMonetization();
      await reply(`⚙️ <b>الأعلام</b>\nالتحقيق من الدخل: ${mon ? '✅' : '❌'}`,
        kb([[btn(mon ? 'إيقاف التحقيق' : 'تفعيل التحقيق', 'flag:mon')]]));
      break;
    }
    case 'flag:mon': {
      const cur = await khazin.getMonetization();
      await khazin.setMonetization(!cur);
      await tg.answerCallback(cb.id, 'تم'); await reply(`التحقيق من الدخل الآن: ${!cur ? '✅ مُفعّل' : '❌ مُعطّل'}`);
      break;
    }
    case 'kill': {
      const cur = await getReadOnly(); await setReadOnly(!cur);
      await tg.answerCallback(cb.id, 'تم'); await reply(`🛑 وضع القراءة فقط: <b>${!cur ? 'مُفعّل' : 'مُعطّل'}</b>`);
      break;
    }
    default: await tg.answerCallback(cb.id);
  }
}

const COMMANDS = [
  { command: 'panel', description: 'لوحة التحكم' },
  { command: 'generate', description: 'توليد منشور [موضوع]' },
  { command: 'enrich', description: 'إثراء موسوعة [نوع] [عنوان]' },
  { command: 'trend', description: 'الاتجاه الحالي' },
  { command: 'report', description: 'تقرير المنصة' },
  { command: 'killswitch', description: 'وضع القراءة فقط on/off' },
];

/** نقطة الدخل لكل تحديث تيليجرام. */
async function handle(update, tg) {
  if (update.message) return onMessage(update.message, tg);
  if (update.callback_query) return onCallback(update.callback_query, tg);
}

module.exports = { handle, COMMANDS, isAdmin, setReadOnly, getReadOnly };
