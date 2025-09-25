// server.js - Node.js/Express backend for secure Aspose 3D conversion
// Install: npm install
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cors = require('cors');

const app = express();
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// CORS: restrict in production to your site only
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({ origin: FRONTEND_ORIGIN }));

// serve converted files
app.use('/uploads', express.static(UPLOAD_DIR));

// Aspose credentials from env
const CLIENT_ID = process.env.ASPOSE_CLIENT_ID;
const CLIENT_SECRET = process.env.ASPOSE_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('Warning: ASPOSE_CLIENT_ID or ASPOSE_CLIENT_SECRET not set in env vars.');
}

// Get Aspose access token (client_credentials)
async function getAsposeToken() {
  const url = 'https://api.aspose.cloud/connect/token';
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  });

  const resp = await axios.post(url, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000
  });
  return resp.data.access_token;
}

// /convert endpoint: accepts multipart file field 'file'
// returns JSON { success: true, url: '/uploads/xxx.glb' } on success
app.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded (use field name "file")' });

    const uploadedPath = req.file.path;
    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();

    // If already GLB/GLTF -> no conversion required; return static URL
    if (ext === 'glb' || ext === 'gltf') {
      return res.json({ success: true, converted: false, url: `/uploads/${path.basename(uploadedPath)}` });
    }

    // 1) get Aspose token
    const token = await getAsposeToken();

    // 2) call Aspose convert endpoint
    // NOTE: Aspose docs show endpoints like /v3/3d/convert/{from}/{to}
    const convertUrl = `https://api.aspose.cloud/v3/3d/convert/${encodeURIComponent(ext)}/glb`;

    const asposeResp = await axios.put(convertUrl, fs.createReadStream(uploadedPath), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream'
      },
      responseType: 'stream',
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120000
    });

    // 3) save converted stream to file
    const outFilename = `${path.basename(uploadedPath)}.glb`;
    const outPath = path.join(UPLOAD_DIR, outFilename);
    const writer = fs.createWriteStream(outPath);

    await new Promise((resolve, reject) => {
      asposeResp.data.pipe(writer);
      asposeResp.data.on('end', resolve);
      asposeResp.data.on('error', reject);
      writer.on('error', reject);
    });

    // Optional: remove original upload to save space
    fs.unlink(uploadedPath, () => {});

    // 4) return public URL (served from /uploads)
    const publicUrl = `/uploads/${outFilename}`;
    return res.json({ success: true, converted: true, url: publicUrl });

  } catch (err) {
    console.error('Conversion error:', err.response ? err.response.data : err.message);
    return res.status(500).json({ success: false, error: 'Conversion failed', details: err.message });
  }
});

// health
app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
