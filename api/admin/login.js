// api/admin/login.js — Email + Password Authentication
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body || {};

  const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'jd5137757@gmail.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Clicks@844';

  if (
    String(email).trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase() &&
    String(password) === String(ADMIN_PASSWORD)
  ) {
    return res.json({ success: true, message: 'Login successful' });
  }

  return res.status(401).json({ success: false, error: 'Incorrect email or password' });
};
