// api/admin/login.js — Email + Password Authentication
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body || {};

  const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(500).json({
      success: false,
      error: 'Admin authentication is not configured on the server. Please set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.'
    });
  }

  if (
    String(email).trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase() &&
    String(password) === String(ADMIN_PASSWORD)
  ) {
    return res.json({ success: true, message: 'Login successful' });
  }

  return res.status(401).json({ success: false, error: 'Incorrect email or password' });
};
