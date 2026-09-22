// api/admin/upload.js — Vercel Serverless Function
// After client-side Cloudinary direct upload, save metadata context
function cloudinaryAuth() {
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return Buffer.from(`${key}:${secret}`).toString('base64');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { publicId, url, filename, title, category, visibility, sizeBytes } = req.body || {};

  if (!publicId || !url) {
    return res.status(400).json({ success: false, error: 'publicId and url are required' });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  // Update Cloudinary resource context with metadata
  try {
    const contextStr = [
      `title=${(title || '').replace(/[|=]/g, ' ')}`,
      `category=${(category || 'Archive').replace(/[|=]/g, ' ')}`,
      `visibility=${visibility || 'private'}`,
      `notes=${visibility === 'public' ? 'Live public plate' : 'Private vault'}`
    ].join('|');

    await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${publicId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${cloudinaryAuth()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ context: contextStr })
      }
    );
  } catch (e) {
    console.error('Cloudinary context update error:', e.message);
  }

  const photo = {
    id: publicId.replace(/\//g, '_'),
    publicId,
    filename: filename || publicId.split('/').pop(),
    src: url,
    title: title || filename || publicId.split('/').pop(),
    category: category || 'Archive',
    visibility: visibility || 'private',
    uploadDate: new Date().toISOString(),
    sizeBytes: sizeBytes || 0,
    isCloudinary: true
  };

  return res.json({
    success: true,
    message: 'Photo uploaded to Cloudinary archive!',
    photo
  });
};
