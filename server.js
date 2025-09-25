import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS for all origins
app.use(cors());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Basic test route
app.get("/", (req, res) => {
  res.send("3D File Viewer API is running!");
});

// Upload and convert 3D file endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;
    const fileName = req.file.filename;

    // Example: Call Aspose Cloud API to convert FBX -> GLB
    const ASPOSE_CLIENT_ID = process.env.ASPOSE_CLIENT_ID;
    const ASPOSE_CLIENT_SECRET = process.env.ASPOSE_CLIENT_SECRET;

    // Get Aspose access token
    const tokenResp = await fetch("https://api.aspose.cloud/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${ASPOSE_CLIENT_ID}&client_secret=${ASPOSE_CLIENT_SECRET}`,
    });

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;

    // Upload & convert file
    const convertResp = await fetch(`https://api.aspose.cloud/v3/3d/convert/fbx/glb`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
      },
      body: fs.createReadStream(filePath),
    });

    if (!convertResp.ok) {
      const errorText = await convertResp.text();
      return res.status(500).json({ error: "Conversion failed", details: errorText });
    }

    const convertedFile = fs.createWriteStream(path.join(uploadDir, fileName.replace(".fbx", ".glb")));
    convertResp.body.pipe(convertedFile);

    convertedFile.on("finish", () => {
      res.json({ message: "File converted successfully", url: `/uploads/${fileName.replace(".fbx", ".glb")}` });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
