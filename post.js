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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id, action } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  // GET — single post
  if (req.method === 'GET') {
    const r = await sb(`news?id=eq.${id}&select=id,title,content,created_at,views,likes`);
    const data = await r.json();
    if (!Array.isArray(data) || !data.length) return res.status(404).json({ error: 'Not found' });
    return res.json(data[0]);
  }

  // POST — actions: view | like
  if (req.method === 'POST') {
    if (action === 'view') {
      // read current, increment, write back
      const r = await sb(`news?id=eq.${id}&select=views`);
      const data = await r.json();
      if (!Array.isArray(data) || !data.length) return res.status(404).json({ error: 'Not found' });
      const newViews = (data[0].views || 0) + 1;
      await sb(`news?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ views: newViews }),
      });
      return res.json({ ok: true, views: newViews });
    }

    if (action === 'like') {
      const { unlike } = req.body || {};
      const r = await sb(`news?id=eq.${id}&select=likes`);
      const data = await r.json();
      if (!Array.isArray(data) || !data.length) return res.status(404).json({ error: 'Not found' });
      const current = data[0].likes || 0;
      const newLikes = unlike ? Math.max(0, current - 1) : current + 1;
      await sb(`news?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ likes: newLikes }),
      });
      return res.json({ ok: true, likes: newLikes });
    }

    return res.status(400).json({ error: 'unknown action' });
  }

  // PUT — update post (admin only)
  if (req.method === 'PUT') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

    const { title, content } = req.body || {};
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });

    const r = await sb(`news?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, content }),
    });
    const data = await r.json();
    return res.json(data);
  }

  // DELETE — delete post (admin only)
  if (req.method === 'DELETE') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

    await sb(`news?id=eq.${id}`, { method: 'DELETE' });
    return res.json({ ok: true });
  }

  res.status(405).end();
};
