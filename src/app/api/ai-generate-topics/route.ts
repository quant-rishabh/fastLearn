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

    // Optimized prompt for single English speaking practice topic with variety
    const prompt = `Generate 1 unique English speaking practice topic for "${subject}" - "${lesson}".

Focus: Help learners practice speaking fluency and real conversations.
Topics should cover: daily life, storytelling, opinions, descriptions, experiences, talking to someone about their day, personal preferences, future plans, past memories, cultural differences, hobbies, work experiences, family traditions, food habits, travel stories, technology use, health routines, social interactions.

Be creative and vary the topics each time. Avoid repeating common topics like "morning routines" frequently.

Format: topic name, with guiding questions. 3 to 4 questions cover tenses, vocabulary, and ideas.

Topic:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Create diverse and unique English speaking topics for fluency practice. Focus on conversation starters. Be creative and avoid repetitive topics. Each request should generate a different, interesting topic."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 1.0,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    console.log('🤖 AI Raw Response:', aiResponse);
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse the AI response into structured topic with questions
    let cleanedResponse = aiResponse
      .trim()
      .replace(/^\d+\.?\s*/, '') // Remove numbers at start
      .replace(/^Topic:\s*/i, '') // Remove "Topic:" prefix if present
      .trim();

    // Extract topic name and questions
    let topicName = '';
    let questions: string[] = [];

    // Split by "Guiding Questions:" or similar patterns
    const parts = cleanedResponse.split(/\*\*Guiding Questions:\*\*|\*\*Questions:\*\*|Guiding Questions:|Questions:/i);
    
    if (parts.length >= 2) {
      // Extract topic name
      topicName = parts[0]
        .replace(/\*\*Topic:\s*/i, '')
        .replace(/\*\*/g, '')
        .trim();
      
      // Extract and format questions
      const questionText = parts[1].trim();
      questions = questionText
        .split(/\d+\.\s*/)
        .filter(q => q.trim().length > 0)
        .map(q => q.trim())
        .slice(0, 4); // Ensure max 4 questions
    } else {
      // Fallback: use the whole response as topic name
      topicName = cleanedResponse;
    }

    // Format as markdown
    let formattedContent = `# ${topicName}\n\n`;
    
    if (questions.length > 0) {
      formattedContent += `## Guiding Questions:\n\n`;
      questions.forEach((question, index) => {
        formattedContent += `${index + 1}. ${question}\n\n`;
      });
    }

    console.log('📝 Topic Name:', topicName);
    console.log('📝 Questions:', questions);
    console.log('📝 Formatted Content:', formattedContent);

    if (!topicName) {
      throw new Error('Failed to generate a valid topic');
    }

    return NextResponse.json({
      success: true,
      topics: [{
        id: 'ai-1',
        name: topicName,
        content: formattedContent, // Add formatted markdown content
        lesson_id: 'ai-generated',
        isAiGenerated: true
      }],
      debug: {
        rawResponse: aiResponse,
        topicName: topicName,
        questions: questions,
        formattedContent: formattedContent
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