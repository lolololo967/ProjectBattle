const crypto = require('crypto');

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
  const expires = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (Date.now() > parseInt(expires, 10)) return false;
  const expected = crypto
    .createHmac('sha256', process.env.ADMIN_PASSWORD)
    .update(expires)
    .digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

async function sb(path, options = {}) {
  return fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — public list of all news
  if (req.method === 'GET') {
    try {
      const r = await sb('news?order=created_at.desc&select=id,title,content,created_at,views,likes');
      const data = await r.json();
      return res.json(Array.isArray(data) ? data : []);
    } catch (e) {
      return res.status(500).json({ error: 'DB error' });
    }
  }

  // POST — create news (admin only)
  if (req.method === 'POST') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

    const { title, content } = req.body || {};
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });

    try {
      const r = await sb('news', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      const data = await r.json();
      return res.status(201).json(data);
    } catch (e) {
      return res.status(500).json({ error: 'DB error' });
    }
  }

  res.status(405).end();
};
