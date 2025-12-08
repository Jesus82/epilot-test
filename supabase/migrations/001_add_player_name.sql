-- Migration: Add player_name to players table
-- Run this in the Supabase SQL Editor

ALTER TABLE players
ADD COLUMN player_name TEXT DEFAULT NULL;
