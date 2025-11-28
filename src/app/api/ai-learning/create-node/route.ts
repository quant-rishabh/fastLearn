import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const { name, parentPath } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Node name is required' },
        { status: 400 }
      );
    }

    let parent_id = null;

    // If parentPath is provided, find the parent node
    if (parentPath && Array.isArray(parentPath) && parentPath.length > 0) {
      // Convert JavaScript array to PostgreSQL array format
      const pathString = '{' + parentPath.map(p => `"${p}"`).join(',') + '}';
      
      const { data: parentNode, error: parentError } = await supabase
        .from('ai_learning_nodes')
        .select('id')
        .eq('path', pathString)
        .single();

      if (parentError) {
        console.error('Parent not found:', parentError);
        return NextResponse.json(
          { error: 'Parent node not found' },
          { status: 404 }
        );
      }

      parent_id = parentNode.id;
    }

    // Check if node with same name already exists under this parent
    const { data: existingNode } = await supabase
      .from('ai_learning_nodes')
      .select('id')
      .eq('name', name.trim())
      .eq('parent_id', parent_id)
      .single();

    if (existingNode) {
      return NextResponse.json(
        { error: 'A node with this name already exists at this level' },
        { status: 409 }
      );
    }

    // Create new node (path and level will be set by trigger)
    const { data: newNode, error: createError } = await supabase
      .from('ai_learning_nodes')
      .insert({
        name: name.trim(),
        parent_id: parent_id,
        notes: null // Can be added later
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating node:', createError);
      return NextResponse.json(
        { error: 'Failed to create node' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      node: newNode
    });

  } catch (error) {
    console.error('Error in create-node API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}