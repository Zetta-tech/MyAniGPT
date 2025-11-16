import { Agent, run, setDefaultOpenAIKey } from '@openai/agents';
import { ANIME_AGENT_SYSTEM_PROMPT } from './animeAgentPrompt';
import { animeAgentTools } from './animeAgentTools';

export class AnimeAgent {
    private agent: Agent;

    constructor() {
        setDefaultOpenAIKey(process.env.OPENAI_API_KEY!);

        this.agent = new Agent({
            name: 'AnimeExpert',
            instructions: ANIME_AGENT_SYSTEM_PROMPT,
            tools: animeAgentTools,
            model: "gpt-4.1-mini-2025-04-14"
        });
    }

    async chat(message: string): Promise<string> {
        try {
            const result = await run(this.agent, message);
            return result.finalOutput || 'Sorry, I could not generate a response.';
        } catch (error) {
            console.error('Error in AnimeAgent chat:', error);
            throw new Error('Failed to get response from anime agent');
        }
    }

    getAgent(): Agent {
        return this.agent;
    }
}
