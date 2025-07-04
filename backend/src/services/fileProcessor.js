const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

class FileProcessor {
  static async extractText(filePath, mimeType) {
    try {
      console.log(`📄 Extracting text from ${path.basename(filePath)} (${mimeType})`);
      
      switch (mimeType) {
        case 'application/pdf':
          return await this.extractFromPDF(filePath);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.extractFromWord(filePath);
        case 'text/plain':
          return await this.extractFromText(filePath);
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error('❌ Error extracting text:', error);
      throw error;
    }
  }

  static async extractFromPDF(filePath) {
    try {
      // Use streaming for large files to reduce memory usage
      const stats = fs.statSync(filePath);
      console.log(`📊 PDF file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer, {
        // Optimize for large files
        max: 0, // No page limit
        version: 'v1.10.100'
      });
      
      console.log(`✅ Extracted ${data.text.length} characters from PDF`);
      
      // Clear buffer from memory
      if (global.gc) {
        global.gc();
      }
      
      return data.text;
    } catch (error) {
      console.error('❌ PDF extraction error:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  static async extractFromWord(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    console.log(`✅ Extracted ${result.value.length} characters from Word document`);
    return result.value;
  }

  static async extractFromText(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    console.log(`✅ Extracted ${text.length} characters from text file`);
    return text;
  }

  static chunkText(text, chunkSize = null, overlap = null) {
    // Validate input
    if (!text || typeof text !== 'string') {
      console.log('⚠️ Invalid text input for chunking');
      return [];
    }
    
    // Use environment variables or defaults
    const defaultChunkSize = parseInt(process.env.CHUNK_SIZE) || 2000;
    const defaultOverlap = parseInt(process.env.CHUNK_OVERLAP) || 400;
    
    let finalChunkSize = chunkSize || defaultChunkSize;
    let finalOverlap = overlap || defaultOverlap;
    
    // Validate and adjust parameters
    finalChunkSize = Math.max(100, Math.min(finalChunkSize, 10000)); // Between 100-10000 chars
    finalOverlap = Math.max(0, Math.min(finalOverlap, finalChunkSize - 50)); // Overlap can't be >= chunk size
    
    console.log(`🔪 Chunking text of ${text.length} characters (chunk size: ${finalChunkSize}, overlap: ${finalOverlap})`);
    
    // Handle very short text
    if (text.length <= finalChunkSize) {
      const trimmedText = text.trim();
      if (trimmedText.length > 0) {
        console.log(`✅ Created 1 chunk (text shorter than chunk size)`);
        return [trimmedText];
      }
      return [];
    }
    
    const chunks = [];
    let start = 0;
    let iterationCount = 0;
    const maxIterations = Math.ceil(text.length / (finalChunkSize - finalOverlap)) + 10; // Safety limit
    
    while (start < text.length && iterationCount < maxIterations) {
      const end = Math.min(start + finalChunkSize, text.length);
      const chunk = text.slice(start, end);
      
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
      
      // Calculate next start position
      const nextStart = end - finalOverlap;
      
      // Prevent infinite loops
      if (nextStart <= start) {
        start = start + Math.max(1, Math.floor(finalChunkSize / 2));
      } else {
        start = nextStart;
      }
      
      iterationCount++;
      
      // Safety check for array size
      if (chunks.length > 10000) {
        console.log('⚠️ Chunk limit reached (10000), stopping chunking');
        break;
      }
    }
    
    console.log(`✅ Created ${chunks.length} chunks`);
    return chunks;
  }

  static validateFile(file) {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type: ${file.mimetype}`);
    }

    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File too large: ${file.size} bytes (max: ${maxSize} bytes)`);
    }

    return true;
  }
}

module.exports = FileProcessor;