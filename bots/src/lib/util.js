/* روي — أدوات مشتركة: توليد التوكنات للبحث، النشر، الإعدادات. */
'use strict';
const fb = require('./firebaseAdmin');

const STOP = new Set(['في','من','على','عن','إلى','أن','إن','ما','لا','و','هو','هي','قد','هذا','هذه','التي','الذي','مع','كل']);
function tokenize(...parts) {
  const text = parts.filter(Boolean).join(' ').toLowerCase();
  const words = text.replace(/[^؀-ۿ\s\w]/g, ' ').split(/\s+/)
    .map((w) => w.replace(/^[الـ]+/, '')).filter((w) => w.length >= 2 && !STOP.has(w));
  return [...new Set(words)].slice(0, 40);
}

async function getFlag(name, def = false) {
  if (!fb.db) return def;
  const s = await fb.db.collection('config').doc('flags').get();
  return s.exists ? (s.data()[name] ?? def) : def;
}
async function setFlag(name, value) {
  if (!fb.db) return;
  await fb.db.collection('config').doc('flags').set({ [name]: value, updatedAt: fb.serverTimestamp() }, { merge: true });
}
async function isReadOnly() {
  if (!fb.db) return false;
  const s = await fb.db.collection('config').doc('system').get();
  return s.exists ? s.data().readOnly === true : false;
}

/** ينشر منشورًا منسّقًا في مجموعة posts (status=published). */
async function publishPost(post) {
  if (!fb.db) return null;
  const doc = {
    type: post.type || 'poem',
    title: post.title || '',
    body: post.body,
    meter: post.meter || null,
    theme: post.theme || { id: 'ink' },
    tags: post.tags || [],
    searchTokens: tokenize(post.title, post.body, (post.tags || []).join(' ')),
    author: post.author || { username: 'rawi_daily', displayName: 'روي · المختارات', badges: ['verified'] },
    authorId: post.authorId || 'system_rawi',
    counts: { likes: 0, comments: 0, bookmarks: 0, views: 0, shares: 0 },
    source: post.source || 'bot:rawi',
    qualityScore: post.qualityScore || 0,
    status: 'published',
    isFeatured: false, isDeleted: false,
    createdAt: fb.serverTimestamp(), updatedAt: fb.serverTimestamp(),
  };
  const ref = await fb.db.collection('posts').add(doc);
  return ref.id;
}

module.exports = { tokenize, getFlag, setFlag, isReadOnly, publishPost };
