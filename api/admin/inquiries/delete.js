// api/admin/inquiries/delete.js — Vercel Serverless Function
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  // localStorage in admin.js handles CRM data on Vercel
  return res.json({ success: true, message: 'Inquiry removed' });
};
