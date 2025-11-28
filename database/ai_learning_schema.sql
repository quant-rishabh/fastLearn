-- AI Learning System - Flexible Node Hierarchy
-- This is separate from existing subjects/lessons/topics system

-- Flexible learning nodes that can nest infinitely
CREATE TABLE ai_learning_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  notes TEXT, -- User can add notes at any level
  parent_id UUID REFERENCES ai_learning_nodes(id) ON DELETE CASCADE,
  path TEXT[], -- Array like ['computer-science', 'dsa', 'array'] 
  level INTEGER DEFAULT 0, -- 0=root, 1=child, 2=grandchild, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_ai_nodes_parent ON ai_learning_nodes(parent_id);
CREATE INDEX idx_ai_nodes_path ON ai_learning_nodes USING GIN(path);
CREATE INDEX idx_ai_nodes_level ON ai_learning_nodes(level);

-- RLS Policy (allow all for now)
ALTER TABLE ai_learning_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON ai_learning_nodes FOR ALL USING (true);

-- Function to update path when parent changes
CREATE OR REPLACE FUNCTION update_node_path()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- Root node
    NEW.path := ARRAY[NEW.name];
    NEW.level := 0;
  ELSE
    -- Child node - get parent's path and append this node's name
    SELECT path || NEW.name, level + 1 
    INTO NEW.path, NEW.level
    FROM ai_learning_nodes 
    WHERE id = NEW.parent_id;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update path
CREATE TRIGGER update_ai_node_path_trigger
  BEFORE INSERT OR UPDATE ON ai_learning_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_node_path();