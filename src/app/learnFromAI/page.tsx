'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AINode {
  id: string;
  name: string;
  notes?: string;
  parent_id?: string;
  path: string[];
  level: number;
}

export default function AILearningRootPage() {
  const [children, setChildren] = useState<AINode[]>([]);
  const [newNodeName, setNewNodeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRootNodes();
  }, []);

  const loadRootNodes = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/ai-learning/get-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: [] })
      });

      if (!response.ok) {
        throw new Error('Failed to load nodes');
      }

      const data = await response.json();
      setChildren(data.children || []);
    } catch (err) {
      console.error('Error loading nodes:', err);
      setError('Failed to load learning nodes');
    } finally {
      setLoading(false);
    }
  };

  const createRootNode = async () => {
    if (!newNodeName.trim()) return;

    try {
      const response = await fetch('/api/ai-learning/create-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newNodeName.trim(),
          parentPath: [] // Root level
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create node');
      }

      setNewNodeName('');
      loadRootNodes(); // Refresh the data
    } catch (err) {
      console.error('Error creating node:', err);
      setError(err instanceof Error ? err.message : 'Failed to create new node');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: 'black', color: 'white' }}>
      {/* Back to Home */}
      <Link href="/" style={{ color: '#66ccff', textDecoration: 'none' }}>
        ← Back to Home
      </Link>

      <h1>🤖 AI Learning System</h1>
      <p>Create your own flexible learning hierarchy - unlimited nesting!</p>

      {/* Error Display */}
      {error && (
        <div style={{ 
          color: '#ff6666', 
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#331111',
          border: '1px solid #ff6666'
        }}>
          {error}
        </div>
      )}

      {/* Root Level Subjects */}
      <h2>Subjects:</h2>
      {children.length === 0 ? (
        <p style={{ fontStyle: 'italic' }}>No subjects created yet. Add your first subject below!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {children.map(child => (
            <li key={child.id} style={{ marginBottom: '10px' }}>
              <Link 
                href={`/learnFromAI/${encodeURIComponent(child.name)}`}
                style={{ 
                  display: 'block',
                  padding: '15px',
                  backgroundColor: '#333',
                  textDecoration: 'none',
                  color: 'white',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                📚 {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Add New Subject */}
      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        backgroundColor: '#222', 
        border: '1px solid #666',
        borderRadius: '4px'
      }}>
        <h3>Add New Subject:</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={newNodeName}
            onChange={(e) => setNewNodeName(e.target.value)}
            placeholder="e.g., Computer Science, Mathematics, English..."
            style={{ 
              padding: '10px', 
              border: '1px solid #666',
              borderRadius: '4px',
              minWidth: '300px',
              fontSize: '14px',
              backgroundColor: '#333',
              color: 'white'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                createRootNode();
              }
            }}
          />
          <button
            onClick={createRootNode}
            disabled={!newNodeName.trim()}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: newNodeName.trim() ? '#007bff' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: newNodeName.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Add Subject
          </button>
        </div>
        <p style={{ fontSize: '12px', marginTop: '5px' }}>
          You can create unlimited nesting: Subject → Topic → Subtopic → etc.
        </p>
      </div>

      {/* Examples */}
      <div style={{ marginTop: '30px', fontSize: '14px' }}>
        <h4>Example Structure:</h4>
        <ul style={{ marginLeft: '20px' }}>
          <li>Computer Science → DSA → Array → Two Pointer</li>
          <li>Mathematics → Calculus → Integration → By Parts</li>
          <li>English → Grammar → Tenses → Past Perfect</li>
        </ul>
      </div>
    </div>
  );
}