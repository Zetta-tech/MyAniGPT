'use client';

import { useState, useRef, useEffect } from 'react';

interface ToolCall {
  name: string;
  args: any;
  result?: any;
  status: 'running' | 'completed';
  timestamp: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentToolCalls]);

  useEffect(() => {
    const resetOnLoad = async () => {
      try {
        await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset' }),
        });
      } catch (error) {
        console.error('Error resetting chat on load:', error);
      }
    };
    resetOnLoad();
  }, []);

  const handleResetChat = async () => {
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });

      if (response.ok) {
        setMessages([]);
        setCurrentToolCalls([]);
      }
    } catch (error) {
      console.error('Error resetting chat:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setCurrentToolCalls([]);

    // Add empty assistant message for streaming
    const assistantMessageIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      const toolCallsMap = new Map<string, ToolCall>();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              console.log('[Frontend] Event received:', event.type, event);

              switch (event.type) {
                case 'text_delta':
                  accumulatedText += event.content;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[assistantMessageIndex] = {
                      role: 'assistant',
                      content: accumulatedText,
                      isStreaming: true,
                    };
                    return newMessages;
                  });
                  break;

                case 'tool_call_start':
                  const newToolCall: ToolCall = {
                    name: event.toolName,
                    args: event.toolArgs,
                    status: 'running',
                    timestamp: event.timestamp,
                  };
                  toolCallsMap.set(event.toolName + event.timestamp, newToolCall);
                  setCurrentToolCalls(Array.from(toolCallsMap.values()));
                  break;

                case 'tool_call_end':
                  const existingCall = Array.from(toolCallsMap.values()).find(
                    tc => tc.name === event.toolName && tc.status === 'running'
                  );
                  if (existingCall) {
                    existingCall.status = 'completed';
                    existingCall.result = event.toolResult;
                    setCurrentToolCalls(Array.from(toolCallsMap.values()));
                  }
                  break;

                case 'agent_thinking':
                  // Could show agent switches here
                  break;

                case 'complete':
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[assistantMessageIndex] = {
                      role: 'assistant',
                      content: accumulatedText || event.content,
                      toolCalls: Array.from(toolCallsMap.values()),
                      isStreaming: false,
                    };
                    return newMessages;
                  });
                  setCurrentToolCalls([]);
                  break;

                case 'error':
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[assistantMessageIndex] = {
                      role: 'assistant',
                      content: event.content || 'An error occurred',
                      isStreaming: false,
                    };
                    return newMessages;
                  });
                  break;
              }
            } catch (parseError) {
              console.error('Error parsing event:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error sending message:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[assistantMessageIndex] = {
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            isStreaming: false,
          };
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-zinc-950 dark:via-slate-900 dark:to-zinc-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="w-full max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                Anime AI Assistant
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Powered by OpenAI Agents</p>
            </div>
          </div>
          <button
            onClick={handleResetChat}
            className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all duration-200 text-sm font-medium border border-slate-200 dark:border-zinc-700"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-5xl mx-auto p-6 flex flex-col">
        <div className="flex-1 mb-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center mt-20">
              <div className="inline-block p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-700">
                <div className="text-5xl mb-4">👋</div>
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
                  Welcome to Anime AI
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Ask me anything about anime, manga, or get personalized recommendations!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl p-4 shadow-md ${message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                          : 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-zinc-700'
                        }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                        {message.isStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                        )}
                      </p>
                    </div>

                    {/* Tool Calls Display */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.toolCalls.map((tool, toolIndex) => (
                          <div
                            key={toolIndex}
                            className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-3 text-sm"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">
                                {tool.status === 'completed' ? '✅' : '⚙️'}
                              </span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {tool.name}
                              </span>
                              <span className={`ml-auto text-xs px-2 py-1 rounded-full ${tool.status === 'completed'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                }`}>
                                {tool.status}
                              </span>
                            </div>
                            <details className="text-xs text-slate-600 dark:text-slate-400">
                              <summary className="cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                                View details
                              </summary>
                              <div className="mt-2 p-2 bg-white dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700">
                                <div className="mb-2">
                                  <strong>Arguments:</strong>
                                  <pre className="mt-1 overflow-x-auto">
                                    {JSON.stringify(tool.args, null, 2)}
                                  </pre>
                                </div>
                                {tool.result && (
                                  <div>
                                    <strong>Result:</strong>
                                    <pre className="mt-1 overflow-x-auto">
                                      {typeof tool.result === 'string'
                                        ? tool.result.substring(0, 200) + (tool.result.length > 200 ? '...' : '')
                                        : JSON.stringify(tool.result, null, 2).substring(0, 200) + '...'}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </details>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Active Tool Calls */}
              {currentToolCalls.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <div className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Agent is using tools...
                        </span>
                      </div>
                      <div className="space-y-2">
                        {currentToolCalls.map((tool, index) => (
                          <div
                            key={index}
                            className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">
                                {tool.status === 'completed' ? '✅' : '⚙️'}
                              </span>
                              <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
                                {tool.name}
                              </span>
                              {tool.status === 'running' && (
                                <div className="ml-auto flex gap-1">
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-700 p-4">
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about anime, characters, recommendations..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-600 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </span>
              ) : (
                '✨ Send'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
