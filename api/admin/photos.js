// api/admin/photos.js — Vercel Serverless Function
// Lists all photos from Cloudinary (lifecycle/ folder) + local Master Vault (84 photos)
const fs = require('fs');
const path = require('path');

function cloudinaryAuth() {
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!key || !secret) return null;
  return Buffer.from(`${key}:${secret}`).toString('base64');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).end();

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const photosMap = new Map();

  // 1. Fetch from Cloudinary (if configured)
  const auth = cloudinaryAuth();
  if (cloudName && auth) {
    try {
      const searchRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
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
          const filename = r.filename || r.public_id.split('/').pop();
          photosMap.set(filename, {
            id: r.public_id.replace(/\//g, '_'),
            publicId: r.public_id,
            filename: filename,
            src: r.secure_url,
            title: ctx.title || filename,
            category: ctx.category || 'Cloud Uploads',
            series: ctx.series || ctx.category || 'Cloud',
            visibility: ctx.visibility || 'public',
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
  }

  // 2. Load Master Vault JSON (the 84 photos in repository)
  let vaultData = [];
  try {
    vaultData = require('../../data/admin-vault.json');
  } catch (e) {
    try {
      const vaultFile = path.join(process.cwd(), 'data', 'admin-vault.json');
      if (fs.existsSync(vaultFile)) {
        vaultData = JSON.parse(fs.readFileSync(vaultFile, 'utf8'));
      }
    } catch (err) {
      console.error('Vault file read error:', err.message);
    }
  }

  // 3. Fallback to all-81-plates.json if needed
  let platesData = [];
  try {
    platesData = require('../../data/all-81-plates.json');
  } catch (e) {
    try {
      const platesFile = path.join(process.cwd(), 'data', 'all-81-plates.json');
      if (fs.existsSync(platesFile)) {
        platesData = JSON.parse(fs.readFileSync(platesFile, 'utf8'));
      }
    } catch (err) {}
  }

  // Merge vault entries into photosMap
  if (Array.isArray(vaultData) && vaultData.length > 0) {
    vaultData.forEach(item => {
      if (!photosMap.has(item.filename)) {
        photosMap.set(item.filename, {
          id: item.id || ('img_' + item.filename),
          publicId: null,
          filename: item.filename,
          src: item.src || `images/${item.filename}`,
          title: item.title || item.filename,
          category: item.category || item.series || 'Archive',
          series: item.series || item.category || 'Archive',
          visibility: item.visibility || 'public',
          isExhibitionPlate: item.isExhibitionPlate !== undefined ? item.isExhibitionPlate : true,
          uploadDate: item.uploadDate || new Date().toISOString(),
          sizeBytes: item.sizeBytes || 0,
          camera: item.camera || 'Sony α6700',
          lens: item.lens || 'FE 70-200mm f/2.8 GM OSS II',
          focalLength: item.focalLength || '135mm',
          aperture: item.aperture || 'f/2.8',
          shutterSpeed: item.shutterSpeed || '1/800s',
          iso: item.iso || 'ISO 100',
          aspect: item.aspect || '16:9',
          notes: item.notes || '',
          isCloudinary: false
        });
      }
    });
  }

  // Ensure all plates are present
  if (Array.isArray(platesData)) {
    platesData.forEach((plate, idx) => {
      if (!photosMap.has(plate.filename)) {
        photosMap.set(plate.filename, {
          id: 'plate-' + (plate.plateNumber || String(idx + 1).padStart(2, '0')),
          publicId: null,
          filename: plate.filename,
          src: plate.src || `images/${plate.filename}`,
          title: plate.title || plate.filename,
          category: plate.series || 'Exhibition',
          series: plate.series || 'Exhibition',
          visibility: 'public',
          isExhibitionPlate: true,
          uploadDate: '2026-09-18T10:00:00Z',
          sizeBytes: 2500000,
          camera: plate.camera || 'Sony α6700',
          lens: plate.lens || 'FE 70-200mm f/2.8 GM OSS II',
          focalLength: plate.focalLength || '135mm',
          aperture: plate.aperture || 'f/2.8',
          shutterSpeed: plate.shutterSpeed || '1/800s',
          iso: plate.iso || 'ISO 100',
          aspect: plate.aspect || '16:9',
          notes: 'Master Exhibition Plate',
          isCloudinary: false
        });
      }
    });
  }

  const photos = Array.from(photosMap.values());

  const stats = {
    total: photos.length,
    totalPhotos: photos.length,
    privateVaultCount: photos.filter(p => p.visibility === 'private').length,
    publicLiveCount: photos.filter(p => p.visibility === 'public').length,
    totalBytes: photos.reduce((acc, p) => acc + (p.sizeBytes || 0), 0)
  };

  return res.json({ success: true, stats, photos });
};
