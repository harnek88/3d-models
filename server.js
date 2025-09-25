// backend/index.js
import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import path from "path";

const app = express();
const upload = multer({ dest: "uploads/" });

const ASPOSE_CLIENT_ID = process.env.ASPOSE_CLIENT_ID;
const ASPOSE_CLIENT_SECRET = process.env.ASPOSE_CLIENT_SECRET;

// Function to get Bearer token from Aspose
async function getAsposeToken() {
  try {
    const resp = await axios.post(
      "https://api.aspose.cloud/connect/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: ASPOSE_CLIENT_ID,
        client_secret: ASPOSE_CLIENT_SECRET,
        scope: "3d.readwrite"
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
    return resp.data.access_token;
  } catch (err) {
    console.error("Error getting token:", err.response?.data || err.message);
    throw err;
  }
}

// Convert endpoint
app.post("/convert", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });

  const filePath = req.file.path;
  const fromExt = path.extname(req.file.originalname).substring(1).toLowerCase();
  const toExt = "glb"; // Change target format if needed

  try {
    const token = await getAsposeToken();

    const fileBuffer = fs.readFileSync(filePath);

    const response = await axios.post(
      `https://api.aspose.cloud/v3.0/3d/convert/${fromExt}/${toExt}`,
      fileBuffer,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          Accept: "application/json"
        },
        responseType: "arraybuffer" // get raw file back
      }
    );

    const outFileName = `${req.file.filename}.${toExt}`;
    const outPath = path.join("uploads", outFileName);
    fs.writeFileSync(outPath, response.data);

    // Send back URL to frontend
    res.json({ success: true, url: `/uploads/${outFileName}` });
  } catch (err) {
    console.error("Conversion error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data || err.message });
  } finally {
    // Clean up uploaded file
    fs.unlinkSync(filePath);
  }
});

// Serve converted files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
