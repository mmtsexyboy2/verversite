const express = require('express');
const router = express.Router();
const uploadMiddleware = require('../middleware/uploadMiddleware'); // Path to your multer config
const { protect } = require('../middleware/authMiddleware'); // Ensure only logged-in users can upload
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// @desc    Upload an image for a topic
// @route   POST /api/uploads/image
// @access  Private
router.post('/image', protect, (req, res) => {
    uploadMiddleware(req, res, async (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                // A Multer error occurred when uploading.
                return res.status(400).json({ message: err.message });
            } else if (err) {
                // An unknown error occurred when uploading.
                return res.status(400).json({ message: err }); // This is the custom error from checkFileType
            }
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file selected for upload.' });
        }

        // File uploaded successfully, now process with Sharp for compression
        const originalPath = req.file.path;
        const filename = req.file.filename;
        const compressedFilename = `compressed-${filename}`;
        // Output path for compressed image (still in uploads folder)
        const compressedPath = path.join(req.file.destination, compressedFilename);

        try {
            await sharp(originalPath)
                .resize({ width: 1200, withoutEnlargement: true }) // Resize to max width 1200px, don't enlarge if smaller
                .jpeg({ quality: 75 }) // Convert to JPEG with 75% quality
                .toFile(compressedPath);

            // Optionally delete the original uncompressed file
            fs.unlink(originalPath, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting original uncompressed file:", unlinkErr);
            });

            // Return the path to the compressed image
            // The path should be relative to how it will be served, e.g. /uploads/compressed-image.jpg
            // Ensure backend/uploads is served statically for this to work directly
            res.status(201).json({
                message: 'Image uploaded and compressed successfully.',
                imageUrl: `/uploads/${compressedFilename}` // This URL needs to be accessible by the client
            });

        } catch (processingError) {
            console.error('Error processing image with Sharp:', processingError);
            // Attempt to delete the uploaded file if processing fails
            fs.unlink(originalPath, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting file after processing error:", unlinkErr);
            });
            return res.status(500).json({ message: 'Error processing image.' });
        }
    });
});

module.exports = router;
