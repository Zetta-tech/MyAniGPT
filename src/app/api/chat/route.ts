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

    const response = await chatbotService.sendMessage(message);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
