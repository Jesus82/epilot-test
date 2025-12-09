-- Migration: Add score column to players table
-- Score = total_wins - total_losses (single source of truth)

-- Add score column with default 0
ALTER TABLE players ADD COLUMN score INTEGER DEFAULT 0;

-- Update existing records to calculate score from wins/losses
UPDATE players SET score = total_wins - total_losses;
