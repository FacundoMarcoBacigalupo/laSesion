CREATE TABLE IF NOT EXISTS admin_conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT,
  fallback INTEGER,
  latency_ms INTEGER,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_at ON admin_conversations(at, id);
INSERT INTO admin_conversations (id, session_id, user_name, question_text, at)
SELECT q.id, q.session_id, COALESCE(u.name, 'Participante'), q.text, q.at
FROM questions q
LEFT JOIN users u ON u.id = q.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM admin_conversations c WHERE c.id = q.id
);
