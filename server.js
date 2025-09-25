// server.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import fetch from "node-fetch"; // if using Node 20+, native fetch works
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up uploads folder
const upload = multer({ dest: path.join(__dirname, "uploads/") });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Aspose credentials
const ASPOSE_CLIENT_ID = "883f5752-fb59-4a30-a590-191535c65fa6";
const ASPOSE_CLIENT_SECRET = "2768a80b78e54a01209e629707f91ca7";

// Route to convert 3D file
app.post("/convert", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded.");

    const inputFilePath = req.file.path;
    const outputFileName = req.file.originalname.split(".")[0] + ".glb";

    // Get Aspose OAuth token
    const tokenResponse = await fetch("https://api.aspose.cloud/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: ASPOSE_CLIENT_ID,
        client_secret: ASPOSE_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Upload and convert using Aspose API
    const fileBuffer = fs.readFileSync(inputFilePath);

    const convertResponse = await fetch(
      "https://api.aspose.cloud/v3.0/3d/convert/fbx/glb",
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
      const err = await convertResponse.json();
      return res.status(500).json(err);
    }

    const convertedBuffer = await convertResponse.arrayBuffer();
    const outputPath = path.join(__dirname, "uploads", outputFileName);

    fs.writeFileSync(outputPath, Buffer.from(convertedBuffer));

    res.json({
      message: "File converted successfully",
      fileUrl: `/uploads/${outputFileName}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Conversion failed.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
