#!/usr/bin/env node
/* روي — ضبط/حذف webhooks للبوتات الستة.
 *   node scripts/set-webhooks.js set      → يضبط على PUBLIC_WEBHOOK_BASE/telegram/webhook/<bot>
 *   node scripts/set-webhooks.js delete   → يحذف (للعودة إلى long-polling)
 */
'use strict';
try { require('dotenv').config(); } catch {}
const { Telegram } = require('../bots/src/lib/telegram');
const { enabledBots } = require('../shared/botRegistry');

async function main() {
  const action = process.argv[2] || 'set';
  const base = process.env.PUBLIC_WEBHOOK_BASE;
  const secret = process.env.WEBHOOK_SECRET || '';
  const bots = enabledBots();
  if (!bots.length) { console.error('لا توكنات بوتات في البيئة.'); process.exit(1); }
  if (action === 'set' && !base) { console.error('عيّن PUBLIC_WEBHOOK_BASE أولًا.'); process.exit(1); }

  for (const def of bots) {
    const tg = new Telegram(process.env[def.envToken], def.name);
    try {
      if (action === 'delete') { await tg.deleteWebhook(); console.log(`🗑️  ${def.name}: حُذف webhook`); }
      else {
        const url = `${base.replace(/\/$/, '')}/telegram/webhook/${def.key}`;
        await tg.setWebhook(url, secret);
        console.log(`🔗 ${def.name}: ${url}`);
      }
    } catch (e) { console.error(`✗ ${def.name}: ${e.message}`); }
  }
}
main();
