-- Migration: 003_staff_restructuring
-- Description: Adds new complex categorization columns to school_staff and school_leaders based on Egyptian educational hierarchical rules.

-- 1. Add columns to school_staff
ALTER TABLE public.school_staff 
  ADD COLUMN IF NOT EXISTS qualification_date DATE,
  ADD COLUMN IF NOT EXISTS subject_taught VARCHAR(255),
  ADD COLUMN IF NOT EXISTS school_role VARCHAR(255),
  ADD COLUMN IF NOT EXISTS worker_type VARCHAR(255);

-- 2. Add columns to school_leaders
ALTER TABLE public.school_leaders
  ADD COLUMN IF NOT EXISTS qualification VARCHAR(255),
  ADD COLUMN IF NOT EXISTS qualification_date DATE,
  ADD COLUMN IF NOT EXISTS subject_taught VARCHAR(255),
  ADD COLUMN IF NOT EXISTS school_role VARCHAR(255);

-- (Enum extensions are usually handled at the application level in Supabase unless strict DB Enums were created, 
-- in this schema, standard text/varchar fields are used for job_title and appointment_type, so we don't need to ALTER TYPE).
