import { NextRequest, NextResponse } from 'next/server';

// Garbage phrases that indicate hallucination
const GARBAGE_PATTERNS = /thanks for watching|subscribe|like and share|don't forget|comment below|see you next|bye bye|thank you for|please subscribe/i;

// Repeated character pattern (e.g., "aaaaaa", "hhhhh")
const REPEATED_PATTERN = /(.)\1{4,}/;

const TIMEOUT_MS = 15000;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    console.log("🎤 OpenAI STT called");

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
      return NextResponse.json({ transcript: '', reason: 'audio_too_small' });
    }

    // Create form data for OpenAI API
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile, 'audio.webm');
    openaiFormData.append('model', 'gpt-4o-mini-transcribe'); // Better model, less hallucination
    openaiFormData.append('language', 'en'); // Force English output only
    openaiFormData.append('prompt', 'The user speaks simple English vocabulary words or short phrases. Transcribe exactly what is said. Ignore background noise.'); // Reduce hallucinations

    // Timeout handling to prevent UI freeze
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // OpenAI Whisper API call
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: openaiFormData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎤 OpenAI STT error:', errorText);
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    let transcript = data.text?.trim() || '';
    
    console.log("🎤 STT raw transcript:", transcript);

    // Filter out garbage/hallucinated responses
    if (!transcript || transcript.length < 2) {
      console.log("🎤 Transcript too short or empty");
      return NextResponse.json({ transcript: '', reason: 'unclear_speech' });
    }

    if (GARBAGE_PATTERNS.test(transcript)) {
      console.log("🎤 Garbage pattern detected:", transcript);
      return NextResponse.json({ transcript: '', reason: 'garbage_detected' });
    }

    if (REPEATED_PATTERN.test(transcript)) {
      console.log("🎤 Repeated characters detected:", transcript);
      return NextResponse.json({ transcript: '', reason: 'repeated_chars' });
    }

    console.log("🎤 STT success, transcript:", transcript);

    return NextResponse.json({ transcript });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('🎤 OpenAI STT timeout');
      return NextResponse.json({ error: 'STT request timed out', reason: 'timeout' }, { status: 504 });
    }
    console.error('🎤 OpenAI STT exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
