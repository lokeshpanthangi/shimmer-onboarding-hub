const EmbeddingService = require('../services/embeddingService');
const PineconeService = require('../services/pineconeService');

const processQuery = async (req, res) => {
    console.log('💬 Processing chat query...');
    
    try {
      const { message, department, conversationHistory = [] } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ 
          error: 'No message provided',
          message: 'Please provide a message to process'
        });
      }

      console.log(`📝 User question: "${message}"`);
      console.log(`🏢 Department filter: ${department || 'all'}`);
      console.log(`📚 Conversation history: ${conversationHistory.length} messages`);

      const embeddingService = new EmbeddingService();
      const pineconeService = new PineconeService();

      // Step 1: Create embedding for the user's question
      console.log('🧠 Step 1: Creating embedding for user question...');
      const questionEmbedding = await embeddingService.createEmbedding(message);
      console.log(`✅ Question embedding created with ${questionEmbedding.length} dimensions`);

      // Step 2: Search for similar vectors in Pinecone
      console.log('🔍 Step 2: Searching for relevant documents...');
      const searchFilter = department && department !== 'all' ? { department } : undefined;
      
      let similarVectors = [];
      try {
        if (searchFilter) {
          similarVectors = await pineconeService.queryVectors(
            questionEmbedding, 
            5, // Top 5 most relevant chunks
            searchFilter
          );
        } else {
          // Query without filter when no department is specified
          similarVectors = await pineconeService.queryVectors(
            questionEmbedding, 
            5 // Top 5 most relevant chunks
          );
        }
      } catch (pineconeError) {
        console.error('❌ Pinecone query failed:', pineconeError.message);
        console.error('❌ Pinecone error details:', {
          name: pineconeError.name,
          message: pineconeError.message,
          cause: pineconeError.cause
        });
        
        return res.status(500).json({
          error: 'Document search failed',
          message: 'Unable to search company documents. Please check system configuration.',
          pineconeError: pineconeError.message
        });
      }
      
      console.log(`📊 Found ${similarVectors.length} relevant document chunks`);

      // Step 3: Extract context from retrieved chunks
      console.log('📖 Step 3: Extracting context from relevant chunks...');
      const contextChunks = similarVectors.map(match => ({
        text: match.metadata?.text || '',
        filename: match.metadata?.filename || 'unknown',
        score: match.score || 0,
        department: match.metadata?.department || 'general'
      }));

      // Use a tiered approach for similarity scores
      const highConfidenceChunks = contextChunks.filter(chunk => chunk.score > 0.7);
      const mediumConfidenceChunks = contextChunks.filter(chunk => chunk.score > 0.5 && chunk.score <= 0.7);
      const lowConfidenceChunks = contextChunks.filter(chunk => chunk.score > 0.3 && chunk.score <= 0.5);
      
      console.log(`📊 Similarity scores: ${contextChunks.map(c => c.score.toFixed(3)).join(', ')}`);
      console.log(`✅ High confidence chunks (>0.7): ${highConfidenceChunks.length}`);
      console.log(`⚠️ Medium confidence chunks (0.5-0.7): ${mediumConfidenceChunks.length}`);
      console.log(`⚡ Low confidence chunks (0.3-0.5): ${lowConfidenceChunks.length}`);
      
      // Use the best available chunks, prioritizing higher confidence
      let relevantChunks = [];
      let confidenceLevel = 'none';
      
      if (highConfidenceChunks.length > 0) {
        relevantChunks = highConfidenceChunks;
        confidenceLevel = 'high';
      } else if (mediumConfidenceChunks.length > 0) {
        relevantChunks = mediumConfidenceChunks;
        confidenceLevel = 'medium';
      } else if (lowConfidenceChunks.length > 0) {
        relevantChunks = lowConfidenceChunks;
        confidenceLevel = 'low';
      }
      
      // Only return no results if we have absolutely no relevant chunks
      if (relevantChunks.length === 0) {
        console.log('❌ No relevant documents found with any meaningful similarity score');
        return res.status(404).json({
          error: 'No relevant information found',
          message: 'No company documents contain information relevant to your question. Please contact HR directly or try rephrasing your question.',
          searchResults: similarVectors.length,
          relevantResults: 0
        });
      }

      // Combine context text
      const contextText = relevantChunks
        .map(chunk => `[${chunk.filename}] ${chunk.text}`)
        .join('\n\n');

      console.log(`📄 Context length: ${contextText.length} characters`);

      // Step 4: Generate response using GPT with context
      console.log(`🤖 Step 4: Generating AI response with context (confidence: ${confidenceLevel})...`);
      
      // Prepare conversation messages for GPT
      const messages = [
        ...conversationHistory.slice(-6), // Keep last 6 messages for context
        { role: 'user', content: message }
      ];

      const aiResponse = await embeddingService.generateChatResponse(messages, contextText, confidenceLevel);
      console.log(`✅ AI response generated (${aiResponse.length} characters)`);

      // Step 5: Prepare sources information
      const sources = relevantChunks.map(chunk => ({
        filename: chunk.filename,
        score: Math.round(chunk.score * 100) / 100, // Round to 2 decimal places
        department: chunk.department
      }));

      // Step 6: Return response with sources
      const response = {
        response: aiResponse,
        sources: sources,
        contextUsed: contextText.length > 0,
        relevantChunks: relevantChunks.length,
        totalSearchResults: similarVectors.length,
        confidenceLevel: confidenceLevel
      };

      console.log(`🎉 Chat response completed successfully`);
      console.log(`📊 Response stats: ${sources.length} sources, ${relevantChunks.length} relevant chunks`);

      res.json(response);

    } catch (error) {
      console.error('❌ Error processing chat query:', error);
      
      res.status(500).json({
        error: 'Chat processing failed',
        message: 'Unable to process your request. Please try again.',
        details: error.message
      });
    }
};

const healthCheck = async (req, res) => {
    try {
      console.log('🔍 Running chat system health check...');
      
      const embeddingService = new EmbeddingService();
      const pineconeService = new PineconeService();
      
      // Test OpenAI connection
      const openaiStatus = await embeddingService.testConnection();
      
      // Test Pinecone connection
      const pineconeStatus = await pineconeService.testConnection();
      
      // Get index statistics
      let indexStats = null;
      try {
        indexStats = await pineconeService.getIndexStats();
      } catch (error) {
        console.log('⚠️ Could not retrieve index stats:', error.message);
      }
      
      const status = {
        openai: openaiStatus ? 'connected' : 'disconnected',
        pinecone: pineconeStatus ? 'connected' : 'disconnected',
        indexStats: indexStats ? {
          totalVectors: indexStats.totalVectorCount || 0,
          dimension: indexStats.dimension || 0
        } : null,
        chatSystemReady: openaiStatus && pineconeStatus
      };
      
      const allHealthy = openaiStatus && pineconeStatus;
      
      console.log('📊 Chat system health check completed:', status);
      
      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: status
      });
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
};

module.exports = {
  processQuery,
  healthCheck
};