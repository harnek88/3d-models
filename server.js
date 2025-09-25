// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fetch from "node-fetch"; // ES module import for node-fetch
import fs from "fs";

// Convert import.meta.url to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder for uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Set up Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Aspose API credentials
const ASPOSE_CLIENT_ID = "883f5752-fb59-4a30-a590-191535c65fa6";
const ASPOSE_CLIENT_SECRET = "2768a80b78e54a01209e629707f91ca7";

// Route: Upload file
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  try {
    // Read uploaded file
    const fileStream = fs.createReadStream(req.file.path);

    // Convert FBX to GLB using Aspose 3D API
    const apiUrl = "https://api.aspose.cloud/v3/3d/convert/fbx/glb";

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${await getAsposeToken()}`,
      },
      body: fileStream
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).send(err);
    }

    const resultBuffer = await response.buffer();
    const outputPath = path.join(__dirname, "uploads", `${Date.now()}-converted.glb`);
    fs.writeFileSync(outputPath, resultBuffer);

    res.json({ message: "File converted successfully", url: `/uploads/${path.basename(outputPath)}` });

  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Function: Get Aspose OAuth token
async function getAsposeToken() {
  const tokenUrl = "https://api.aspose.cloud/connect/token";
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", ASPOSE_CLIENT_ID);
  params.append("client_secret", ASPOSE_CLIENT_SECRET);

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  if (!res.ok) throw new Error("Failed to get Aspose token");
  const data = await res.json();
  return data.access_token;
}

// Test route
app.get("/", (req, res) => {
  res.send("3D File Viewer for all formats is running!");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
