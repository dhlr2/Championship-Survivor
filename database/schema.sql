-- ============================================================
-- LAST MAN STANDING - PostgreSQL Schema
-- Recommended Free Host: Supabase (https://supabase.com)
-- Free tier: 500MB storage, unlimited API calls
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_color  VARCHAR(7) DEFAULT '#00FF87',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ROOMS
-- ============================================================
CREATE TABLE rooms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  code          VARCHAR(8) UNIQUE NOT NULL,  -- invite code
  creator_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  current_gameweek INTEGER DEFAULT NULL,
  winner_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ROOM MEMBERS
-- ============================================================
CREATE TABLE room_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'yellow_card', 'eliminated')),
  cards       INTEGER DEFAULT 0 CHECK (cards >= 0 AND cards <= 2),
  joined_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- ============================================================
-- GAMEWEEKS (Championship rounds we track)
-- ============================================================
CREATE TABLE gameweeks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  week_number   INTEGER NOT NULL,
  deadline      TIMESTAMP WITH TIME ZONE,
  status        VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'locked', 'completed')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, week_number)
);

-- ============================================================
-- PICKS — one pick per user per gameweek per room
-- ============================================================
CREATE TABLE picks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gameweek_id   UUID NOT NULL REFERENCES gameweeks(id) ON DELETE CASCADE,
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id       INTEGER NOT NULL,       -- football-data.org team ID
  team_name     VARCHAR(100) NOT NULL,
  team_short    VARCHAR(10),
  team_crest    VARCHAR(500),
  result        VARCHAR(10) DEFAULT NULL CHECK (result IN ('win', 'draw', 'loss', NULL)),
  picked_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gameweek_id, user_id)   -- one pick per gameweek
);

-- ============================================================
-- FIXTURE CACHE — minimise API calls
-- ============================================================
CREATE TABLE fixture_cache (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id   INTEGER UNIQUE NOT NULL,  -- football-data.org match ID
  home_team_id  INTEGER NOT NULL,
  home_team     VARCHAR(100) NOT NULL,
  away_team_id  INTEGER NOT NULL,
  away_team     VARCHAR(100) NOT NULL,
  matchday      INTEGER,
  match_date    TIMESTAMP WITH TIME ZONE,
  status        VARCHAR(30),             -- SCHEDULED, FINISHED, etc.
  home_score    INTEGER,
  away_score    INTEGER,
  cached_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TEAM CACHE — Championship teams
-- ============================================================
CREATE TABLE team_cache (
  id            INTEGER PRIMARY KEY,  -- football-data.org team ID
  name          VARCHAR(100) NOT NULL,
  short_name    VARCHAR(50),
  tla           VARCHAR(10),
  crest_url     VARCHAR(500),
  cached_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_room_members_room ON room_members(room_id);
CREATE INDEX idx_room_members_user ON room_members(user_id);
CREATE INDEX idx_picks_gameweek ON picks(gameweek_id);
CREATE INDEX idx_picks_user_room ON picks(user_id, room_id);
CREATE INDEX idx_fixtures_matchday ON fixture_cache(matchday);
CREATE INDEX idx_fixtures_date ON fixture_cache(match_date);
CREATE INDEX idx_rooms_code ON rooms(code);

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
