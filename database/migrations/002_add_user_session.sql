-- Migration: Add session fields for multi-step flows (e.g. cancel task)
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_step TEXT CHECK (session_step IN ('awaiting_cancel_selection'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_data JSONB;
