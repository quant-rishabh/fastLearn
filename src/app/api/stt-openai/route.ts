import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    console.log("🎤 OpenAI STT called");
    console.log("🎤 OPENAI_API_KEY present:", !!apiKey);

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
    }

    // Get the form data with audio file
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log("🎤 Audio file received:", audioFile.name, audioFile.size, "bytes");

    // Create form data for OpenAI API
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile, 'audio.webm');
    openaiFormData.append('model', 'whisper-1');
    // Don't set language - let Whisper auto-detect (supports Hindi, English, Indian English)

    // OpenAI Whisper API call
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: openaiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎤 OpenAI STT error:', errorText);
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log("🎤 STT success, transcript:", data.text?.substring(0, 50));

    return NextResponse.json({ transcript: data.text });
  } catch (error) {
    console.error('🎤 OpenAI STT exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
