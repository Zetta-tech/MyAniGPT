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
            model: "gpt-4.1-mini-2025-04-14",
            modelSettings: {
                toolChoice: 'auto', // Let model decide when to use tools
                
            }
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
            console.log('[streamChat] Starting stream for message:', message);
            const result = await run(this.agent, message, {
                session: this.session,
                stream: true
            });

            let currentToolCall: { name: string; args: string; timestamp: number } | null = null;
            let accumulatedText = '';

            console.log('[streamChat] Stream started, listening for events...');
            
            // Track which tools we've already notified the frontend about
            const notifiedTools = new Set<string>();
            
            for await (const event of result) {
                // Check for new tool calls in newItems and emit events for them
                if (result.newItems && result.newItems.length > 0) {
                    const toolItems = result.newItems.filter((item: any) => item.type === 'tool_call_item');
                    for (const toolItem of toolItems) {
                        const toolName = toolItem.rawItem?.name || toolItem.rawItem?.function?.name || 'unknown_tool';
                        const toolId = toolItem.rawItem?.id || `${toolName}_${Date.now()}`;
                        
                        // Only emit if we haven't notified about this tool yet
                        if (!notifiedTools.has(toolId)) {
                            notifiedTools.add(toolId);
                            console.log('[streamChat] 🔧 Tool called:', toolName);
                            
                            // Emit tool_call_start event to frontend
                            yield {
                                type: 'tool_call_start',
                                toolName: toolName,
                                toolArgs: toolItem.rawItem?.arguments ? JSON.parse(toolItem.rawItem.arguments) : {},
                                timestamp: Date.now()
                            };
                        }
                    }
                    
                    // Check for completed tool calls
                    const toolOutputItems = result.newItems.filter((item: any) => item.type === 'tool_call_output_item');
                    for (const outputItem of toolOutputItems) {
                        const toolName = outputItem.tool_call_name || outputItem.rawItem?.tool_call_name || 'unknown_tool';
                        console.log('[streamChat] ✅ Tool completed:', toolName);
                        
                        // Emit tool_call_end event to frontend
                        yield {
                            type: 'tool_call_end',
                            toolName: toolName,
                            toolResult: outputItem.output || outputItem.rawItem?.output || 'No output',
                            timestamp: Date.now()
                        };
                    }
                }
                
                console.log('[streamChat] Event received:', event.type, event);
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

                    // Tool call started - emit immediately so UI shows it
                    if (item.type === 'tool_call_item' && eventName === 'tool_call_started') {
                        const toolName = item.name || 'unknown_tool';
                        currentToolCall = {
                            name: toolName,
                            args: '',
                            timestamp: Date.now()
                        };

                        // Emit tool_call_start immediately when tool starts
                        yield {
                            type: 'tool_call_start',
                            toolName: toolName,
                            toolArgs: {},
                            timestamp: Date.now()
                        };

                        console.log('[streamChat] Tool started:', toolName);
                    }

                    // Tool call arguments - update with args
                    if (item.type === 'tool_call_item' && item.arguments && eventName === 'tool_call_completed') {
                        if (currentToolCall) {
                            currentToolCall.args = item.arguments;
                            try {
                                const parsedArgs = JSON.parse(item.arguments);
                                console.log('[streamChat] Tool args:', parsedArgs);
                            } catch {
                                console.log('[streamChat] Tool args (raw):', item.arguments);
                            }
                        }
                    }

                    // Tool output received
                    if (item.type === 'tool_call_output_item' && eventName === 'tool_call_output_added') {
                        const toolName = item.tool_call_name || 'unknown_tool';
                        console.log('[streamChat] Tool completed:', toolName);
                        console.log('[streamChat] Tool output:', item.output);
                        console.log('[streamChat] Tool output length:', item.output?.length || 0);

                        yield {
                            type: 'tool_call_end',
                            toolName: toolName,
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

            // Log summary of all tools used
            const toolsUsed = result.newItems
                .filter((item: any) => item.type === 'tool_call_item')
                .map((item: any) => item.rawItem?.name || item.rawItem?.function?.name || 'unknown');
            
            if (toolsUsed.length > 0) {
                console.log('[streamChat] ✅ Tools used in this conversation:', toolsUsed);
            } else {
                console.log('[streamChat] ⚠️ No tools were called in this conversation');
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

    /**
     * Simple text-only streaming using toTextStream() helper
     * Returns a ReadableStream compatible with Web Streams API
     */
    async streamTextOnly(message: string) {
        const result = await run(this.agent, message, {
            session: this.session,
            stream: true
        });

        // Use toTextStream() helper for simple text streaming
        const textStream = result.toTextStream({
            compatibleWithNodeStreams: false, // Use Web Streams API for Next.js
        });

        // Ensure completion is awaited in the background
        result.completed.catch(error => {
            console.error('Stream completion error:', error);
        });

        return textStream;
    }

    /**
     * Listen to all events - useful for debugging and understanding the stream
     * Demonstrates how to inspect each event as it arrives
     */
    async listenToAllEvents(message: string): Promise<void> {
        const result = await run(this.agent, message, {
            session: this.session,
            stream: true
        });

        for await (const event of result) {
            // these are the raw events from the model
            if (event.type === 'raw_model_stream_event') {
                console.log(`${event.type} %o`, event.data);
            }

            // agent updated events
            if (event.type === 'agent_updated_stream_event') {
                console.log(`${event.type} %s`, event.agent.name);
            }

            // Agent SDK specific events
            if (event.type === 'run_item_stream_event') {
                console.log(`${event.type} %o`, event.item);
            }
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
