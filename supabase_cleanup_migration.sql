-- Al-Dustour Educational Platform Cleanup & Schema Migration
-- Run this in Supabase SQL Editor to clean legacy student emails and add admin-visible password & granular permission columns.

-- 1. Remove all stored email addresses from public.students (phone-only system)
ALTER TABLE public.students ALTER COLUMN email DROP NOT NULL;
UPDATE public.students SET email = NULL WHERE email IS NOT NULL;

-- 2. Add admin-visible plain_password column for student password management
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS plain_password TEXT DEFAULT '';

-- 3. Ensure verification_status, welcome_shown, and active_session_token exist
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS welcome_shown BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS active_session_token TEXT;

-- 4. Add granular_permissions JSONB column to admin_users for sub-tab & feature checkboxes
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS granular_permissions JSONB DEFAULT '{}'::jsonb;
