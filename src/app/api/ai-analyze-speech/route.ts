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
    const prompt = `Analyze this English speech about "${topic}": "${speechText}"

Please provide feedback in the following order:
1. Grammar and Tenses: be very specific to focus on for eg. need practice on simple past tense, or third form verbs.
2. Vocabulary Enhancement: Suggest topic-relevant vocab alternative what i have used or what we can use more atlest 5 to 10 according to requriement..( more m oney -> expensive)
3. Flow and Coherence: Recommend how to better connect ideas and organize thoughts for logical progression how to think connect dots
4. then you come up with your answer`;

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
      max_tokens: 800,
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