const OpenAI = require('openai');

class EmbeddingService {
  constructor() {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('⚠️ Warning: OPENAI_API_KEY not configured');
      this.openai = null;
      return;
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Configure embedding dimensions from environment variable
    this.embeddingDimensions = parseInt(process.env.EMBEDDING_DIMENSIONS) || 2048;
    console.log(`🔧 Embedding dimensions configured: ${this.embeddingDimensions}`);
  }

  async createEmbedding(text) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please check your OPENAI_API_KEY.');
    }
    
    try {
      console.log(`🧠 Creating embedding for text of ${text.length} characters`);
      
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
        encoding_format: 'float',
        dimensions: this.embeddingDimensions
      });
      
      console.log(`✅ Created embedding with ${response.data[0].embedding.length} dimensions`);
      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Error creating embedding:', error);
      throw error;
    }
  }

  async createMultipleEmbeddings(texts) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please check your OPENAI_API_KEY.');
    }
    
    try {
      console.log(`🧠 Creating embeddings for ${texts.length} text chunks`);
      
      // Process in smaller batches for better memory management
      const batchSize = Math.min(50, texts.length); // Reduced batch size for large files
      const embeddings = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        console.log(`📦 Processing embedding batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(texts.length/batchSize)} (${batch.length} chunks)`);
        
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: batch,
          encoding_format: 'float',
          dimensions: this.embeddingDimensions
        });
        
        embeddings.push(...response.data.map(item => item.embedding));
        
        // Progressive delay based on batch size to respect rate limits
        if (i + batchSize < texts.length) {
          const delay = texts.length > 100 ? 200 : 100; // Longer delay for large files
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Force garbage collection for large batches
          if (global.gc && embeddings.length % 200 === 0) {
            console.log('🧹 Running garbage collection during embedding processing...');
            global.gc();
          }
        }
      }
      
      console.log(`✅ Created ${embeddings.length} embeddings`);
      return embeddings;
    } catch (error) {
      console.error('❌ Error creating multiple embeddings:', error);
      throw error;
    }
  }

  async generateChatResponse(messages, context = '', confidenceLevel = 'high') {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please check your OPENAI_API_KEY.');
    }
    
    try {
      console.log(`💬 Generating chat response with context length: ${context.length}, confidence: ${confidenceLevel}`);
      
      let systemPrompt = '';
      
      if (confidenceLevel === 'high') {
        systemPrompt = `You are a friendly and helpful HR assistant for this company. You have access to high-quality, relevant company documents to answer the user's question accurately.

GUIDELINES:
- Be conversational, warm, and professional in your tone
- Use the provided context to give accurate, specific information
- Always mention the source document when referencing specific policies
- Feel free to be helpful and engaging while staying factual
- If you need clarification, ask follow-up questions

Company Document Context:
${context}`;
      } else if (confidenceLevel === 'medium') {
        systemPrompt = `You are a helpful HR assistant for this company. You have some relevant information from company documents, though it may not be perfectly matched to the question.

GUIDELINES:
- Be conversational and helpful
- Use the available context but acknowledge if information seems partial
- Mention source documents when referencing policies
- Suggest contacting HR directly for complete details if needed
- Be honest about the limitations of the available information

Company Document Context:
${context}`;
      } else { // low confidence
        systemPrompt = `You are a friendly HR assistant for this company. The available information may only be loosely related to the user's question.

GUIDELINES:
- Be conversational and understanding
- Use any relevant context you have, but be clear about limitations
- Acknowledge that you may not have the complete answer
- Encourage the user to contact HR directly for authoritative information
- Still try to be helpful with what information is available
- Suggest rephrasing the question if it might help find better information

Available Context:
${context}`;
      }
      
      const systemMessage = {
        role: 'system',
        content: systemPrompt
      };

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [systemMessage, ...messages],
        max_tokens: 500,
        temperature: 0.7
      });

      console.log(`✅ Generated chat response`);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('❌ Error generating chat response:', error);
      throw error;
    }
  }

  // Test connection to OpenAI
  async testConnection() {
    if (!this.openai) {
      console.log('❌ OpenAI client not initialized');
      return false;
    }
    
    try {
      console.log('🔍 Testing OpenAI connection...');
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: 'test',
        encoding_format: 'float',
        dimensions: this.embeddingDimensions
      });
      console.log('✅ OpenAI connection successful');
      return true;
    } catch (error) {
      console.error('❌ OpenAI connection failed:', error);
      return false;
    }
  }
}

module.exports = EmbeddingService;