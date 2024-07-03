const express = require('express');
const router = express.Router();
const { getImages, getImageById,  deleteImage, getSavedImages, PostSaveImage } = require('../controllers/imagesController');
const authMiddleware = require('../middleware/authMiddlware');

router.get('/images',authMiddleware, getImages);
router.get('/images/:id',authMiddleware, getImageById);
router.get('/saved-images', authMiddleware, getSavedImages);
router.post('/saved-images', authMiddleware, PostSaveImage);
router.delete('/images/:id', authMiddleware, deleteImage);

module.exports = router;
