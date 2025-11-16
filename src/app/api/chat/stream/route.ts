import { NextRequest } from 'next/server';
import { chatbotService } from '@/app/services/chatbotService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of chatbotService.streamMessage(message)) {
            const data = JSON.stringify(event) + '\n';
            controller.enqueue(encoder.encode(data));
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorEvent = JSON.stringify({
            type: 'error',
            content: 'An error occurred while processing your request',
            timestamp: Date.now()
          }) + '\n';
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
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
