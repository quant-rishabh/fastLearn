import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const MAX_TEXT_LENGTH = 500;
const TIMEOUT_MS = 15000;

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'alloy' } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    
    console.log("🔊 OpenAI TTS called with text:", text?.substring(0, 50));

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Text length validation (cost + UX control)
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` }, { status: 400 });
    }

    // Voice validation
    if (!ALLOWED_VOICES.includes(voice)) {
      return NextResponse.json({ error: `Invalid voice. Allowed: ${ALLOWED_VOICES.join(', ')}` }, { status: 400 });
    }

    // Timeout handling to prevent UI freeze
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // OpenAI TTS API call
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts', // newer, more natural, better accent handling
        input: text,
        voice: voice,
        response_format: 'mp3',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔊 OpenAI TTS error:', errorText);
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    // Stream audio directly (30-40% smaller than base64, faster playback)
    const audioBuffer = await response.arrayBuffer();
    console.log("🔊 TTS success, audio size:", audioBuffer.byteLength, "bytes");

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('🔊 OpenAI TTS timeout');
      return NextResponse.json({ error: 'TTS request timed out' }, { status: 504 });
    }
    console.error('🔊 OpenAI TTS exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
