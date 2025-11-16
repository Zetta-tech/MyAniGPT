import { Agent, run, setDefaultOpenAIKey } from '@openai/agents';
import { ANIME_AGENT_SYSTEM_PROMPT } from './animeAgentPrompt';
import { animeAgentTools } from './animeAgentTools';
import { CustomMemorySession } from './sessionManager';
import type { StreamEvent } from '../services/chatbotService';

export class AnimeAgent {
    private agent: Agent;
    private session: CustomMemorySession;

    constructor() {
        setDefaultOpenAIKey(process.env.OPENAI_API_KEY!);

        this.agent = new Agent({
            name: 'AnimeExpert',
            instructions: ANIME_AGENT_SYSTEM_PROMPT,
            tools: animeAgentTools,
            model: "gpt-4.1-mini-2025-04-14"
        });

        this.session = new CustomMemorySession();
    }

    async chat(message: string): Promise<string> {
        try {
            const result = await run(this.agent, message, { session: this.session });
            return result.finalOutput || 'Sorry, I could not generate a response.';
        } catch (error) {
            console.error('Error in AnimeAgent chat:', error);
            throw new Error('Failed to get response from anime agent');
        }
    }

    async *streamChat(message: string): AsyncGenerator<StreamEvent> {
        try {
            const result = await run(this.agent, message, {
                session: this.session,
                stream: true
            });

            let currentToolCall: { name: string; args: string; timestamp: number } | null = null;
            let accumulatedText = '';

            for await (const event of result) {
                // Handle raw model stream events (text deltas)
                if (event.type === 'raw_model_stream_event') {
                    const data = event.data as any;

                    // Text delta
                    if (data.type === 'output_text_delta' && data.delta) {
                        accumulatedText += data.delta;
                        yield {
                            type: 'text_delta',
                            content: data.delta,
                            timestamp: Date.now()
                        };
                    }
                }

                // Handle run item events (tool calls and results)
                if (event.type === 'run_item_stream_event') {
                    const item = event.item as any;
                    const eventName = event.name as string;

                    // Tool call started
                    if (item.type === 'tool_call_item' && eventName === 'tool_call_started') {
                        currentToolCall = {
                            name: item.name || 'unknown_tool',
                            args: '',
                            timestamp: Date.now()
                        };
                    }

                    // Tool call arguments
                    if (item.type === 'tool_call_item' && item.arguments) {
                        if (currentToolCall) {
                            currentToolCall.args = item.arguments;
                        }
                    }

                    // Tool call completed - emit start event with args
                    if (item.type === 'tool_call_item' && eventName === 'tool_call_completed') {
                        try {
                            const parsedArgs = item.arguments ? JSON.parse(item.arguments) : {};
                            yield {
                                type: 'tool_call_start',
                                toolName: item.name || 'unknown_tool',
                                toolArgs: parsedArgs,
                                timestamp: Date.now()
                            };
                        } catch {
                            yield {
                                type: 'tool_call_start',
                                toolName: item.name || 'unknown_tool',
                                toolArgs: item.arguments || {},
                                timestamp: Date.now()
                            };
                        }
                    }

                    // Tool output received
                    if (item.type === 'tool_call_output_item' && eventName === 'tool_call_output_added') {
                        yield {
                            type: 'tool_call_end',
                            toolName: item.tool_call_name || 'unknown_tool',
                            toolResult: item.output || 'No output',
                            timestamp: Date.now()
                        };
                        currentToolCall = null;
                    }

                    // Handoff events
                    if (item.type === 'handoff_call_item' && eventName === 'handoff_occurred') {
                        yield {
                            type: 'agent_thinking',
                            content: `Transferring to ${item.name || 'another agent'}...`,
                            timestamp: Date.now()
                        };
                    }
                }

                // Handle agent updates
                if (event.type === 'agent_updated_stream_event') {
                    yield {
                        type: 'agent_thinking',
                        agentName: event.agent.name,
                        content: `Agent switched to: ${event.agent.name}`,
                        timestamp: Date.now()
                    };
                }
            }

            yield {
                type: 'complete',
                content: accumulatedText,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Error in AnimeAgent streamChat:', error);
            yield {
                type: 'error',
                content: 'Failed to get response from anime agent',
                timestamp: Date.now()
            };
        }
    }

    async resetSession(): Promise<void> {
        await this.session.clearSession();
    }

    async getSessionId(): Promise<string> {
        return await this.session.getSessionId();
    }

    getAgent(): Agent {
        return this.agent;
    }
}
