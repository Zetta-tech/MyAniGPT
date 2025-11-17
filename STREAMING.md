# Streaming Implementation Guide

This project demonstrates two approaches to implementing streaming with the OpenAI Agents SDK.

## Overview

The OpenAI Agents SDK supports streaming to deliver output incrementally, keeping your UI responsive and avoiding waiting for the entire result.

## Approach 1: Full Event Streaming

**Location**: `/chat` page, `/api/chat/stream` endpoint

### When to Use
- You need to show tool calls and their progress
- You want detailed control over different event types
- You need to display agent thinking states or handoffs
- You want to show loading indicators for specific operations

### Implementation

```typescript
// In animeAgent.ts
async *streamChat(message: string): AsyncGenerator<StreamEvent> {
  const result = await run(this.agent, message, {
    session: this.session,
    stream: true
  });

  for await (const event of result) {
    // Handle raw model stream events (text deltas)
    if (event.type === 'raw_model_stream_event') {
      const data = event.data as any;
      if (data.type === 'output_text_delta' && data.delta) {
        yield {
          type: 'text_delta',
          content: data.delta,
          timestamp: Date.now()
        };
      }
    }

    // Handle tool calls
    if (event.type === 'run_item_stream_event') {
      // Process tool_call_started, tool_call_completed, etc.
    }
  }
}
```

### Event Types You Can Handle
- `raw_model_stream_event`: Text deltas from the model
- `run_item_stream_event`: Tool calls, outputs, handoffs
- `agent_updated_stream_event`: Agent switches in multi-agent scenarios

### Frontend Consumption

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const event = JSON.parse(line);
    
    switch (event.type) {
      case 'text_delta':
        // Update UI with text
        break;
      case 'tool_call_start':
        // Show tool loading indicator
        break;
      case 'tool_call_end':
        // Update tool result
        break;
    }
  }
}
```

## Approach 2: Simple Text Streaming

**Location**: `/chat-simple` page, `/api/chat/text-stream` endpoint

### When to Use
- You only need the text output
- You want simpler, cleaner code
- You don't need to show tool call details
- You want faster implementation

### Implementation

```typescript
// In animeAgent.ts
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
```

### API Endpoint

```typescript
// In route.ts
const textStream = await chatbotService.streamTextOnly(message);

return new Response(textStream, {
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

### Frontend Consumption

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let accumulatedText = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  accumulatedText += chunk;

  // Update UI with accumulated text
  setMessages(prev => {
    const newMessages = [...prev];
    newMessages[index] = {
      role: 'assistant',
      content: accumulatedText,
      isStreaming: true,
    };
    return newMessages;
  });
}
```

## Comparison

| Feature | Full Event Streaming | Simple Text Streaming |
|---------|---------------------|----------------------|
| **Complexity** | Higher | Lower |
| **Code Lines** | ~150 lines | ~50 lines |
| **Tool Call Visibility** | ✅ Yes | ❌ No |
| **Text Streaming** | ✅ Yes | ✅ Yes |
| **Agent Events** | ✅ Yes | ❌ No |
| **Loading States** | ✅ Detailed | ⚠️ Basic |
| **Use Case** | Production apps with detailed UX | Simple chatbots, MVPs |

## Best Practices

### For Both Approaches

1. **Always await completion**:
```typescript
result.completed.catch(error => {
  console.error('Stream completion error:', error);
});
```

2. **Handle errors gracefully**:
```typescript
try {
  // streaming code
} catch (error) {
  yield { type: 'error', content: 'Error message' };
}
```

3. **Use abort controllers** for cancellation:
```typescript
const abortController = new AbortController();
fetch('/api/chat/stream', {
  signal: abortController.signal
});
```

### For Full Event Streaming

1. **Buffer text deltas** for smoother UI updates
2. **Track tool call states** to match starts with ends
3. **Use timestamps** for debugging and analytics

### For Simple Text Streaming

1. **Use `{ stream: true }` in decoder** for proper chunk handling:
```typescript
decoder.decode(value, { stream: true })
```

2. **Mark streaming complete** when done:
```typescript
if (done) {
  setMessages(prev => {
    newMessages[index].isStreaming = false;
    return newMessages;
  });
}
```

## Testing Your Streaming

### Test Full Event Streaming
```bash
curl -N -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about Naruto"}'
```

### Test Simple Text Streaming
```bash
curl -N -X POST http://localhost:3000/api/chat/text-stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about Naruto"}'
```

## Troubleshooting

### Stream Not Working
- Check that `stream: true` is passed to `run()`
- Verify response headers include `Cache-Control: no-cache`
- Ensure you're using `ReadableStream` not buffering the response

### Text Appearing in Chunks
- Use `{ stream: true }` in `TextDecoder.decode()`
- Accumulate text on the client side

### Tool Calls Not Showing
- Make sure you're using full event streaming, not `toTextStream()`
- Check that you're handling `run_item_stream_event` events

### Memory Leaks
- Always clean up abort controllers
- Close streams properly when component unmounts

## Resources

- [OpenAI Agents SDK Docs](https://github.com/openai/openai-agents-sdk)
- [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [Next.js Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
