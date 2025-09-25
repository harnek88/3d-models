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

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// CORS
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({ origin: FRONTEND_ORIGIN }));

// Serve uploaded/converted files
app.use('/uploads', express.static(UPLOAD_DIR));

// Aspose credentials
const CLIENT_ID = process.env.ASPOSE_CLIENT_ID;
const CLIENT_SECRET = process.env.ASPOSE_CLIENT_SECRET;

async function getAsposeToken() {
  const url = 'https://api.aspose.cloud/connect/token';
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  });
  const resp = await axios.post(url, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return resp.data.access_token;
}

app.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const uploadedPath = req.file.path;
    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();

    if (ext === 'glb' || ext === 'gltf') {
      return res.json({ success: true, converted: false, url: `/uploads/${path.basename(uploadedPath)}` });
    }

    const token = await getAsposeToken();
    const convertUrl = `https://api.aspose.cloud/v3/3d/convert/${encodeURIComponent(ext)}/glb`;

    const asposeResp = await axios.put(convertUrl, fs.createReadStream(uploadedPath), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream'
      },
      responseType: 'stream'
    });

    const outFilename = `${path.basename(uploadedPath)}.glb`;
    const outPath = path.join(UPLOAD_DIR, outFilename);
    const writer = fs.createWriteStream(outPath);

    await new Promise((resolve, reject) => {
      asposeResp.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    fs.unlink(uploadedPath, () => {});

    const publicUrl = `/uploads/${outFilename}`;
    return res.json({ success: true, converted: true, url: publicUrl });

  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
    return res.status(500).json({ success: false, error: 'Conversion failed' });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
