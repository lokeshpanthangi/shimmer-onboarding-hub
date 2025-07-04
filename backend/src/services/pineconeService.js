const { Pinecone } = require('@pinecone-database/pinecone');

class PineconeService {
  constructor() {
    if (!process.env.PINECONE_API_KEY || process.env.PINECONE_API_KEY === 'your_pinecone_api_key_here') {
      console.log('⚠️ Warning: PINECONE_API_KEY not configured');
      this.pinecone = null;
      this.indexName = process.env.PINECONE_INDEX_NAME || 'hrdocs';
      return;
    }
    
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    this.indexName = process.env.PINECONE_INDEX_NAME || 'hrdocs';
  }

  async initializeIndex() {
    if (!this.pinecone) {
      throw new Error('Pinecone client not initialized. Please check your PINECONE_API_KEY.');
    }
    
    try {
      console.log(`🔌 Connecting to Pinecone index: ${this.indexName}`);
      const index = this.pinecone.index(this.indexName);
      return index;
    } catch (error) {
      console.error('❌ Error initializing Pinecone index:', error);
      throw error;
    }
  }

  async upsertVectors(vectors) {
    try {
      console.log(`📤 Upserting ${vectors.length} vectors to Pinecone`);
      
      const index = await this.initializeIndex();
      
      // Process in batches to avoid payload size limits
      const batchSize = 100;
      const results = [];
      
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        console.log(`📦 Upserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectors.length/batchSize)}`);
        
        const response = await index.upsert(batch);
        results.push(response);
        
        // Small delay between batches
        if (i + batchSize < vectors.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ Successfully upserted ${vectors.length} vectors`);
      return results;
    } catch (error) {
      console.error('❌ Error upserting vectors:', error);
      throw error;
    }
  }

  async queryVectors(queryVector, topK = 5, filter = undefined) {
    try {
      console.log(`🔍 Querying Pinecone for top ${topK} similar vectors`);
      console.log(`📊 Query vector dimensions: ${queryVector ? queryVector.length : 'undefined'}`);
      console.log(`🎯 Filter: ${filter ? JSON.stringify(filter) : 'none'}`);
      
      const index = await this.initializeIndex();
      
      // Validate query vector
      if (!queryVector || !Array.isArray(queryVector) || queryVector.length === 0) {
        throw new Error(`Invalid query vector: expected non-empty array, got ${typeof queryVector}`);
      }
      
      const queryParams = {
        vector: queryVector,
        topK,
        includeMetadata: true,
        includeValues: false
      };
      
      // Only add filter if it's provided
      if (filter) {
        queryParams.filter = filter;
      }
      
      const response = await index.query(queryParams);
      
      console.log(`✅ Found ${response.matches.length} matching vectors`);
      return response.matches;
    } catch (error) {
      console.error('❌ Error querying vectors:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      throw error;
    }
  }

  async deleteVectors(ids) {
    try {
      console.log(`🗑️ Deleting ${ids.length} vectors from Pinecone`);
      
      const index = await this.initializeIndex();
      await index.deleteMany(ids);
      
      console.log(`✅ Successfully deleted vectors`);
    } catch (error) {
      console.error('❌ Error deleting vectors:', error);
      throw error;
    }
  }

  async getIndexStats() {
    try {
      console.log('📊 Getting Pinecone index statistics');
      
      const index = await this.initializeIndex();
      const stats = await index.describeIndexStats();
      
      console.log(`✅ Index stats:`, {
        totalVectorCount: stats.totalVectorCount,
        dimension: stats.dimension
      });
      
      return stats;
    } catch (error) {
      console.error('❌ Error getting index stats:', error);
      throw error;
    }
  }

  // Test connection to Pinecone
  async testConnection() {
    if (!this.pinecone) {
      console.log('❌ Pinecone client not initialized');
      return false;
    }
    
    try {
      console.log('🔍 Testing Pinecone connection...');
      await this.getIndexStats();
      console.log('✅ Pinecone connection successful');
      return true;
    } catch (error) {
      console.error('❌ Pinecone connection failed:', error);
      return false;
    }
  }

  // Helper method to generate unique vector IDs
  static generateVectorId(filename, chunkIndex) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${filename}-chunk-${chunkIndex}-${timestamp}-${random}`;
  }
}

module.exports = PineconeService;