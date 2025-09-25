const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });

app.post('/convert', upload.single('file'), (req, res) => {
  const inputPath = req.file.path;
  const outputPath = inputPath + '.glb';

  // Run Blender Python conversion
  exec(`blender --background --python convert_blender.py -- "${inputPath}" "${outputPath}"`, (err, stdout, stderr) => {
    if (err) {
      console.error(err, stderr);
      return res.status(500).send('Conversion failed');
    }

    // Send GLB file back to client
    res.download(outputPath, req.file.originalname.split('.')[0] + '.glb', (err) => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
