const express = require('express');
const router = express.Router();

// Import controller methods directly
const { processQuery, healthCheck } = require('../controllers/chatController');

// Chat query endpoint - main RAG pipeline
router.post('/', processQuery);

// Health check endpoint for chat system
router.get('/health', healthCheck);

module.exports = router;