const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'topic_images'); // Resolves to backend/uploads/topic_images
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration (initially save to memory for processing)
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Error: File type not allowed. Only JPEG, PNG, GIF, WEBP are permitted.'), false);
};

// Multer upload instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: fileFilter,
});

// Middleware to process and save the image
const processAndSaveImage = async (req, res, next) => {
  if (!req.file) {
    return next(); // No file to process, continue
  }

  try {
    const originalFilename = path.parse(req.file.originalname).name;
    const timestamp = Date.now();
    // Output as WebP for better compression and quality
    const newFilename = `${originalFilename}_${timestamp}.webp`;
    const outputPath = path.join(uploadDir, newFilename);

    await sharp(req.file.buffer)
      .resize(800, 600, { // Resize to max width 800px or max height 600px, maintaining aspect ratio
        fit: sharp.fit.inside,
        withoutEnlargement: true, // Don't enlarge if image is smaller than specified dimensions
      })
      .webp({ quality: 80 }) // Convert to WebP format with 80% quality
      .toFile(outputPath);

    // Make the path accessible via URL (relative to /uploads mount point)
    req.file.processedPath = `/uploads/topic_images/${newFilename}`;
    next();
  } catch (error) {
    console.error('Error processing image:', error);
    // Pass error to Express error handler
    next(new Error('Error processing image: ' + error.message));
  }
};

module.exports = { upload, processAndSaveImage };
