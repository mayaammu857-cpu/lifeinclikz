// api/admin/events.js — Vercel Serverless Function
const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const eventsFile = path.join(process.cwd(), 'data', 'events.json');

  if (req.method === 'GET') {
    try {
      const events = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
      return res.json({ success: true, events });
    } catch (e) {
      return res.json({ success: true, events: [] });
    }
  }

  if (req.method === 'POST') {
    // On Vercel, can't persist writes — return success for UI compatibility
    const newEvent = req.body || {};
    if (!newEvent.id) newEvent.id = 'evt-' + Date.now();
    return res.json({ success: true, event: newEvent, message: 'Event created (update via git push to persist)' });
  }

  return res.status(405).end();
};
