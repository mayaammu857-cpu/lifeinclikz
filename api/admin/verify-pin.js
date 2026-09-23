// api/admin/verify-pin.js — Vercel Serverless Function
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { pin } = req.body || {};
  const ADMIN_PIN = process.env.ADMIN_PIN;

  if (!ADMIN_PIN) {
    return res.status(500).json({ success: false, error: 'Admin PIN is not configured on the server' });
  }

  if (String(pin) === String(ADMIN_PIN)) {
    return res.json({ success: true, message: 'Authentication successful' });
  }
  return res.status(401).json({ success: false, error: 'Incorrect PIN passcode' });
};
