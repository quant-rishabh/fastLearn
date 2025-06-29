import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // body structure: { subject: { topic: { mastered: count, lastMastered: date } } }
    const updates = [];
    
    for (const [subject, topics] of Object.entries(body)) {
      for (const [topic, data] of Object.entries(topics as any)) {
        const { mastered, lastMastered } = data as any;
        
        // Upsert progress data
        const { error } = await supabase
          .from('user_progress') // or your table name
          .upsert({
            subject,
            topic,
            mastery_count: mastered,
            last_mastered: lastMastered,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'subject,topic' // adjust based on your unique constraint
          });
          
        if (error) {
          console.error('Error updating progress:', error);
          // Continue with other updates even if one fails
        } else {
          updates.push({ subject, topic, mastered });
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updates.length} progress records`,
      updates 
    });
    
  } catch (error) {
    console.error('Error syncing progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync progress' },
      { status: 500 }
    );
  }
}
