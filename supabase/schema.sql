-- Supabase SQL Schema for BTC Price Prediction Game
-- Run this in the Supabase SQL Editor

-- Players table: stores player stats
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT UNIQUE NOT NULL,  -- The UUID from localStorage
  player_name TEXT DEFAULT NULL,   -- Player's display name
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_earnings DECIMAL(20, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bids table: stores bid history
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL REFERENCES players(player_id),
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  bid_price DECIMAL(20, 2) NOT NULL,
  final_price DECIMAL(20, 2) NOT NULL,
  earnings DECIMAL(20, 2) NOT NULL,
  won BOOLEAN NOT NULL,
  timestamp BIGINT NOT NULL,  -- Unix timestamp in milliseconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries by player_id
CREATE INDEX idx_bids_player_id ON bids(player_id);
CREATE INDEX idx_bids_timestamp ON bids(player_id, timestamp DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Enable RLS on tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for this demo (players identified by player_id in localStorage)
-- In production, you'd use Supabase Auth and restrict by auth.uid()

-- Policy: Anyone can read/write their own data (by player_id)
CREATE POLICY "Allow all operations on players"
  ON players FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on bids"
  ON bids FOR ALL
  USING (true)
  WITH CHECK (true);
