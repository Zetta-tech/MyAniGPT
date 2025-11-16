import { AnimeAgent } from '../ai/animeAgent';

class ChatbotService {
  private animeAgent: AnimeAgent;

  constructor() {
    this.animeAgent = new AnimeAgent();
  }

  async sendMessage(message: string): Promise<string> {
    return await this.animeAgent.chat(message);
  }
}

// Export a singleton instance
export const chatbotService = new ChatbotService();
