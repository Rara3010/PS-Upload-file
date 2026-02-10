const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const FormData = require("form-data");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "src")));
app.use(express.static(path.join(__dirname, "public")));

const UPLOAD_DIR = path.join(__dirname, "uploads");
const METADATA_FILE = path.join(__dirname, "metadata.json");
const EXPIRE_TIME = 3 * 60 * 60 * 1000; // 3 jam
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

/* ======================
   STORAGE CONFIG
====================== */
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 128 * 1024 * 1024 }, // 128MB
});

/* ======================
   MEMORY DATABASE
====================== */
const files = new Map();
const fileTimeouts = new Map();

/* ======================
   UPLOAD API
====================== */
app.post("/upload", upload.single("files[]"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      description: "File tidak ditemukan",
    });
  }

  const id = path.parse(req.file.filename).name;
  const expiresAt = Date.now() + EXPIRE_TIME;

  files.set(id, {
    id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: req.file.path,
    expiresAt,
  });

  // Auto delete with timeout tracking
  const timeout = setTimeout(() => deleteFile(id), EXPIRE_TIME);
  fileTimeouts.set(id, timeout);
  
  // Save metadata
  saveMetadata();

  res.json({
    success: true,
    files: [
      {
        url: `${BASE_URL}/file/${id}`,
        expiresAt,
      },
    ],
  });
});

/* ======================
   UGUU PROXY API
====================== */
app.post("/upload-uguu", upload.single("files[]"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      description: "File tidak ditemukan",
    });
  }

  try {
    // Create FormData untuk upload ke Uguu
    const form = new FormData();
    form.append("files[]", fs.createReadStream(req.file.path));

    // Forward ke Uguu API dengan headers dari FormData
    const response = await fetch("https://uguu.se/api.php", {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });

    // Baca response dari Uguu
    const responseText = await response.text();

    if (response.ok) {
      const uguuUrl = responseText.trim();
      
      // Delete file dari server setelah berhasil upload ke Uguu
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      // Return dalam format JSON yang sama seperti /upload
      res.json({
        success: true,
        files: [
          {
            url: uguuUrl,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // Uguu default 24 jam
          },
        ],
      });
    } else {
      // Delete local file jika Uguu gagal
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(response.status).json({
        success: false,
        description: `Uguu API error: ${responseText}`,
      });
    }
  } catch (error) {
    // Delete local file jika ada error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Uguu upload error:", error.message);
    res.status(500).json({
      success: false,
      description: "Gagal upload ke Uguu API",
    });
  }
});

/* ======================
   DOWNLOAD API
====================== */
app.get("/file/:id", (req, res) => {
  const file = files.get(req.params.id);

  if (!file) {
    return res.status(404).send("File tidak ditemukan atau sudah expired");
  }

  res.download(file.path, file.originalName);
});

/* ======================
   DELETE FILE
====================== */
function deleteFile(id) {
  const file = files.get(id);
  if (!file) return;

  // Clear timeout if exists
  if (fileTimeouts.has(id)) {
    clearTimeout(fileTimeouts.get(id));
    fileTimeouts.delete(id);
  }

  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  files.delete(id);
  saveMetadata();
  console.log("File expired & deleted:", id);
}

/* ======================
   METADATA PERSISTENCE
====================== */
function saveMetadata() {
  const metadata = Array.from(files.values()).map(file => ({
    id: file.id,
    filename: file.filename,
    originalName: file.originalName,
    path: file.path,
    expiresAt: file.expiresAt,
  }));
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

function loadMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));
      metadata.forEach(file => {
        // Only load files that haven't expired
        if (file.expiresAt > Date.now() && fs.existsSync(file.path)) {
          files.set(file.id, file);
          // Reset timeout
          const timeRemaining = file.expiresAt - Date.now();
          const timeout = setTimeout(() => deleteFile(file.id), timeRemaining);
          fileTimeouts.set(file.id, timeout);
        }
      });
      console.log(`Loaded ${files.size} files from metadata`);
    }
  } catch (err) {
    console.error("Error loading metadata:", err.message);
  }
}

/* ======================
   ADMIN API (OPTIONAL)
====================== */
app.get("/admin/files", (req, res) => {
  res.json([...files.values()]);
});

app.delete("/admin/file/:id", (req, res) => {
  deleteFile(req.params.id);
  res.json({ success: true });
});

/* ======================
   ERROR HANDLING
====================== */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ 
    success: false, 
    message: "Server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

/* ======================
   SERVER START
====================== */
const PORT = process.env.PORT || 3000;

// Load metadata on startup
loadMetadata();

app.listen(PORT, () => {
  console.log(`Backend jalan di ${BASE_URL}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || "development"}`);
});
