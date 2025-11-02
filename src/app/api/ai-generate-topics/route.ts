import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { subject, lesson } = await request.json();

    if (!subject || !lesson) {
      return NextResponse.json(
        { error: 'Subject and lesson are required' },
        { status: 400 }
      );
    }

    // Balanced prompt for English speaking practice
    const prompt = `Generate 5 English speaking practice topics for "${subject}" - "${lesson}".

Focus: Help learners practice speaking fluency and real conversations.
Topics should cover: daily life, storytelling, opinions, descriptions, experiences.
Format: One topic per line, 3-8 words each.

Topics:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Create English speaking topics for fluency practice. Focus on conversation starters."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    console.log('🤖 AI Raw Response:', aiResponse);
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse the AI response into individual topics
    const aiGeneratedTopics = aiResponse
      .split('\n')
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0)
      .map(topic => topic.replace(/^\d+\.?\s*/, '')) // Remove numbers at start
      .filter(topic => topic.length > 0)
      .slice(0, 5); // Ensure max 5 topics

    console.log('📝 Parsed Topics:', aiGeneratedTopics);

    return NextResponse.json({
      success: true,
      topics: aiGeneratedTopics.map((topic, index) => ({
        id: `ai-${index + 1}`,
        name: topic,
        lesson_id: 'ai-generated',
        isAiGenerated: true
      })),
      debug: {
        rawResponse: aiResponse,
        parsedTopics: aiGeneratedTopics
      }
    });

  } catch (error) {
    console.error('Error generating AI topics:', error);
    return NextResponse.json(
      { error: 'Failed to generate topics. Please try again.' },
      { status: 500 }
    );
  }
}