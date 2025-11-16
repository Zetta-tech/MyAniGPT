import { NextRequest, NextResponse } from 'next/server';
import { chatbotService } from '@/app/services/chatbotService';

export async function POST(request: NextRequest) {
  try {
    const { message, action } = await request.json();

    // Handle reset action
    if (action === 'reset') {
      await chatbotService.resetChat();
      return NextResponse.json({ success: true, message: 'Chat reset successfully' });
    }

    // Handle regular message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const streamGenerator = chatbotService.streamMessage(message);
          
          for await (const event of streamGenerator) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorEvent = {
            type: 'error',
            error: 'Failed to process message'
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
