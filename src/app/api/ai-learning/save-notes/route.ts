import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const { path, notes } = await request.json();

    if (!path || !Array.isArray(path)) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    // Handle root level (empty path)
    if (path.length === 0) {
      return NextResponse.json(
        { error: 'Cannot save notes at root level. Create a subject first.' },
        { status: 400 }
      );
    }

    // Find the node by path
    // Convert JavaScript array to PostgreSQL array format
    const pathString = '{' + path.map(p => `"${p}"`).join(',') + '}';
    
    let { data: nodeData, error: nodeError } = await supabase
      .from('ai_learning_nodes')
      .select('id, path')
      .eq('path', pathString)
      .single();

    if (nodeError || !nodeData) {
      console.error('Node not found for path:', path, nodeError);
      return NextResponse.json(
        { error: `Node not found for path: ${path.join(' → ')}. Please navigate to this level through the UI first.` },
        { status: 404 }
      );
    }

    // Update the notes for this node
    const { error: updateError } = await supabase
      .from('ai_learning_nodes')
      .update({
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', nodeData.id);

    if (updateError) {
      console.error('Error updating notes:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notes saved successfully'
    });

  } catch (error) {
    console.error('Error in save-notes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}