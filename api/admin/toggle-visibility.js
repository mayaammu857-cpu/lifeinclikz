// api/admin/toggle-visibility.js — Vercel Serverless Function
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

  const { publicId, filename, targetVisibility } = req.body || {};
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const newVisibility = targetVisibility || 'private';

  // Update Cloudinary context for cloud photos
  if (publicId) {
    try {
      // Get current context first
      const getRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${publicId}?context=true`,
        { headers: { 'Authorization': `Basic ${cloudinaryAuth()}` } }
      );

      let existingCtx = {};
      if (getRes.ok) {
        const getData = await getRes.json();
        existingCtx = (getData.context && getData.context.custom) ? getData.context.custom : {};
      }

      const updatedCtx = Object.entries({ ...existingCtx, visibility: newVisibility })
        .map(([k, v]) => `${k}=${String(v).replace(/[|=]/g, ' ')}`)
        .join('|');

      await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${publicId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${cloudinaryAuth()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ context: updatedCtx })
        }
      );
    } catch (e) {
      console.error('Cloudinary toggle error:', e.message);
    }
  }

  const message = newVisibility === 'private'
    ? 'Photo is now locked in Private Vault (hidden from website)'
    : 'Photo is now published live to public exhibition';

  return res.json({
    success: true,
    filename: filename || publicId,
    visibility: newVisibility,
    message
  });
};
