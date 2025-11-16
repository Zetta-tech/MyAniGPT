import { AnimeAgent } from '../ai/animeAgent';

export interface StreamEvent {
  type: 'text_delta' | 'tool_call_start' | 'tool_call_end' | 'agent_thinking' | 'complete' | 'error';
  content?: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  agentName?: string;
  timestamp?: number;
}

class ChatbotService {
  private animeAgent: AnimeAgent;

  constructor() {
    this.animeAgent = new AnimeAgent();
  }

  async sendMessage(message: string): Promise<string> {
    return await this.animeAgent.chat(message);
  }

  async *streamMessage(message: string): AsyncGenerator<StreamEvent> {
    yield* this.animeAgent.streamChat(message);
  }

  async resetChat(): Promise<void> {
    await this.animeAgent.resetSession();
  }

  async getSessionId(): Promise<string> {
    return await this.animeAgent.getSessionId();
  }
}

// Export a singleton instance
export const chatbotService = new ChatbotService();
