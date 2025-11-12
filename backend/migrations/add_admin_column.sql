-- Add admin column to users table
-- Migration: add_admin_column
-- Date: 2025-11-12

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Make first user admin (change email to your admin email)
-- UPDATE users SET is_admin = TRUE WHERE email = 'admin@caloria.com';

-- Or make user with ID 1 admin
UPDATE users SET is_admin = TRUE WHERE id = 1;

-- Verify
SELECT id, email, username, is_admin FROM users WHERE is_admin = TRUE;
