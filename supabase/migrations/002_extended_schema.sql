-- =============================================================================
-- Migration: 002_extended_schema.sql
-- النسخة 2.0 — الجداول الموسَّعة
-- تشغيل في Supabase SQL Editor
-- =============================================================================

-- ─── 1. جدول الأعوام الدراسية ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_years (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_label  VARCHAR(20) NOT NULL UNIQUE, -- مثال: '2025-2026'
  start_date  DATE,
  end_date    DATE,
  is_current  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- إدخال السنة الحالية (آمن للتشغيل المتكرر)
INSERT INTO academic_years (year_label, start_date, end_date, is_current)
VALUES ('2025-2026', '2025-09-01', '2026-06-30', true)
ON CONFLICT (year_label) DO NOTHING;
-- تحديث منفصل لضمان أنها الحالية
UPDATE academic_years SET is_current = true WHERE year_label = '2025-2026';

-- ضمان وجود سنة واحدة فعّالة فقط
CREATE OR REPLACE FUNCTION ensure_single_current_year()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current THEN
    UPDATE academic_years SET is_current = false WHERE id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_current_year ON academic_years;
CREATE TRIGGER trg_single_current_year
  BEFORE INSERT OR UPDATE ON academic_years
  FOR EACH ROW EXECUTE FUNCTION ensure_single_current_year();

-- ─── 2. جدول الأهداف والمستهدفات ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_targets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year         VARCHAR(20) NOT NULL DEFAULT '2025-2026',
  target_density        NUMERIC(5,1) DEFAULT 40,        -- الكثافة المستهدفة
  target_low_performers NUMERIC(5,2),                   -- نسبة الضعاف المستهدفة %
  target_dropout_rate   NUMERIC(5,2),                   -- نسبة التسرب المستهدفة %
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, academic_year)
);

-- ─── 3. جدول الإشعارات ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
  type       VARCHAR(50) CHECK (type IN (
               'density_alert', 'missing_data', 'visit_reminder', 'deadline', 'upload_success'
             )) DEFAULT 'density_alert',
  title      VARCHAR(200) NOT NULL,
  message    TEXT,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_school ON system_notifications(school_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON system_notifications(is_read, created_at DESC);

-- RLS للإشعارات
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_all_notifications" ON system_notifications
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_school_permissions
        WHERE user_id = auth.uid() AND school_id IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "school_own_notifications" ON system_notifications
    FOR SELECT USING (
      school_id IN (
        SELECT school_id FROM user_school_permissions
        WHERE user_id = auth.uid() AND school_id IS NOT NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. Trigger تلقائي لإشعارات الكثافة المرتفعة ─────────────────────────────
CREATE OR REPLACE FUNCTION notify_high_density()
RETURNS TRIGGER AS $$
DECLARE
  density NUMERIC;
BEGIN
  -- حساب الكثافة (total_students / number_of_classes)
  IF NEW.number_of_classes > 0 THEN
    density := (NEW.boys_count + NEW.girls_count)::NUMERIC / NEW.number_of_classes;
  ELSE
    RETURN NEW;
  END IF;

  IF density > 50 THEN
    INSERT INTO system_notifications (school_id, type, title, message)
    VALUES (
      NEW.school_id,
      'density_alert',
      'تنبيه: كثافة مرتفعة في ' || NEW.grade_level,
      'وصلت كثافة ' || NEW.grade_level || ' إلى ' || ROUND(density, 1)::TEXT || ' طالب/فصل — المعدل المقبول أقل من 50'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_density_alert ON class_statistics;
CREATE TRIGGER trg_density_alert
  AFTER INSERT OR UPDATE ON class_statistics
  FOR EACH ROW EXECUTE FUNCTION notify_high_density();

-- ─── 5. جدول سجل عمليات الرفع ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upload_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID REFERENCES schools(id) ON DELETE CASCADE,
  uploaded_by      UUID REFERENCES auth.users(id),
  file_name        VARCHAR(300),
  file_size_bytes  INTEGER,
  sheets_requested TEXT[],
  sheets_success   TEXT[],
  sheets_failed    TEXT[],
  total_rows_saved INTEGER DEFAULT 0,
  status           VARCHAR(20) CHECK (status IN ('success','partial','failed')) DEFAULT 'success',
  details          JSONB,      -- JSON تفاصيل كل ورقة
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_school ON upload_sessions(school_id, created_at DESC);

-- RLS
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_all_uploads" ON upload_sessions
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_school_permissions
        WHERE user_id = auth.uid() AND school_id IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "school_own_uploads" ON upload_sessions
    FOR SELECT USING (
      school_id IN (
        SELECT school_id FROM user_school_permissions
        WHERE user_id = auth.uid() AND school_id IS NOT NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 6. جدول زيارات الإشراف ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supervision_visits (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            UUID REFERENCES schools(id) ON DELETE CASCADE,
  visit_date           DATE NOT NULL,
  inspector_name       VARCHAR(200),
  density_observation  TEXT,      -- ملاحظات الكثافة
  building_notes       TEXT,      -- ملاحظات المبنى
  leaders_notes        TEXT,      -- ملاحظات القيادات
  overall_rating       VARCHAR(20) CHECK (overall_rating IN ('ممتاز','جيد جداً','جيد','مقبول','ضعيف')),
  recommendations      TEXT,
  follow_up_date       DATE,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_school ON supervision_visits(school_id, visit_date DESC);

-- RLS
ALTER TABLE supervision_visits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_all_visits" ON supervision_visits
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_school_permissions
        WHERE user_id = auth.uid() AND school_id IS NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 7. Trigger لتحديث updated_at ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_school_targets_updated ON school_targets;
CREATE TRIGGER trg_school_targets_updated
  BEFORE UPDATE ON school_targets
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ─── 8. View: ملخص الإشعارات غير المقروءة لكل مدرسة ───────────────────────────
CREATE OR REPLACE VIEW unread_notifications_summary AS
SELECT
  school_id,
  COUNT(*) AS unread_count,
  MAX(created_at) AS latest_at,
  ARRAY_AGG(title ORDER BY created_at DESC) AS recent_titles
FROM system_notifications
WHERE is_read = false
GROUP BY school_id;

-- =============================================================================
-- تعليمات التشغيل:
-- 1. افتح Supabase Dashboard → SQL Editor
-- 2. الصق محتوى هذا الملف كاملاً
-- 3. اضغط Run
-- 4. تحقق من ظهور الجداول في Table Editor
-- =============================================================================
