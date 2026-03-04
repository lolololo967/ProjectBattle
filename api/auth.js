const crypto = require('crypto');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body || {};
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Неверный пароль' });
  }

  const expires = String(Date.now() + 86400000); // 24h
  const sig = crypto
    .createHmac('sha256', process.env.ADMIN_PASSWORD)
    .update(expires)
    .digest('hex');

  return res.json({ ok: true, token: `${expires}.${sig}` });
};
