import { NextRequest } from 'next/server';
import { chatbotService } from '@/app/services/chatbotService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Simple text-only streaming endpoint using toTextStream() helper
 * This is a cleaner approach when you only need the text output
 */
export async function POST(request: NextRequest) {
  try {
    const { message, action } = await request.json();

    if (action === 'reset') {
      await chatbotService.resetChat();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the text stream using toTextStream() helper
    const textStream = await chatbotService.streamTextOnly(message);

    // Convert string stream to Uint8Array stream for Response body
    const encoder = new TextEncoder();
    const reader = (textStream as any).getReader() as ReadableStreamDefaultReader<string>;
    
    const byteStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(encoder.encode(value));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Return the stream directly
    return new Response(byteStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
