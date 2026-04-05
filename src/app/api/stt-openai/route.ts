import { NextRequest, NextResponse } from 'next/server';

// Garbage phrases that indicate hallucination
const GARBAGE_PATTERNS = /thanks for watching|subscribe|like and share|don't forget|comment below|see you next|bye bye|thank you for|please subscribe/i;

// Check if text contains mostly non-English characters
function containsNonEnglish(text: string): boolean {
  // Remove common punctuation and numbers, check remaining
  const cleaned = text.replace(/[0-9.,!?'";\-:\s]/g, '');
  // Count non-ASCII characters
  const nonAscii = cleaned.replace(/[a-zA-Z]/g, '').length;
  return nonAscii > cleaned.length * 0.3; // More than 30% non-English
}

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

    // Reject very small audio files (likely empty/noise)
    if (audioFile.size < 1000) {
      console.log("🎤 Audio too small, likely empty");
      return NextResponse.json({ transcript: '' });
    }

    // Create form data for OpenAI API
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile, 'audio.webm');
    openaiFormData.append('model', 'gpt-4o-mini-transcribe'); // Better model, less hallucination
    openaiFormData.append('language', 'en'); // Force English output only
    openaiFormData.append('prompt', 'The user speaks simple English vocabulary words or short phrases. Transcribe exactly what is said. Ignore background noise.'); // Reduce hallucinations

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
    let transcript = data.text?.trim() || '';
    
    console.log("🎤 STT raw transcript:", transcript);

    // Filter out garbage/hallucinated responses
    if (
      !transcript ||
      transcript.length < 2 ||
      GARBAGE_PATTERNS.test(transcript) ||
      containsNonEnglish(transcript)
    ) {
      console.log("🎤 Filtered garbage transcript:", transcript);
      return NextResponse.json({ transcript: '' });
    }

    console.log("🎤 STT success, transcript:", transcript.substring(0, 50));

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('🎤 OpenAI STT exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
