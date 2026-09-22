// api/admin/inquiries/update.js — Vercel Serverless Function
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  // On Vercel, localStorage in admin.js is the primary CRM store
  const body = req.body || {};
  return res.json({
    success: true,
    inquiry: body,
    message: 'Deal status updated (stored in localStorage)'
  });
};
