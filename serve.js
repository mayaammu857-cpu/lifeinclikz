const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
const ADMIN_PIN = process.env.ADMIN_PIN || '8899';

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const VAULT_FILE = path.join(__dirname, 'data/admin-vault.json');
const PLATES_FILE = path.join(__dirname, 'data/all-81-plates.json');
const EVENTS_FILE = path.join(__dirname, 'data/events.json');
const USERS_FILE = path.join(__dirname, 'data/users.json');
const INQUIRIES_FILE = path.join(__dirname, 'data/inquiries.json');
const IMAGES_DIR = path.join(__dirname, 'images');

// Helper to safely read JSON
function readJsonSafe(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return defaultValue;
  }
}

// Helper to write JSON safely
function writeJsonSafe(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// Helper to parse JSON body from incoming request
function parseJsonBody(req, limitBytes = 50 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];
    req.on('data', chunk => {
      received += chunk.length;
      if (received > limitBytes) {
        reject(new Error('Payload too large (limit: 50MB)'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const bodyStr = Buffer.concat(chunks).toString('utf8');
        resolve(bodyStr ? JSON.parse(bodyStr) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Normalize URL
  let reqUrl = decodeURI(req.url.split('?')[0]);

  // Legacy cutout handler
  if (req.method === 'POST' && reqUrl === '/save-cutout') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(path.join(__dirname, 'images/camera-cutout.png'), buf);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('saved');
    });
    return;
  }

  /* ==========================================================================
     ADMIN API ENDPOINTS
     ========================================================================== */

  // 1. PIN verification
  if (req.method === 'POST' && reqUrl === '/api/admin/verify-pin') {
    try {
      const body = await parseJsonBody(req);
      if (body.pin === ADMIN_PIN) {
        return sendJson(res, 200, { success: true, message: 'Authentication successful' });
      } else {
        return sendJson(res, 401, { success: false, error: 'Incorrect PIN passcode' });
      }
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // 2. Fetch all photos & vault catalog
  if (req.method === 'GET' && reqUrl === '/api/admin/photos') {
    try {
      const vaultData = readJsonSafe(VAULT_FILE, []);
      const platesData = readJsonSafe(PLATES_FILE, []);

      // Create lookup sets
      const vaultMap = new Map();
      vaultData.forEach(item => {
        if (item.filename) vaultMap.set(item.filename, item);
      });

      const platesMap = new Map();
      platesData.forEach(item => {
        if (item.filename) platesMap.set(item.filename, item);
      });

      // Scan images directory for physical files
      let files = [];
      if (fs.existsSync(IMAGES_DIR)) {
        files = fs.readdirSync(IMAGES_DIR);
      }

      const photoList = [];
      const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);

      files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (!imageExtensions.has(ext)) return;
        if (file === 'camera-cutout.png') return; // internal asset

        const fullPath = path.join(IMAGES_DIR, file);
        let stat = null;
        try {
          stat = fs.statSync(fullPath);
        } catch (e) {
          return;
        }

        const vaultRecord = vaultMap.get(file);
        const plateRecord = platesMap.get(file);

        let visibility = 'private'; // Default to private vault (ath websitil kanikaruth)
        let isExhibitionPlate = false;
        let title = file.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, '');
        let category = 'Vault Archive';
        let id = 'img_' + Buffer.from(file).toString('base64').replace(/=/g, '');
        let uploadDate = stat.mtime.toISOString();

        if (plateRecord) {
          isExhibitionPlate = true;
          title = plateRecord.title || title;
          category = plateRecord.series || 'Exhibition';
          visibility = 'public';
        }

        if (vaultRecord) {
          visibility = vaultRecord.visibility || 'private';
          if (vaultRecord.title) title = vaultRecord.title;
          if (vaultRecord.category) category = vaultRecord.category;
          if (vaultRecord.uploadDate) uploadDate = vaultRecord.uploadDate;
          if (vaultRecord.id) id = vaultRecord.id;
        }

        photoList.push({
          id,
          filename: file,
          src: `images/${file}`,
          title,
          category,
          visibility,
          isExhibitionPlate,
          sizeBytes: stat.size,
          uploadDate,
          mtime: stat.mtime
        });
      });

      // Sort newest first
      photoList.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

      const stats = {
        totalPhotos: photoList.length,
        privateVaultCount: photoList.filter(p => p.visibility === 'private').length,
        publicLiveCount: photoList.filter(p => p.visibility === 'public').length,
        totalBytes: photoList.reduce((acc, p) => acc + p.sizeBytes, 0)
      };

      return sendJson(res, 200, { success: true, stats, photos: photoList });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 3. Upload photo(s)
  if (req.method === 'POST' && reqUrl === '/api/admin/upload') {
    try {
      const body = await parseJsonBody(req);
      const { filename, data, title, category, visibility } = body;

      if (!filename || !data) {
        return sendJson(res, 400, { success: false, error: 'Filename and base64 data are required.' });
      }

      // Sanitize filename
      const ext = path.extname(filename).toLowerCase() || '.jpg';
      const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = Date.now();
      const safeFilename = `${baseName}_${timestamp}${ext}`;
      const destPath = path.join(IMAGES_DIR, safeFilename);

      // Strip Base64 data header if present
      const base64Content = data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Content, 'base64');

      fs.writeFileSync(destPath, buffer);
      const stat = fs.statSync(destPath);

      // Save to data/admin-vault.json with default visibility = 'private'
      const vaultData = readJsonSafe(VAULT_FILE, []);
      const newRecord = {
        id: `vault_${timestamp}`,
        filename: safeFilename,
        src: `images/${safeFilename}`,
        title: title || baseName.replace(/[-_]/g, ' '),
        category: category || 'Private Vault',
        visibility: visibility === 'public' ? 'public' : 'private', // Defaults to private
        uploadDate: new Date().toISOString(),
        sizeBytes: stat.size,
        notes: visibility === 'public' ? 'Live public plate' : 'Kept private in vault (not visible on public site)'
      };

      vaultData.unshift(newRecord);
      writeJsonSafe(VAULT_FILE, vaultData);

      // If user explicitly marked as public, also add to all-81-plates.json
      if (newRecord.visibility === 'public') {
        const platesData = readJsonSafe(PLATES_FILE, []);
        platesData.push({
          plateNumber: String(platesData.length + 1).padStart(2, '0'),
          filename: safeFilename,
          src: `images/${safeFilename}`,
          title: newRecord.title,
          series: newRecord.category,
          aspect: '16:9'
        });
        writeJsonSafe(PLATES_FILE, platesData);
      }

      return sendJson(res, 200, {
        success: true,
        message: 'Photo uploaded successfully to Private Vault',
        photo: newRecord
      });
    } catch (err) {
      console.error('Upload error:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 4. Delete photo
  if (req.method === 'POST' && reqUrl === '/api/admin/delete') {
    try {
      const body = await parseJsonBody(req);
      const { filename, id } = body;

      if (!filename) {
        return sendJson(res, 400, { success: false, error: 'Filename is required for deletion.' });
      }

      // Security check: ensure file is inside images dir
      const cleanFilename = path.basename(filename);
      const filePath = path.join(IMAGES_DIR, cleanFilename);

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.warn(`Could not unlink file ${filePath}:`, unlinkErr.message);
        }
      }

      // Update data/admin-vault.json
      let vaultData = readJsonSafe(VAULT_FILE, []);
      vaultData = vaultData.filter(item => item.filename !== cleanFilename && item.id !== id);
      writeJsonSafe(VAULT_FILE, vaultData);

      // Update data/all-81-plates.json if it was registered there
      let platesData = readJsonSafe(PLATES_FILE, []);
      const beforeCount = platesData.length;
      platesData = platesData.filter(item => item.filename !== cleanFilename);
      if (platesData.length !== beforeCount) {
        writeJsonSafe(PLATES_FILE, platesData);
      }

      return sendJson(res, 200, {
        success: true,
        message: `Photo ${cleanFilename} permanently deleted from archive.`
      });
    } catch (err) {
      console.error('Delete error:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 5. Toggle photo visibility (Private Vault vs Live Website)
  if (req.method === 'POST' && reqUrl === '/api/admin/toggle-visibility') {
    try {
      const body = await parseJsonBody(req);
      let { filename, targetVisibility } = body;

      if (!filename) {
        return sendJson(res, 400, { success: false, error: 'Filename is required.' });
      }

      const cleanFilename = path.basename(filename);

      // Update vault database
      const vaultData = readJsonSafe(VAULT_FILE, []);
      let record = vaultData.find(item => item.filename === cleanFilename);
      const platesData = readJsonSafe(PLATES_FILE, []);
      const isCurrentlyPublic = platesData.some(p => p.filename === cleanFilename) || (record && record.visibility === 'public');

      if (!targetVisibility || !['private', 'public'].includes(targetVisibility)) {
        targetVisibility = isCurrentlyPublic ? 'private' : 'public';
      }
      if (record) {
        record.visibility = targetVisibility;
      } else {
        record = {
          id: `vault_${Date.now()}`,
          filename: cleanFilename,
          src: `images/${cleanFilename}`,
          title: cleanFilename.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, ''),
          category: 'Exhibition',
          visibility: targetVisibility,
          uploadDate: new Date().toISOString()
        };
        vaultData.push(record);
      }
      writeJsonSafe(VAULT_FILE, vaultData);

      // Sync with plates if needed
      if (targetVisibility === 'public') {
        if (!platesData.some(p => p.filename === cleanFilename)) {
          platesData.push({
            plateNumber: String(platesData.length + 1).padStart(2, '0'),
            filename: cleanFilename,
            src: `images/${cleanFilename}`,
            title: record.title || cleanFilename,
            series: record.category || 'Exhibition',
            aspect: '16:9'
          });
          writeJsonSafe(PLATES_FILE, platesData);
        }
      } else {
        // Remove from public exhibition
        const filteredPlates = platesData.filter(p => p.filename !== cleanFilename);
        if (filteredPlates.length !== platesData.length) {
          writeJsonSafe(PLATES_FILE, filteredPlates);
        }
      }

      return sendJson(res, 200, {
        success: true,
        filename: cleanFilename,
        visibility: targetVisibility,
        message: targetVisibility === 'private'
          ? 'Photo is now locked in Private Vault (hidden from website)'
          : 'Photo is now published live to public exhibition'
      });
    } catch (err) {
      console.error('Toggle error:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 6. Events API
  if (req.method === 'GET' && reqUrl === '/api/admin/events') {
    const events = readJsonSafe(EVENTS_FILE, []);
    return sendJson(res, 200, { success: true, events });
  }

  if (req.method === 'POST' && reqUrl === '/api/admin/events') {
    try {
      const newEvent = await parseJsonBody(req);
      let events = readJsonSafe(EVENTS_FILE, []);
      if (!newEvent.id) newEvent.id = 'evt-' + Date.now();
      if (!newEvent.photosCount) newEvent.photosCount = 0;
      if (!newEvent.views) newEvent.views = 0;
      if (!newEvent.downloads) newEvent.downloads = 0;
      if (!newEvent.coverImage) newEvent.coverImage = 'images/6145573222888444980_121.jpg';
      events.unshift(newEvent);
      writeJsonSafe(EVENTS_FILE, events);
      return sendJson(res, 200, { success: true, event: newEvent, message: 'Event created successfully' });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 7. Users API
  if (req.method === 'GET' && reqUrl === '/api/admin/users') {
    const users = readJsonSafe(USERS_FILE, []);
    return sendJson(res, 200, { success: true, users });
  }

  if (req.method === 'POST' && reqUrl === '/api/admin/users') {
    try {
      const newUser = await parseJsonBody(req);
      let users = readJsonSafe(USERS_FILE, []);
      if (!newUser.id) newUser.id = 'usr-' + Date.now();
      if (!newUser.assignedEvents) newUser.assignedEvents = 0;
      if (!newUser.status) newUser.status = 'Active';
      if (!newUser.lastActive) newUser.lastActive = 'Just now';
      if (!newUser.avatar) newUser.avatar = 'images/6145573222888444980_121.jpg';
      users.push(newUser);
      writeJsonSafe(USERS_FILE, users);
      return sendJson(res, 200, { success: true, user: newUser, message: 'User added successfully' });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 8. Galleries API
  if (req.method === 'GET' && reqUrl === '/api/admin/galleries') {
    const platesData = readJsonSafe(PLATES_FILE, []);
    const groups = {};
    platesData.forEach(plate => {
      const series = plate.series || 'Master Archive';
      if (!groups[series]) {
        groups[series] = {
          name: series,
          count: 0,
          coverImage: plate.src,
          plates: []
        };
      }
      groups[series].count++;
      groups[series].plates.push(plate);
    });
    const galleries = Object.values(groups);
    return sendJson(res, 200, { success: true, galleries });
  }

  // 9. Customer Inquiries & Dealing CRM API
  if (req.method === 'GET' && reqUrl === '/api/admin/inquiries') {
    const inquiries = readJsonSafe(INQUIRIES_FILE, []);
    return sendJson(res, 200, { success: true, inquiries });
  }

  if (req.method === 'POST' && reqUrl === '/api/admin/inquiries') {
    try {
      const newInquiry = await parseJsonBody(req);
      let inquiries = readJsonSafe(INQUIRIES_FILE, []);
      if (!newInquiry.id) newInquiry.id = 'deal_' + Date.now();
      if (!newInquiry.createdAt) newInquiry.createdAt = new Date().toISOString();
      if (!newInquiry.status) newInquiry.status = 'New Inquiry';
      if (!newInquiry.notes) newInquiry.notes = '';
      if (!newInquiry.quoteAmount) newInquiry.quoteAmount = 0;
      inquiries.unshift(newInquiry);
      writeJsonSafe(INQUIRIES_FILE, inquiries);
      return sendJson(res, 200, { success: true, inquiry: newInquiry, message: 'Customer inquiry received' });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  if (req.method === 'POST' && reqUrl === '/api/admin/inquiries/update') {
    try {
      const body = await parseJsonBody(req);
      const { id, status, quoteAmount, notes } = body;
      if (!id) return sendJson(res, 400, { success: false, error: 'Inquiry ID is required' });
      let inquiries = readJsonSafe(INQUIRIES_FILE, []);
      const item = inquiries.find(q => q.id === id);
      if (!item) return sendJson(res, 404, { success: false, error: 'Deal not found' });
      if (status !== undefined) item.status = status;
      if (quoteAmount !== undefined) item.quoteAmount = Number(quoteAmount);
      if (notes !== undefined) item.notes = notes;
      item.updatedAt = new Date().toISOString();
      writeJsonSafe(INQUIRIES_FILE, inquiries);
      return sendJson(res, 200, { success: true, inquiry: item, message: 'Deal status updated' });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  if (req.method === 'POST' && reqUrl === '/api/admin/inquiries/delete') {
    try {
      const body = await parseJsonBody(req);
      const { id } = body;
      if (!id) return sendJson(res, 400, { success: false, error: 'Inquiry ID is required' });
      let inquiries = readJsonSafe(INQUIRIES_FILE, []);
      inquiries = inquiries.filter(q => q.id !== id);
      writeJsonSafe(INQUIRIES_FILE, inquiries);
      return sendJson(res, 200, { success: true, message: 'Inquiry removed' });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  /* ==========================================================================
     STATIC FILE ROUTING & SERVING
     ========================================================================== */

  // Aliases
  if (reqUrl === '/') reqUrl = '/index.html';
  if (reqUrl === '/admin') reqUrl = '/admin.html';

  const filePath = path.join(__dirname, reqUrl);

  // Security check: ensure path is within __dirname
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${reqUrl}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Add cache headers for images and assets
    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Access-Control-Allow-Origin': '*'
    };

    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
      headers['Cache-Control'] = 'public, max-age=86400';
    } else {
      headers['Cache-Control'] = 'no-cache';
    }

    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`LIFECYCLE Visual Universe running at http://localhost:${PORT}`);
  console.log(`Admin Vault panel available at http://localhost:${PORT}/admin.html`);
});
