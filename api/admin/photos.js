// api/admin/photos.js — Vercel Serverless Function
// Lists all photos from Cloudinary (lifecycle/ folder) + local JSON vault
const fs = require('fs');
const path = require('path');

function cloudinaryAuth() {
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return Buffer.from(`${key}:${secret}`).toString('base64');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).end();

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const photos = [];

  // 1. Fetch from Cloudinary (uploaded via admin panel)
  try {
    const searchRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${cloudinaryAuth()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expression: 'folder:lifecycle',
          with_field: ['context', 'tags'],
          max_results: 500,
          sort_by: [{ created_at: 'desc' }]
        })
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      (data.resources || []).forEach(r => {
        const ctx = (r.context && r.context.custom) ? r.context.custom : {};
        photos.push({
          id: r.public_id.replace(/\//g, '_'),
          publicId: r.public_id,
          filename: r.filename || r.public_id.split('/').pop(),
          src: r.secure_url,
          title: ctx.title || r.filename || r.public_id.split('/').pop(),
          category: ctx.category || 'Archive',
          visibility: ctx.visibility || 'private',
          uploadDate: r.created_at,
          sizeBytes: r.bytes || 0,
          notes: ctx.notes || '',
          isCloudinary: true
        });
      });
    }
  } catch (e) {
    console.error('Cloudinary fetch error:', e.message);
  }

  // 2. Also include local vault JSON (the 84 photos committed in repo)
  try {
    const vaultFile = path.join(process.cwd(), 'data', 'admin-vault.json');
    if (fs.existsSync(vaultFile)) {
      const vaultData = JSON.parse(fs.readFileSync(vaultFile, 'utf8'));
      vaultData.forEach(item => {
        photos.push({
          id: item.id,
          publicId: null,
          filename: item.filename,
          src: item.src,
          title: item.title || item.filename,
          category: item.category || 'Archive',
          visibility: item.visibility || 'private',
          uploadDate: item.uploadDate,
          sizeBytes: item.sizeBytes || 0,
          notes: item.notes || '',
          isCloudinary: false
        });
      });
    }
  } catch (e) {
    console.error('Vault JSON read error:', e.message);
  }

  const stats = {
    total: photos.length,
    privateVaultCount: photos.filter(p => p.visibility === 'private').length,
    publicLiveCount: photos.filter(p => p.visibility === 'public').length,
    totalBytes: photos.reduce((acc, p) => acc + (p.sizeBytes || 0), 0)
  };

  return res.json({ success: true, stats, photos });
};
