const express = require('express');
const UploadController = require('../controllers/uploadController');

const router = express.Router();

// File upload endpoint
router.post('/', UploadController.uploadMiddleware, UploadController.processFiles);

// Health check endpoint
router.get('/health', UploadController.healthCheck);

// Get upload statistics (optional)
router.get('/stats', async (req, res) => {
  try {
    const PineconeService = require('../services/pineconeService');
    const pineconeService = new PineconeService();
    
    const stats = await pineconeService.getIndexStats();
    
    res.json({
      message: 'Upload system statistics',
      pinecone: {
        totalVectors: stats.totalVectorCount,
        dimension: stats.dimension,
        indexName: process.env.PINECONE_INDEX_NAME
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

module.exports = router;