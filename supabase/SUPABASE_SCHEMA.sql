-- ============================================================
-- SUPABASE_SCHEMA.sql
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- 1. SCHOOLS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('رسمي','رسمي لغات','خاص','خاص لغات','دولي','ثقافي')),
  stage       TEXT NOT NULL DEFAULT 'الابتدائية',
  district    TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 2. SCHOOL AUTH (password per school)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_auth (
  school_id     UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,   -- bcrypt hash
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 3. ADMIN SETTINGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL DEFAULT 'admin',
  password_hash TEXT NOT NULL,   -- bcrypt hash
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Insert default admin (password: admin123)
-- Hash generated with bcrypt rounds=10
INSERT INTO public.admin_settings (username, password_hash)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 4. UPLOADS (each Excel upload session)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.uploads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  district              TEXT,
  school_name_snapshot  TEXT,
  address_snapshot      TEXT,
  file_name             TEXT,
  storage_path          TEXT,          -- Supabase Storage path for original file
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 5. STUDENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id   UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  row_num     INT,
  name        TEXT NOT NULL,
  grade       TEXT,
  class_room  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_upload_id ON public.students(upload_id);
CREATE INDEX IF NOT EXISTS idx_students_name      ON public.students USING gin(to_tsvector('arabic', name));

-- ─────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- Note: We handle auth via custom JWT/session in API routes.
-- RLS is set to service_role bypass; enforce auth in Next.js API.
-- ─────────────────────────────────────────
ALTER TABLE public.schools        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_auth    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students       ENABLE ROW LEVEL SECURITY;

-- Service role bypasses all RLS (used in API routes with service key)
-- Anon role has no access (all requests go through authenticated API)
CREATE POLICY "no_anon" ON public.schools        FOR ALL TO anon USING (false);
CREATE POLICY "no_anon" ON public.school_auth    FOR ALL TO anon USING (false);
CREATE POLICY "no_anon" ON public.admin_settings FOR ALL TO anon USING (false);
CREATE POLICY "no_anon" ON public.uploads        FOR ALL TO anon USING (false);
CREATE POLICY "no_anon" ON public.students       FOR ALL TO anon USING (false);

-- ─────────────────────────────────────────
-- 7. SUPABASE STORAGE BUCKET (run separately in Dashboard or via CLI)
-- ─────────────────────────────────────────
-- In Supabase Dashboard → Storage → New Bucket: "excel-uploads"
-- Set it as PRIVATE (not public).
-- INSERT INTO storage.buckets (id, name, public) VALUES ('excel-uploads', 'excel-uploads', false);

-- ─────────────────────────────────────────
-- DONE. Default admin: username=admin, password=admin123
-- ─────────────────────────────────────────
