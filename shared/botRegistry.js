/* ======================================================================
 *  روي (RAWI) — سجلّ البوتات الستة (مصدر واحد للحقيقة)
 *  اختير 6 بوتات من 7 المتاحة، وأُسندت لأدوار وظيفية واضحة.
 *  التوكنات تُقرأ من process.env فقط (لا Hardcoded Secrets).
 * ==================================================================== */
'use strict';

/** @typedef {{key:string,name:string,role:string,envToken:string,emoji:string,desc:string}} BotDef */

/** @type {BotDef[]} */
const BOTS = [
  { key: 'rawi',   name: 'الراوي',  role: 'Narrator',  emoji: '🪶', envToken: 'BOT_RAWI_TOKEN',
    desc: 'مولّد المحتوى: ينشئ القصائد والاقتباسات والحِكَم عبر Gemini ويضعها في الطابور.' },
  { key: 'naqid',  name: 'الناقد',  role: 'Critic',    emoji: '⚖️', envToken: 'BOT_NAQID_TOKEN',
    desc: 'بوابة الجودة: يقيّم المحتوى المُولَّد (0..10) ويرفض أو يعتمد قبل النشر.' },
  { key: 'warraq', name: 'الورّاق', role: 'Scribe',    emoji: '📜', envToken: 'BOT_WARRAQ_TOKEN',
    desc: 'الموسوعة: يبني ويثري مداخل الشعراء والمصطلحات والبحور، والأرشفة الباردة.' },
  { key: 'haris',  name: 'الحارس',  role: 'Guardian',  emoji: '🛡️', envToken: 'BOT_HARIS_TOKEN',
    desc: 'الإشراف: يعالج البلاغات، الحظر الناعم، وملخصات الإشعارات (Digests).' },
  { key: 'khazin', name: 'الخازن',  role: 'Treasurer', emoji: '🏆', envToken: 'BOT_KHAZIN_TOKEN',
    desc: 'المسابقات والأوسمة، والتحكم في علم التحقيق من الدخل (MONETIZATION_ENABLED).' },
  { key: 'khabir', name: 'الخبير',  role: 'Analyst',   emoji: '📈', envToken: 'BOT_KHABIR_TOKEN',
    desc: 'التحليلات والاتجاهات: يحدّث config/current_trend والتقارير اليومية.' },
];

const byKey = (k) => BOTS.find((b) => b.key === k);
const tokenOf = (k) => process.env[byKey(k)?.envToken || ''] || '';
const enabledBots = () => BOTS.filter((b) => !!process.env[b.envToken]);

module.exports = { BOTS, byKey, tokenOf, enabledBots };
