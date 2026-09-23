// api/admin/login.js — Email + Password Authentication
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const { email, password } = body || {};
  const inputEmail = String(email || '').trim().toLowerCase();
  const inputPass  = String(password || '').trim();

  // Configured or default admin credentials
  const validEmails = new Set([
    'jd5137757@gmail.com',
    'ranjith@lifeinclicks.ca',
    'admin@lifeinclicks.ca',
    'admin',
    'anandns196@gmail.com',
    String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  ].filter(Boolean));

  const validPasswords = new Set([
    'Clicks@844',
    'clicks@844',
    '8899',
    'admin',
    'admin123',
    'loop@gmail90',
    String(process.env.ADMIN_PASSWORD || '').trim(),
    String(process.env.ADMIN_PIN || '').trim()
  ].filter(Boolean));

  // If password matches any valid admin key (Clicks@844, 8899, admin, etc.)
  if (validPasswords.has(inputPass) || (validEmails.has(inputEmail) && validPasswords.has(inputPass))) {
    return res.json({ success: true, message: 'Login successful' });
  }

  return res.status(401).json({
    success: false,
    error: 'Incorrect email or password.'
  });
};
