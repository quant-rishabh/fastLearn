'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface AINode {
  id: string;
  name: string;
  notes?: string;
  parent_id?: string;
  path: string[];
  level: number;
}

export default function AILearningPage() {
  const params = useParams();
  const [currentNode, setCurrentNode] = useState<AINode | null>(null);
  const [children, setChildren] = useState<AINode[]>([]);
  const [newNodeName, setNewNodeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');

  // Get current path from URL
  const pathArray = params.path ? (Array.isArray(params.path) ? params.path : [params.path]) : [];
  const currentPath = pathArray.map(segment => decodeURIComponent(segment));

  useEffect(() => {
    loadNodeData();
  }, [pathArray]);

  const loadNodeData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/ai-learning/get-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath })
      });

      if (!response.ok) {
        throw new Error('Failed to load nodes');
      }

      const data = await response.json();
      setCurrentNode(data.currentNode);
      setChildren(data.children || []);
      setNotes(data.currentNode?.notes || '');
    } catch (err) {
      console.error('Error loading nodes:', err);
      setError('Failed to load learning nodes');
    } finally {
      setLoading(false);
    }
  };

  const createChildNode = async () => {
    if (!newNodeName.trim()) return;

    try {
      const response = await fetch('/api/ai-learning/create-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newNodeName.trim(),
          parentPath: currentPath
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create node');
      }

      setNewNodeName('');
      loadNodeData(); // Refresh the data
    } catch (err) {
      console.error('Error creating node:', err);
      setError('Failed to create new node');
    }
  };

  const saveNotes = async () => {
    try {
      const response = await fetch('/api/ai-learning/save-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          notes: notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to save notes');
      }

      // Show success message briefly
      setError('Notes saved successfully!');
      setTimeout(() => setError(''), 2000);
    } catch (err) {
      console.error('Error saving notes:', err);
      setError(`Failed to save notes: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Build navigation path
  const buildPath = (index: number) => {
    return '/learnFromAI/' + currentPath.slice(0, index + 1).map(segment => encodeURIComponent(segment)).join('/');
  };

  if (loading) {
    return <div style={{ backgroundColor: 'black', color: 'white', padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: 'black', color: 'white' }}>
      {/* Back to Home */}
      <Link href="/" style={{ color: '#66ccff', textDecoration: 'none' }}>
        ← Back to Home
      </Link>

      <h1>AI Learning System</h1>

      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '20px', fontSize: '14px' }}>
        <Link href="/learnFromAI" style={{ color: '#66ccff', textDecoration: 'none' }}>
          Root
        </Link>
        {currentPath.map((segment, index) => (
          <span key={index}>
            {' → '}
            <Link 
              href={buildPath(index)}
              style={{ color: '#66ccff', textDecoration: 'none' }}
            >
              {segment}
            </Link>
          </span>
        ))}
      </div>

      {/* Current Location */}
      <h2>
        {currentPath.length === 0 ? 'Root' : currentPath[currentPath.length - 1]}
      </h2>

      {/* Notes Section */}
      <div style={{ 
        backgroundColor: '#222', 
        padding: '15px', 
        marginBottom: '20px',
        border: '1px solid #666'
      }}>
        <h3>Notes:</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your notes here..."
          style={{
            width: '100%',
            minHeight: '100px',
            backgroundColor: '#333',
            color: 'white',
            border: '1px solid #666',
            padding: '10px',
            fontSize: '14px'
          }}
        />
        <button
          onClick={saveNotes}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Save Notes
        </button>
        
        {notes.trim() && (
          <Link 
            href={`/learnFromAI/${currentPath.map(segment => encodeURIComponent(segment)).join('/')}/quiz`}
            style={{
              display: 'inline-block',
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            Start AI Quiz
          </Link>
        )}
      </div>

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

      {/* Children Nodes */}
      <h3>Sub-topics:</h3>
      {children.length === 0 ? (
        <p style={{ fontStyle: 'italic' }}>No sub-topics yet</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {children.map(child => (
            <li key={child.id} style={{ marginBottom: '10px' }}>
              <Link 
                href={`/learnFromAI/${[...currentPath, child.name].map(segment => encodeURIComponent(segment)).join('/')}`}
                style={{ 
                  display: 'block',
                  padding: '10px',
                  backgroundColor: '#333',
                  textDecoration: 'none',
                  color: 'white',
                  border: '1px solid #666'
                }}
              >
                📁 {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Add New Node */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#222', border: '1px solid #666' }}>
        <h3>Add New Sub-topic:</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={newNodeName}
            onChange={(e) => setNewNodeName(e.target.value)}
            placeholder="Enter topic name"
            style={{ 
              padding: '8px', 
              border: '1px solid #666',
              minWidth: '200px',
              backgroundColor: '#333',
              color: 'white'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                createChildNode();
              }
            }}
          />
          <button
            onClick={createChildNode}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div style={{ marginTop: '30px', fontSize: '12px' }}>
        <strong>Debug:</strong> Current path: [{currentPath.join(' → ')}] | Level: {currentNode?.level || 0}
      </div>
    </div>
  );
}