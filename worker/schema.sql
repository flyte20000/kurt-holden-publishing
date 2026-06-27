-- Kurt Holden Publishing Command Center — D1 Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  series TEXT NOT NULL DEFAULT 'Flight Path',
  pillar TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Idea',
  target_date TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'LinkedIn',
  hook TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  image_concept TEXT NOT NULL DEFAULT '',
  cta TEXT NOT NULL DEFAULT '',
  hashtags TEXT NOT NULL DEFAULT '',
  performance_notes TEXT NOT NULL DEFAULT '',
  repurpose_opps TEXT NOT NULL DEFAULT '',
  posted_link TEXT NOT NULL DEFAULT '',
  posted_date TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  series TEXT NOT NULL DEFAULT 'Flight Path',
  main_argument TEXT NOT NULL DEFAULT '',
  supporting_stories TEXT NOT NULL DEFAULT '',
  draft TEXT NOT NULL DEFAULT '',
  final_version TEXT NOT NULL DEFAULT '',
  teaser TEXT NOT NULL DEFAULT '',
  publish_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strategy (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'voice_rule',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_plans (
  id TEXT PRIMARY KEY,
  week_of TEXT NOT NULL UNIQUE,
  tuesday_id TEXT NOT NULL DEFAULT '',
  thursday_id TEXT NOT NULL DEFAULT '',
  sunday_id TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planning',
  created_at TEXT NOT NULL
);

-- Default admin user: kurt / KurtPublishing2026!
INSERT OR IGNORE INTO users (id, username, password_hash, role, created_at)
VALUES (
  'kurt001',
  'kurt',
  '71a37c7938a5ab9cf511ee991aaa7e60b61a1506dbdbb4734c15275278c52485',
  'admin',
  datetime('now')
);

-- Seed strategy library with brand voice rules
INSERT OR IGNORE INTO strategy (id, type, title, body, created_at) VALUES
('s001','voice_rule','Executive Aviation Voice','Write as a senior aviation executive — authoritative, precise, confident. Never casual. Never generic. Speak from operational experience, not theory.',datetime('now')),
('s002','voice_rule','No Filler Phrases','Never start with "In today''s world" or "As a leader." Open with a specific scene, fact, data point, or bold claim.',datetime('now')),
('s003','voice_rule','Specificity Over Generality','Name real aircraft types, real regulatory frameworks, real operational scenarios. Vague posts get ignored. Specific posts build authority.',datetime('now')),
('s004','hook','The Operational Scenario Hook','Start with a real operational moment: altitude, weather, crew, decision point. Pull the reader into the cockpit or the ops center.',datetime('now')),
('s005','hook','The Counterintuitive Claim Hook','Open with a statement that challenges conventional thinking in aviation leadership or operations. Then prove it.',datetime('now')),
('s006','hook','The Data Point Hook','Lead with a specific statistic or outcome that reframes how readers think about safety, performance, or leadership.',datetime('now')),
('s007','cta','Invite the Operator','End with: "If you''re running operations at this level — I''d like to hear how your team handles this."',datetime('now')),
('s008','cta','Challenge the Leader','End with: "What''s the standard your team holds to? Drop it below."',datetime('now')),
('s009','pillar','Aviation Leadership','How aviation leaders think, decide, communicate, and build trust under pressure.',datetime('now')),
('s010','pillar','Championship Operations','Building teams and systems that perform at elite levels consistently — not just on good days.',datetime('now')),
('s011','pillar','Safety Leadership','Creating safety cultures that go beyond compliance — where people surface problems before they become incidents.',datetime('now')),
('s012','pillar','AI in Aviation','How artificial intelligence is changing flight operations, maintenance, dispatch, training, and risk management.',datetime('now'));
