const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FileProcessor = require('../services/fileProcessor');
const EmbeddingService = require('../services/embeddingService');
const PineconeService = require('../services/pineconeService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    files: 10 // Maximum 10 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: PDF, Word, TXT`), false);
    }
  }
});

class UploadController {
  static uploadMiddleware = upload.array('files', 10);

  static async processFiles(req, res) {
    console.log('🚀 Starting file processing...');
    
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
          error: 'No files uploaded',
          message: 'Please select at least one file to upload'
        });
      }

      console.log(`📁 Processing ${req.files.length} files`);

      const embeddingService = new EmbeddingService();
      const pineconeService = new PineconeService();
      const results = [];
      
      // Process files in batches to manage memory
      const BATCH_SIZE = 3; // Process 3 files at a time
      
      for (let i = 0; i < req.files.length; i += BATCH_SIZE) {
        const batch = req.files.slice(i, i + BATCH_SIZE);
        console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(req.files.length/BATCH_SIZE)} (${batch.length} files)`);
        
        for (const file of batch) {
        console.log(`\n📄 Processing file: ${file.originalname}`);
        
        try {
          // Validate file
          FileProcessor.validateFile(file);
          
          // Extract text from file
          const text = await FileProcessor.extractText(file.path, file.mimetype);
          
          if (!text || text.trim().length === 0) {
            throw new Error('No text content found in file');
          }
          
          // Validate text length
          if (text.length > 1000000) { // 1MB of text
            console.log(`⚠️ Large text file detected: ${text.length} characters`);
          }
          
          // Chunk the text
          const chunks = FileProcessor.chunkText(text);
          
          if (!chunks || chunks.length === 0) {
            throw new Error('Failed to create text chunks from file content');
          }
          
          console.log(`📝 Created ${chunks.length} text chunks for processing`);
          
          // Create embeddings for chunks
          console.log(`🧠 Creating embeddings for ${chunks.length} chunks...`);
          let embeddings;
          try {
            embeddings = await embeddingService.createMultipleEmbeddings(chunks);
            if (!embeddings || embeddings.length !== chunks.length) {
              throw new Error(`Embedding count mismatch: expected ${chunks.length}, got ${embeddings ? embeddings.length : 0}`);
            }
          } catch (embeddingError) {
            console.error(`❌ Embedding creation failed:`, embeddingError);
            throw new Error(`Failed to create embeddings: ${embeddingError.message}`);
          }
          
          // Prepare vectors for Pinecone
          const vectors = chunks.map((chunk, index) => ({
            id: PineconeService.generateVectorId(file.filename, index),
            values: embeddings[index],
            metadata: {
              filename: file.originalname,
              fileId: file.filename,
              chunkIndex: index,
              text: chunk,
              fileType: file.mimetype,
              fileSize: file.size,
              uploadDate: new Date().toISOString(),
              department: req.body.department || 'general',
              chunkLength: chunk.length
            }
          }));
          
          // Store in Pinecone
          console.log(`📤 Storing ${vectors.length} vectors in Pinecone...`);
          try {
            await pineconeService.upsertVectors(vectors);
            console.log(`✅ Successfully stored ${vectors.length} vectors in Pinecone`);
          } catch (pineconeError) {
            console.error(`❌ Pinecone storage failed:`, pineconeError);
            throw new Error(`Failed to store vectors in database: ${pineconeError.message}`);
          }
          
          results.push({
            filename: file.originalname,
            fileSize: file.size,
            chunks: chunks.length,
            vectors: vectors.length,
            status: 'success',
            message: `Successfully processed and stored ${chunks.length} text chunks`
          });
          
          console.log(`✅ Successfully processed ${file.originalname}`);
          
        } catch (error) {
          console.error(`❌ Error processing file ${file.originalname}:`, error);
          results.push({
            filename: file.originalname,
            status: 'error',
            error: error.message
          });
        } finally {
          // Clean up uploaded file
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
              console.log(`🗑️ Cleaned up temporary file: ${file.filename}`);
            }
          } catch (cleanupError) {
            console.error(`⚠️ Error cleaning up file ${file.filename}:`, cleanupError);
          }
        }
        
        // Force garbage collection between batches if available
        if (global.gc && i + BATCH_SIZE < req.files.length) {
          console.log('🧹 Running garbage collection between batches...');
          global.gc();
        }
      }
      }

      // Summary
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      console.log(`\n📊 Processing complete: ${successCount} successful, ${errorCount} failed`);

      res.json({
        message: `Processed ${req.files.length} files`,
        summary: {
          total: req.files.length,
          successful: successCount,
          failed: errorCount
        },
        results
      });
      
    } catch (error) {
      console.error('❌ Upload processing error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to process uploaded files',
        details: error.message
      });
    }
  }

  // Health check for upload system
  static async healthCheck(req, res) {
    try {
      console.log('🔍 Running upload system health check...');
      
      const embeddingService = new EmbeddingService();
      const pineconeService = new PineconeService();
      
      // Test OpenAI connection
      const openaiStatus = await embeddingService.testConnection();
      
      // Test Pinecone connection
      const pineconeStatus = await pineconeService.testConnection();
      
      const status = {
        openai: openaiStatus ? 'connected' : 'disconnected',
        pinecone: pineconeStatus ? 'connected' : 'disconnected',
        uploadDir: fs.existsSync(path.join(__dirname, '../../uploads')) ? 'exists' : 'missing'
      };
      
      const allHealthy = openaiStatus && pineconeStatus;
      
      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'unhealthy',
        services: status,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = UploadController;