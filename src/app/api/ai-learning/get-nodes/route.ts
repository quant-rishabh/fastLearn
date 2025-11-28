import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();

    let currentNode = null;
    let children = [];

    if (!path || !Array.isArray(path) || path.length === 0) {
      // Root level - get all nodes without parent
      const { data: rootChildren, error: childrenError } = await supabase
        .from('ai_learning_nodes')
        .select('*')
        .is('parent_id', null)
        .order('name');

      if (childrenError) {
        console.error('Error fetching root children:', childrenError);
        return NextResponse.json(
          { error: 'Failed to fetch root nodes' },
          { status: 500 }
        );
      }

      children = rootChildren || [];
    } else {
      // Find current node by path
      // Convert JavaScript array to PostgreSQL array format
      const pathString = '{' + path.map(p => `"${p}"`).join(',') + '}';
      
      const { data: nodeData, error: nodeError } = await supabase
        .from('ai_learning_nodes')
        .select('*')
        .eq('path', pathString)
        .single();

      if (nodeError) {
        console.error('Node not found for path:', path, nodeError);
        // If node doesn't exist, return empty data (not an error)
        return NextResponse.json({
          currentNode: null,
          children: []
        });
      }

      currentNode = nodeData;

      // Get children of current node
      const { data: childrenData, error: childrenError } = await supabase
        .from('ai_learning_nodes')
        .select('*')
        .eq('parent_id', currentNode.id)
        .order('name');

      if (childrenError) {
        console.error('Error fetching children:', childrenError);
        return NextResponse.json(
          { error: 'Failed to fetch child nodes' },
          { status: 500 }
        );
      }

      children = childrenData || [];
    }

    return NextResponse.json({
      currentNode,
      children,
      path: path || []
    });

  } catch (error) {
    console.error('Error in get-nodes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}