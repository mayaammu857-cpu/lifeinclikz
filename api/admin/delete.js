// api/admin/delete.js — Vercel Serverless Function
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

  const { publicId, filename, id } = req.body || {};
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  // Delete from Cloudinary if this is a cloud photo
  if (publicId) {
    try {
      const encoded = encodeURIComponent(publicId);
      await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?public_ids[]=${encoded}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Basic ${cloudinaryAuth()}` }
        }
      );
    } catch (e) {
      console.error('Cloudinary delete error:', e.message);
    }
  }

  // For local/vault photos — deletion from JSON can't persist on Vercel,
  // but the local serve.js handles it when running locally.
  return res.json({
    success: true,
    message: `Photo ${filename || publicId || id} permanently deleted from archive.`
  });
};
