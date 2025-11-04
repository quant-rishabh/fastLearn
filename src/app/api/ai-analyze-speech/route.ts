import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { subject, lesson, topic, speechText } = await request.json();

    if (!speechText || !subject || !lesson || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Short, efficient AI prompt for speech analysis
    const prompt = `Analyze this English speech in detail: "${speechText}"
Topic: ${topic}

Give me:
1. GRAMMAR MISTAKES - list them where and how to fix 
2. give better vocabulary suggestions 
3. how to connect ideas better and thoughts flow`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Analyze English speech. Give concise feedback on grammar, vocabulary, flow, and confidence."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // No need to parse JSON anymore - direct text response
    const analysis = {
      formatted_feedback: aiResponse,
      metadata: {
        subject,
        lesson,
        topic,
        speechLength: speechText.length,
        wordCount: speechText.split(' ').length
      }
    };

    return NextResponse.json({
      success: true,
      analysis: analysis,
      metadata: {
        subject,
        lesson,
        topic,
        speechLength: speechText.length,
        wordCount: speechText.split(' ').length
      }
    });

  } catch (error) {
    console.error('Error analyzing speech:', error);
    return NextResponse.json(
      { error: 'Failed to analyze speech. Please try again.' },
      { status: 500 }
    );
  }
}