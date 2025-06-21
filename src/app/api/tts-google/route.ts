import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { text, lang = 'en-GB' } = await req.json();
  const apiKey = process.env.GOOGLE_SPEECH_API_KEY;
  console.log("GOOGLE_SPEECH_API_KEY present:", !!apiKey);

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not set' }, { status: 500 });
  }

  // Detect Hindi (Devanagari) characters
  const isHindi = /[\u0900-\u097F]/.test(text);
  let languageCode, voiceName;
  if (isHindi) {
    languageCode = 'hi-IN';
    voiceName = 'hi-IN-Standard-E'; // FEMALE
  } else {
    languageCode = 'en-IN';
    voiceName = 'en-IN-Standard-E'; // FEMALE
  }

  const body = {
    input: { text },
    voice: { languageCode, name: voiceName },
    audioConfig: { audioEncoding: 'MP3' },
  };

  // Use API key as query param, not Authorization header
  const googleRes = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!googleRes.ok) {
    const error = await googleRes.text();
    console.error('Google TTS error:', error);
    return NextResponse.json({ error }, { status: 500 });
  }

  const data = await googleRes.json();
  return NextResponse.json({ audioContent: data.audioContent });
}