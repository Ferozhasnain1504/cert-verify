// server.js — store uploaded certificate files, compute hash, provide download endpoint
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const crypto = require('crypto');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certdb';

// ensure uploads folder exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// --- Multer disk storage ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // keep original name but prefix with timestamp to avoid collisions
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// --- MongoDB connect ---
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message || err);
    process.exit(1);
  });

// --- Schema ---
const certSchema = new mongoose.Schema({
  name: { type: String },
  issuer: { type: String },
  date_of_issue: { type: String },
  originalFilename: { type: String },
  storedFilename: { type: String },
  filePath: { type: String }, // path on server (relative)
  hash: { type: String, index: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const Certificate = mongoose.model('Certificate', certSchema);

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Upload certificate: multipart/form-data with fields name, issuer, date and file field 'certificateFile'
app.post('/api/upload', upload.single('certificateFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'certificateFile is required' });

    const { name, issuer, date } = req.body;
    const savedPath = req.file.path; // absolute or relative path
    // compute SHA256 hash from saved file
    const buffer = fs.readFileSync(savedPath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // If already exists, remove newly uploaded duplicate file and return existing
    let existing = await Certificate.findOne({ hash });
    if (existing) {
      // delete the duplicate uploaded file (since same content already recorded)
      try { fs.unlinkSync(savedPath); } catch (e) {}
      return res.json({ message: 'Certificate already recorded', certificate: existing });
    }

    const cert = new Certificate({
      name: name || 'Unknown',
      issuer: issuer || 'Unknown',
      date_of_issue: date || '',
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      filePath: path.relative(__dirname, savedPath),
      hash
    });
    await cert.save();

    return res.json({ message: 'Certificate recorded', id: cert._id, hash: cert.hash });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', details: err.message || err });
  }
});

// Verify: submit file (certificateFile) OR id in body (id)
app.post('/api/verify', upload.single('certificateFile'), async (req, res) => {
  try {
    if (req.file) {
      // file was uploaded for verification (we can delete it after reading)
      const savedPath = req.file.path;
      const buffer = fs.readFileSync(savedPath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');

      // delete the temp verification file — it's not needed unless you want to keep it
      try { fs.unlinkSync(savedPath); } catch (e) {}

      const cert = await Certificate.findOne({ hash });
      if (cert) return res.json({ verified: true, certificate: cert });
      return res.json({ verified: false, message: 'No matching record found' });
    }

    const { id } = req.body;
    if (id) {
      const cert = await Certificate.findById(id);
      if (!cert) return res.json({ verified: false, message: 'ID not found' });
      return res.json({ verified: true, certificate: cert });
    }

    return res.status(400).json({ error: 'Provide a file (certificateFile) or an id' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get certificate metadata by id
app.get('/api/cert/:id', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ error: 'Not found' });
    res.json(cert);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Download certificate file by id
app.get('/api/cert/:id/file', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ error: 'Not found' });

    const absolutePath = path.join(__dirname, cert.filePath);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: 'File not found on server' });

    // Use res.download to prompt file download with original filename
    return res.download(absolutePath, cert.originalFilename);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
