// api/admin/galleries.js — Vercel Serverless Function
const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const platesFile = path.join(process.cwd(), 'data', 'all-81-plates.json');
    const platesData = JSON.parse(fs.readFileSync(platesFile, 'utf8'));

    const groups = {};
    platesData.forEach(plate => {
      const series = plate.series || 'Master Archive';
      if (!groups[series]) {
        groups[series] = { name: series, count: 0, coverImage: plate.src, plates: [] };
      }
      groups[series].count++;
      groups[series].plates.push(plate);
    });

    return res.json({ success: true, galleries: Object.values(groups) });
  } catch (e) {
    return res.json({ success: true, galleries: [] });
  }
};
