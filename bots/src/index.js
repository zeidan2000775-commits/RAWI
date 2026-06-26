/* ======================================================================
 *  روي (RAWI) — مُشغّل البوتات الستة (Orchestrator)
 *  - يهيّئ Firebase Admin.
 *  - يشغّل long-polling لكل بوت مُفعّل (توكنه موجود في البيئة).
 *  - يوجّه أوامر/أزرار الأدمن إلى adminPanel.
 *  - يشغّل عمّال الطابور والمهام الدورية (الراوي/الناقد/الورّاق/الحارس/الخبير).
 *
 *  وضع التشغيل: long-polling (افتراضي) — مناسب لـ Render Background Worker.
 *  للنشر عبر webhook استخدم scripts/set-webhooks.js + خادم الـ API.
 * ==================================================================== */
'use strict';
try { require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); } catch {}

const { Telegram } = require('./lib/telegram');
const fb = require('./lib/firebaseAdmin');
const { BOTS, enabledBots } = require('../../shared/botRegistry');
const adminPanel = require('./bots/adminPanel');

const workers = {
  rawi: require('./bots/rawi'),
  naqid: require('./bots/naqid'),
  warraq: require('./bots/warraq'),
  haris: require('./bots/haris'),
  khazin: require('./bots/khazin'),
  khabir: require('./bots/khabir'),
};

const ADMIN = process.env.TELEGRAM_ADMIN_CHAT_ID;
let primaryTg = null; // أول بوت متاح يُستخدم لإشعارات الأدمن

async function main() {
  console.log('🪶 روي — تشغيل البوتات…');
  fb.init();

  const active = enabledBots();
  if (!active.length) {
    console.warn('⚠️  لا توجد توكنات بوتات في البيئة. عيّن BOT_*_TOKEN في .env');
  }

  // أنشئ عميل تيليجرام لكل بوت مُفعّل وابدأ الاستطلاع
  const clients = [];
  for (const def of active) {
    const token = process.env[def.envToken];
    const tg = new Telegram(token, def.name);
    try {
      const me = await tg.me();
      console.log(`  ${def.emoji} ${def.name} (${def.role}) ← @${me.username}`);
      await tg.deleteWebhook().catch(() => {});           // long-polling mode
      await tg.setMyCommands(adminPanel.COMMANDS).catch(() => {});
      clients.push({ def, tg });
      if (!primaryTg) primaryTg = tg;
    } catch (e) {
      console.error(`  ✗ ${def.name}: ${e.message}`);
    }
  }

  // سياق مشترك للعمّال (إشعار الأدمن)
  const ctx = {
    notifyAdmin: async (text) => { if (primaryTg && ADMIN) await primaryTg.sendMessage(ADMIN, text).catch(() => {}); },
  };

  // حلقة الاستطلاع لكل بوت (كلها توجّه إلى لوحة الأدمن)
  for (const { tg } of clients) {
    (async function loop() {
      while (true) { await tg.poll((u, t) => adminPanel.handle(u, t)); }
    })().catch((e) => console.error('poll loop crash:', e.message));
  }

  // عمّال الطابور (الراوي/الناقد/الورّاق) — كل 8 ثوانٍ
  if (fb.ready || fb.db) {
    setInterval(async () => {
      try { await workers.rawi.tick(); await workers.naqid.tick(); await workers.warraq.tick(); }
      catch (e) { console.error('queue tick:', e.message); }
    }, 8000);

    // الحارس — كل 5 دقائق (بلاغات + ملخص)
    setInterval(() => workers.haris.tick(ctx).catch((e) => console.error('haris:', e.message)), 5 * 60 * 1000);

    // الخبير — كل 15 دقيقة (تحديث الاتجاهات)
    setInterval(() => workers.khabir.tick(ctx).catch((e) => console.error('khabir:', e.message)), 15 * 60 * 1000);
    workers.khabir.tick(ctx).catch(() => {}); // تشغيل أولي

    if (ADMIN && primaryTg) primaryTg.sendMessage(ADMIN, '✅ <b>روي</b>: البوتات تعمل الآن. أرسل /panel للوحة التحكم.').catch(() => {});
  } else {
    console.warn('⚠️  Firebase غير مهيّأ — العمّال الدوريون معطّلون (الأوامر التفاعلية تعمل).');
  }

  console.log(`✅ يعمل ${clients.length}/${BOTS.length} بوتات. (الوضع: long-polling)`);
}

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e?.message || e));
main().catch((e) => { console.error('فشل التشغيل:', e); process.exit(1); });
