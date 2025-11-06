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

    // Detailed AI prompt for structured speech analysis
    const prompt = `Analyze this English speech about "${topic}": "${speechText}"

Provide detailed feedback in this EXACT format:

## Feedback on Speech: "${topic}"

### 1. Grammar and Tenses:
• [Specific grammar issue with example from the speech]
- [Correction with proper grammar rule explanation]
• [Practice recommendation for specific tense usage, e.g., "Practice conditional tense: 'If I had..., I would...'"]
- [Example of how to use it in this context]

### 2. Vocabulary Enhancement:
• [Identify basic words used and suggest better alternatives]
- Instead of "[basic word]," use more specific terms like "[advanced word 1]," "[advanced word 2]," or "[advanced word 3]"
• [Topic-specific vocabulary suggestions]
- Use descriptive adjectives like "[adjective 1]," "[adjective 2]," or "[adjective 3]"

### 3. Flow and Coherence:
• [Specific recommendation for better organization]
- [Example of how to structure the opening: "Start with..."]
• [Transitional phrase suggestions]
- Use connecting words like "First," "Next," "Furthermore," and "Finally" to guide your audience
• [Logical progression advice with specific examples]

### 4. My Response:
• [Overall assessment of the speech]
- [Specific improvements needed with examples]
• [Complete rewrite example showing better structure]
- "For example, you could start with: '[Improved opening sentence]' This approach would help..."

Be very specific with examples from the actual speech and provide concrete suggestions for improvement.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert English speech coach. Provide detailed, structured feedback using markdown formatting with specific examples and concrete suggestions. Always follow the exact format requested with proper headers, bullet points, and detailed explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1200,
      temperature: 0.5,
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