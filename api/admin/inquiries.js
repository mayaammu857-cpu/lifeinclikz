// api/admin/inquiries.js — Vercel Serverless Function
const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const inquiriesFile = path.join(process.cwd(), 'data', 'inquiries.json');

  if (req.method === 'GET') {
    try {
      const inquiries = JSON.parse(fs.readFileSync(inquiriesFile, 'utf8'));
      return res.json({ success: true, inquiries });
    } catch (e) {
      return res.json({ success: true, inquiries: [] });
    }
  }

  if (req.method === 'POST') {
    // Can't persist on Vercel — admin.js localStorage handles CRM data
    const newInquiry = req.body || {};
    if (!newInquiry.id) newInquiry.id = 'deal_' + Date.now();
    if (!newInquiry.createdAt) newInquiry.createdAt = new Date().toISOString();
    return res.json({ success: true, inquiry: newInquiry, message: 'Inquiry received' });
  }

  return res.status(405).end();
};
