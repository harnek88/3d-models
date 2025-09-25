// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

// Fix __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// Home route
app.get("/", (req, res) => {
  res.send("3D File Viewer & Converter API is running!");
});

// Upload and convert 3D file route
app.post("/convert", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // Get Aspose access token
    const tokenResponse = await fetch("https://api.aspose.cloud/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.ASPOSE_CLIENT_ID,
        client_secret: process.env.ASPOSE_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Token request failed: ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Read file as buffer
    const fileBuffer = fs.readFileSync(file.path);

    // Send file to Aspose 3D conversion API
    const convertResponse = await fetch(
      "https://api.aspose.cloud/v3/3d/convert/fbx/glb",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: fileBuffer,
      }
    );

    if (!convertResponse.ok) {
      const errText = await convertResponse.text();
      throw new Error(`Conversion failed: ${errText}`);
    }

    const outputBuffer = Buffer.from(await convertResponse.arrayBuffer());

    // Save converted file
    const outputFilePath = path.join(__dirname, "uploads", `${file.filename}.glb`);
    fs.writeFileSync(outputFilePath, outputBuffer);

    res.json({
      success: true,
      message: "File converted successfully",
      convertedFile: `/uploads/${file.filename}.glb`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
