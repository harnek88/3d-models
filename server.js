// server.js - Node.js/Express backend for secure Aspose 3D conversion
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// CORS: allow your frontend
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({ origin: FRONTEND_ORIGIN }));

// Serve uploaded/converted files
app.use('/uploads', express.static(UPLOAD_DIR));

// Aspose credentials
const CLIENT_ID = process.env.ASPOSE_CLIENT_ID || '883f5752-fb59-4a30-a590-191535c65fa6';
const CLIENT_SECRET = process.env.ASPOSE_CLIENT_SECRET || '2768a80b78e54a01209e629707f91ca7';

// Function: Get Aspose access token
async function getAsposeToken() {
  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });
    const resp = await axios.post('https://api.aspose.cloud/connect/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });
    return resp.data.access_token;
  } catch (err) {
    console.error('Error getting Aspose token:', err.response ? err.response.data : err.message);
    throw new Error('Failed to get Aspose token');
  }
}

// POST /convert - handle 3D file upload and conversion
app.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded (use field name "file")' });

    const uploadedPath = req.file.path;
    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();

    // If already GLB/GLTF, return directly
    if (ext === 'glb' || ext === 'gltf') {
      return res.json({ success: true, converted: false, url: `/uploads/${path.basename(uploadedPath)}` });
    }

    // Get Aspose token
    const token = await getAsposeToken();

    // Call Aspose convert endpoint
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

    // Save converted file
    const outFilename = `${path.basename(uploadedPath, path.extname(uploadedPath))}.glb`;
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

    // Return URL
    const publicUrl = `/uploads/${outFilename}`;
    res.json({ success: true, converted: true, url: publicUrl });
  } catch (err) {
    console.error('Conversion error:', err.response ? err.response.data : err.message);
    res.status(500).json({ success: false, error: 'Conversion failed', details: err.message });
  }
});

// Health check
app.get('/health', (_, res) => res.json({ ok: true }));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
