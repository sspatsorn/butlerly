-- Migration: Add registration fields to users table
-- Run this if you already have the base schema deployed

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_registered BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_step TEXT CHECK (registration_step IN ('awaiting_name', 'awaiting_phone'));

CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_registered ON users(is_registered);
