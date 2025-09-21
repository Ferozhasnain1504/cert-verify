// server.js — simple certificate backend (upload + verify)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certdb';

// --- MongoDB connect ---
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message || err);
    process.exit(1);
  });

// --- Schema ---
const certSchema = new mongoose.Schema({
  name: { type: String },
  issuer: { type: String },
  date_of_issue: { type: String },
  filename: { type: String },
  hash: { type: String, index: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const Certificate = mongoose.model('Certificate', certSchema);

// --- Multer (memory storage so we can hash directly) ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- Routes ---

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Upload certificate: multipart/form-data with fields name, issuer, date and file field 'certificateFile'
app.post('/api/upload', upload.single('certificateFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'certificateFile is required' });

    const { name, issuer, date } = req.body;

    // Compute SHA256 hash of file buffer
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    // If already exists, return existing
    let existing = await Certificate.findOne({ hash });
    if (existing) {
      return res.json({ message: 'Certificate already recorded', certificate: existing });
    }

    const cert = new Certificate({
      name: name || 'Unknown',
      issuer: issuer || 'Unknown',
      date_of_issue: date || '',
      filename: req.file.originalname,
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
      const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
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

// Get certificate by id
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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
