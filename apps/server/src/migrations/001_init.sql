-- Grim Chess initial schema.
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE COLLATE NOCASE,
  pass_hash TEXT,
  profile TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  last_seen TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS ratings (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pool TEXT NOT NULL,
  rating REAL NOT NULL, rd REAL NOT NULL, vol REAL NOT NULL, games INTEGER NOT NULL,
  updated_at TEXT,
  PRIMARY KEY (user_id, pool)
);

CREATE TABLE IF NOT EXISTS skills (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  mastery REAL NOT NULL, attempts INTEGER NOT NULL, successes INTEGER NOT NULL,
  last_practiced TEXT, mastered INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS srs_cards (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  due TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX IF NOT EXISTS srs_due ON srs_cards(user_id, kind, due);

CREATE TABLE IF NOT EXISTS puzzles (
  id TEXT PRIMARY KEY,
  fen TEXT NOT NULL, moves TEXT NOT NULL,
  rating INTEGER NOT NULL, rd INTEGER NOT NULL, popularity INTEGER NOT NULL, plays INTEGER NOT NULL,
  themes TEXT NOT NULL, openings TEXT NOT NULL, game_url TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS puzzles_rating ON puzzles(rating);

CREATE TABLE IF NOT EXISTS puzzle_themes (
  theme TEXT NOT NULL,
  puzzle_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  PRIMARY KEY (theme, puzzle_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS puzzle_themes_rating ON puzzle_themes(theme, rating);
CREATE INDEX IF NOT EXISTS puzzle_themes_puzzle ON puzzle_themes(puzzle_id);

CREATE TABLE IF NOT EXISTS puzzle_attempts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id TEXT NOT NULL,
  solved INTEGER NOT NULL, first_try INTEGER NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS puzzle_attempts_user ON puzzle_attempts(user_id, puzzle_id);

CREATE TABLE IF NOT EXISTS woodpecker (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cycle INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS woodpecker_set (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  puzzle_id TEXT NOT NULL,
  done_cycle INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, position)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hash TEXT NOT NULL,
  type TEXT NOT NULL,
  at TEXT NOT NULL,
  data TEXT NOT NULL,
  UNIQUE (user_id, hash)
);
CREATE INDEX IF NOT EXISTS events_user_type ON events(user_id, type, at);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  at TEXT NOT NULL,
  mode TEXT NOT NULL,
  result REAL NOT NULL,
  color TEXT NOT NULL,
  opponent TEXT NOT NULL,
  opponent_rating REAL,
  accuracy REAL, acpl REAL, blunders INTEGER,
  time_control TEXT,
  rated INTEGER NOT NULL,
  pgn TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS games_user ON games(user_id, at);

CREATE TABLE IF NOT EXISTS daily (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  estimate REAL, puzzle REAL, bot REAL,
  minutes REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS plans (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (user_id, date)
);
