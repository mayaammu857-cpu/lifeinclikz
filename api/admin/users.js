// api/admin/users.js — Vercel Serverless Function
const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const usersFile = path.join(process.cwd(), 'data', 'users.json');

  if (req.method === 'GET') {
    try {
      const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      return res.json({ success: true, users });
    } catch (e) {
      return res.json({ success: true, users: [] });
    }
  }

  if (req.method === 'POST') {
    const newUser = req.body || {};
    if (!newUser.id) newUser.id = 'usr-' + Date.now();
    return res.json({ success: true, user: newUser, message: 'User added (update via git push to persist)' });
  }

  return res.status(405).end();
};
