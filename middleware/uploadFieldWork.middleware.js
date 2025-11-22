const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uploadPath = path.join(__dirname, "../uploads/fieldwork");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadPath,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"));
  }
});

const fileFilter = (req, file, cb) => {
    const allowed = [
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "video/mp4",
        "video/mpeg"
    ];

    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"), false);
};

module.exports = multer({
    storage,
    fileFilter
});
