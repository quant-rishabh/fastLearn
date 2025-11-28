import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const { path, previousQuestions = [], wrongAnswers = [], currentPerformance = 0.5 } = await request.json();
    
    if (!path || !Array.isArray(path)) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Get notes content for this path
    const pathString = `{${path.map(p => `"${p}"`).join(',')}}`;
    
    const { data: node, error } = await supabase
      .from('ai_learning_nodes')
      .select('notes')
      .eq('path', pathString)
      .single();

    if (error || !node?.notes) {
      return NextResponse.json({ error: 'No notes found for this topic' }, { status: 404 });
    }

    // Generate question based on notes content and performance
    const question = await generateAdaptiveQuestion(
      node.notes,
      previousQuestions,
      wrongAnswers,
      currentPerformance
    );

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Error generating adaptive question:', error);
    return NextResponse.json({ error: 'Failed to generate question' }, { status: 500 });
  }
}

async function generateAdaptiveQuestion(
  notes: string, 
  previousQuestions: string[], 
  wrongAnswers: any[], 
  performance: number
) {
  // Simple question generation based on notes content
  // Focus on areas where user got wrong answers if performance is low
  
  let focusArea = '';
  if (performance < 0.6 && wrongAnswers.length > 0) {
    // Focus on topics from wrong answers
    focusArea = `Focus on concepts related to: ${wrongAnswers.map(w => w.topic).join(', ')}`;
  }

  const prompt = `
Based on these study notes, generate ONE quiz question:

${notes}

${focusArea}

Previous questions asked: ${previousQuestions.join(', ')}

Generate a clear, focused question that tests understanding of the key concepts.
Return JSON format:
{
  "question": "Your question here",
  "correctAnswer": "Expected answer",
  "topic": "Main concept being tested"
}
  `;

  try {
    // Simple question generation - in real app you'd call OpenAI API
    // For now, extracting key concepts from notes
    const sentences = notes.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length === 0) {
      throw new Error('No content to generate questions from');
    }

    // Pick a random sentence that wasn't used before
    let selectedSentence = '';
    let attempts = 0;
    do {
      selectedSentence = sentences[Math.floor(Math.random() * sentences.length)].trim();
      attempts++;
    } while (previousQuestions.some(q => q.includes(selectedSentence.substring(0, 20))) && attempts < 10);

    // Generate simple question from the sentence
    const question = `What is the main concept related to: "${selectedSentence.substring(0, 100)}..."?`;
    const topic = extractTopic(selectedSentence);
    
    return {
      question,
      correctAnswer: topic,
      topic: topic
    };
  } catch (error) {
    console.error('Error in question generation:', error);
    // Fallback question
    return {
      question: "What is the main concept covered in your notes?",
      correctAnswer: "Key concept from notes",
      topic: "General understanding"
    };
  }
}

function extractTopic(sentence: string): string {
  // Simple topic extraction - look for key nouns/concepts
  const words = sentence.split(' ');
  const meaningfulWords = words.filter(word => 
    word.length > 4 && 
    !['that', 'this', 'with', 'from', 'they', 'have', 'been', 'will', 'would', 'could', 'should'].includes(word.toLowerCase())
  );
  
  return meaningfulWords.slice(0, 3).join(' ') || 'Key concept';
}