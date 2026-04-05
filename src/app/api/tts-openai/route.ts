import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'alloy' } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    
    console.log("🔊 OpenAI TTS called with text:", text?.substring(0, 50));
    console.log("🔊 OPENAI_API_KEY present:", !!apiKey);

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // OpenAI TTS API call
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice, // alloy, echo, fable, onyx, nova, shimmer
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔊 OpenAI TTS error:', errorText);
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    // Get audio as buffer and convert to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    console.log("🔊 TTS success, audio length:", base64Audio.length);

    return NextResponse.json({ audioContent: base64Audio });
  } catch (error) {
    console.error('🔊 OpenAI TTS exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
