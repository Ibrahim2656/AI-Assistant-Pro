import { HfInference } from "@huggingface/inference";
import type { ConversationMemory } from "../types";

const hf = new HfInference(import.meta.env.VITE_HF_API_KEY);

export class EmbeddingService {
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await hf.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: text,
      });

      // Handle different return types from Hugging Face API
      if (Array.isArray(response)) {
        // If it's already a flat array of numbers
        if (typeof response[0] === 'number') {
          return response as number[];
        }
        // If it's a 2D array, flatten it or take first row
        if (Array.isArray(response[0])) {
          return (response[0] as number[]);
        }
      }
      
      return [];
    } catch (error) {
      console.error("❌ Embedding error:", error);
      return [];
    }
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magA === 0 || magB === 0) return 0;
    
    return dotProduct / (magA * magB);
  }

  static async findSimilarConversations(
    query: string,
    limit: number = 3
  ): Promise<ConversationMemory[]> {
    const memories = this.getMemories();
    if (memories.length === 0) return [];

    const queryEmbedding = await this.generateEmbedding(query);
    if (queryEmbedding.length === 0) return [];

    const scored = memories
      .filter((m) => m.embedding && m.embedding.length > 0)
      .map((memory) => ({
        memory,
        score: this.cosineSimilarity(queryEmbedding, memory.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((s) => s.memory);
  }

  static getMemories(): ConversationMemory[] {
    try {
      const stored = localStorage.getItem("conversation_memory");
      if (!stored) return [];
      return JSON.parse(stored).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    } catch (error) {
      console.error("Error loading memories:", error);
      return [];
    }
  }

  static async saveMemory(userMessage: string, botResponse: string) {
    try {
      const embedding = await this.generateEmbedding(userMessage);
      const memory: ConversationMemory = {
        id: Date.now().toString(),
        userMessage,
        botResponse,
        timestamp: new Date(),
        embedding,
      };

      const memories = this.getMemories();
      memories.push(memory);

      // Keep only last 100 conversations
      if (memories.length > 100) {
        memories.shift();
      }

      localStorage.setItem("conversation_memory", JSON.stringify(memories));
    } catch (error) {
      console.error("Error saving memory:", error);
    }
  }

  static clearMemories() {
    localStorage.removeItem("conversation_memory");
  }
}   