/* روي — غلاف خفيف لـ Telegram Bot API (بلا تبعيات؛ يعتمد fetch المدمج). */
'use strict';

class Telegram {
  constructor(token, label = '') { this.token = token; this.label = label; this.offset = 0; }
  get base() { return `https://api.telegram.org/bot${this.token}`; }

  async call(method, params = {}) {
    const res = await fetch(`${this.base}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) throw new Error(`[${this.label} ${method}] ${data.description || res.status}`);
    return data.result;
  }

  me() { return this.call('getMe'); }
  sendMessage(chatId, text, extra = {}) {
    return this.call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
  }
  editMessage(chatId, msgId, text, extra = {}) {
    return this.call('editMessageText', { chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', ...extra });
  }
  answerCallback(id, text = '') { return this.call('answerCallbackQuery', { callback_query_id: id, text }); }
  setWebhook(url, secret) { return this.call('setWebhook', { url, secret_token: secret, drop_pending_updates: true }); }
  deleteWebhook() { return this.call('deleteWebhook', { drop_pending_updates: true }); }
  setMyCommands(commands) { return this.call('setMyCommands', { commands }); }

  /** long-polling: يجلب التحديثات ويستدعي handler لكل واحد. */
  async poll(handler, { timeout = 30 } = {}) {
    try {
      const updates = await this.call('getUpdates', { offset: this.offset, timeout, allowed_updates: ['message', 'callback_query'] });
      for (const u of updates) {
        this.offset = u.update_id + 1;
        try { await handler(u, this); } catch (e) { console.error(`[${this.label}] handler error:`, e.message); }
      }
    } catch (e) {
      if (!/terminated by other getUpdates|409/.test(e.message)) console.error(`[${this.label}] poll error:`, e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

/** أزرار Inline سهلة الإنشاء. */
const kb = (rows) => ({ reply_markup: { inline_keyboard: rows } });
const btn = (text, data) => ({ text, callback_data: data });

module.exports = { Telegram, kb, btn };
