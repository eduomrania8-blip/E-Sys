-- =============================================================================
-- منظومة E-Sys — قاعدة البيانات الكاملة v2.0
-- شغّله كاملاً في Supabase SQL Editor مرة واحدة
-- =============================================================================

-- امتدادات مطلوبة
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================================
-- 0. تنظيف القاعدة (البدء من صفر)
-- =============================================================================
DROP VIEW IF EXISTS administration_summary CASCADE;
DROP VIEW IF EXISTS high_density_schools CASCADE;
DROP VIEW IF EXISTS school_summary CASCADE;
DROP FUNCTION IF EXISTS find_alternative_schools CASCADE;
DROP FUNCTION IF EXISTS can_access_school(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS touch_updated_at() CASCADE;
DROP TABLE IF EXISTS staging_school_data CASCADE;
DROP TABLE IF EXISTS user_school_permissions CASCADE;
DROP TABLE IF EXISTS refugee_students_list CASCADE;
DROP TABLE IF EXISTS expatriate_students_list CASCADE;
DROP TABLE IF EXISTS inclusion_students_list CASCADE;
DROP TABLE IF EXISTS low_performer_students CASCADE;
DROP TABLE IF EXISTS class_statistics CASCADE;
DROP TABLE IF EXISTS school_staff CASCADE;
DROP TABLE IF EXISTS school_leaders CASCADE;
DROP TABLE IF EXISTS school_buildings CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS educational_administrations CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;

-- =============================================================================
-- 1. الإدارات التعليمية
-- =============================================================================
CREATE TABLE educational_administrations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(10) UNIQUE NOT NULL,
    name_ar     VARCHAR(100) NOT NULL,
    governorate VARCHAR(50) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. المدارس
-- =============================================================================
CREATE TABLE schools (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_code       VARCHAR(20) UNIQUE NOT NULL,
    school_name_ar    VARCHAR(150) NOT NULL,
    school_type       VARCHAR(30) CHECK (school_type IN (
                          'رسمية','رسمية لغات','خاصة','خاصة لغات','دولية','فنية'
                      )),
    educational_stage VARCHAR(30) CHECK (educational_stage IN (
                          'ابتدائي','اعدادي','ثانوي','تعليم اساسي','تعليم مجتمعي'
                      )) DEFAULT 'ابتدائي',
    administration_id UUID REFERENCES educational_administrations(id) ON DELETE SET NULL,
    address           TEXT,
    phone             VARCHAR(20),
    email             VARCHAR(100),
    established_year  INT,
    is_active         BOOLEAN DEFAULT true,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. المبنى المدرسي
-- =============================================================================
CREATE TABLE school_buildings (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id            UUID REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
    building_status      VARCHAR(30) CHECK (building_status IN ('مستقل','يعمل مع مدارس أخرى')),
    shared_schools       TEXT,
    actual_classrooms    INT NOT NULL DEFAULT 0 CHECK (actual_classrooms >= 0),
    admin_rooms          INT DEFAULT 0,
    total_labs           INT DEFAULT 0,
    lab_types            TEXT[],
    activity_rooms       INT DEFAULT 0,
    playgrounds          INT DEFAULT 0,
    courtyard_area_sqm   DECIMAL(10,2),
    boys_toilets         INT DEFAULT 0,
    girls_toilets        INT DEFAULT 0,
    staff_toilets        INT DEFAULT 0,
    fence_condition      VARCHAR(30) CHECK (fence_condition IN ('جيد','يحتاج صيانة','غير موجود')),
    surveillance_cameras INT DEFAULT 0,
    has_landline         BOOLEAN DEFAULT false,
    has_internet         BOOLEAN DEFAULT false,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. القيادات المدرسية
-- =============================================================================
CREATE TABLE school_leaders (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id        UUID REFERENCES schools(id) ON DELETE CASCADE,
    national_id      VARCHAR(14) UNIQUE NOT NULL,
    full_name_ar     VARCHAR(100) NOT NULL,
    phone            VARCHAR(20),
    job_title        VARCHAR(60) CHECK (job_title IN (
                         'مدير','وكيل شئون العاملين','وكيل شئون الطلاب',
                         'مسئول الإحصاء','مسئول الدمج','مسئول القرائية',
                         'مسئول وحدة التدريب','رئيس الكنترول'
                     )),
    cadre            VARCHAR(50),
    appointment_type VARCHAR(30) CHECK (appointment_type IN ('أساسي','بالأجر','معاش')),
    hire_date        DATE,
    retirement_date  DATE,
    is_current       BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. العاملون
-- =============================================================================
CREATE TABLE school_staff (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id          UUID REFERENCES schools(id) ON DELETE CASCADE,
    job_category       VARCHAR(20) CHECK (job_category IN ('معلم','إداري','عامل')),
    teacher_code       VARCHAR(20),
    national_id        VARCHAR(14) UNIQUE NOT NULL,
    full_name_ar       VARCHAR(100) NOT NULL,
    qualification      VARCHAR(100),
    cadre_position     VARCHAR(50),
    employment_type    VARCHAR(30) CHECK (employment_type IN ('أساسي','بالأجر','معاش')),
    cadre_status       VARCHAR(20) CHECK (cadre_status IN ('له كادر','ليس له كادر')),
    assignment_status  VARCHAR(20) CHECK (assignment_status IN ('أصل','منتدب')),
    original_school_id UUID REFERENCES schools(id),
    hire_date          DATE,
    retirement_date    DATE,
    phone              VARCHAR(20),
    work_status        VARCHAR(40) CHECK (work_status IN (
                           'على رأس العمل','إجازة مرضي','إجازة رعاية طفل',
                           'إجازة بدون مرتب','إعارة','مرافق مريض'
                       )),
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. إحصاءات الصفوف الدراسية
-- =============================================================================
CREATE TABLE class_statistics (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year       VARCHAR(9) NOT NULL DEFAULT '2025-2026',
    grade_level         VARCHAR(25) CHECK (grade_level IN (
                            'KG1','KG2',
                            'الأول','الثاني','الثالث','الرابع','الخامس','السادس',
                            'الأول اعدادي','الثاني اعدادي','الثالث اعدادي',
                            'الأول ثانوي','الثاني ثانوي','الثالث ثانوي'
                        )),
    number_of_classes   INT NOT NULL DEFAULT 0,
    boys_count          INT DEFAULT 0,
    girls_count         INT DEFAULT 0,
    total_students      INT GENERATED ALWAYS AS (boys_count + girls_count) STORED,
    muslim_count        INT DEFAULT 0,
    christian_count     INT DEFAULT 0,
    density_per_class   DECIMAL(5,1) GENERATED ALWAYS AS (
                            CASE WHEN number_of_classes > 0
                            THEN ROUND((boys_count + girls_count)::DECIMAL / number_of_classes, 1)
                            ELSE 0 END
                        ) STORED,
    inclusion_mental    INT DEFAULT 0,
    inclusion_hearing   INT DEFAULT 0,
    inclusion_visual    INT DEFAULT 0,
    inclusion_physical  INT DEFAULT 0,
    inclusion_multiple  INT DEFAULT 0,
    inclusion_total     INT GENERATED ALWAYS AS (
                            inclusion_mental + inclusion_hearing + inclusion_visual +
                            inclusion_physical + inclusion_multiple
                        ) STORED,
    expatriate_count    INT DEFAULT 0,
    transferred_or_new  INT DEFAULT 0,
    retained_for_repeat INT DEFAULT 0,
    dropout_count       INT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, academic_year, grade_level)
);

-- =============================================================================
-- 7. كشوف الطلاب التفصيلية
-- =============================================================================

CREATE TABLE low_performer_students (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id         UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year     VARCHAR(9) NOT NULL DEFAULT '2025-2026',
    student_full_name VARCHAR(100) NOT NULL,
    grade_level       VARCHAR(25) NOT NULL,
    class_name        VARCHAR(20),
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inclusion_students_list (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id         UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year     VARCHAR(9) NOT NULL DEFAULT '2025-2026',
    student_full_name VARCHAR(100) NOT NULL,
    national_id       VARCHAR(14),
    grade_level       VARCHAR(25) NOT NULL,
    class_name        VARCHAR(20),
    disability_type   VARCHAR(30) CHECK (disability_type IN ('ذهني','سمعي','بصري','حركي','متعدد')),
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expatriate_students_list (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id         UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year     VARCHAR(9) NOT NULL DEFAULT '2025-2026',
    student_full_name VARCHAR(100) NOT NULL,
    passport_number   VARCHAR(20),
    grade_level       VARCHAR(25) NOT NULL,
    class_name        VARCHAR(20),
    country           VARCHAR(50),
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refugee_students_list (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id              UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year          VARCHAR(9) NOT NULL DEFAULT '2025-2026',
    student_full_name      VARCHAR(100) NOT NULL,
    grade_level            VARCHAR(25) NOT NULL,
    class_name             VARCHAR(20),
    country                VARCHAR(50),
    refugee_classification VARCHAR(30) CHECK (refugee_classification IN (
                               'سوري','أجنبي','فلسطيني','سوداني','يمني','أخرى'
                           )),
    created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 8. جدول التدريج (Excel Staging)
-- =============================================================================
CREATE TABLE staging_school_data (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by                     UUID REFERENCES auth.users(id),
    upload_session_id               UUID DEFAULT gen_random_uuid(),
    raw_school_code                 VARCHAR(50),
    raw_school_name                 VARCHAR(200),
    raw_total_students              VARCHAR(20),
    raw_classroom_count             VARCHAR(20),
    raw_inclusion_count             VARCHAR(20),
    raw_expatriate_count            VARCHAR(20),
    raw_low_performers              VARCHAR(20),
    raw_academic_year               VARCHAR(20),
    raw_principal_name              VARCHAR(100),
    raw_principal_phone             VARCHAR(20),
    raw_principal_national_id       VARCHAR(14),
    raw_vice_principal_staff_name   VARCHAR(100),
    raw_vice_principal_students_name VARCHAR(100),
    raw_stats_officer_name          VARCHAR(100),
    raw_inclusion_officer_name      VARCHAR(100),
    raw_reading_officer_name        VARCHAR(100),
    raw_training_officer_name       VARCHAR(100),
    raw_exam_head_name              VARCHAR(100),
    raw_teachers_count              INT DEFAULT 0,
    raw_admins_count                INT DEFAULT 0,
    raw_workers_count               INT DEFAULT 0,
    full_row_data                   JSONB,
    row_number                      INT,
    validation_status               VARCHAR(20) DEFAULT 'pending'
                                    CHECK (validation_status IN ('pending','valid','invalid','processed','error')),
    validation_errors               TEXT[],
    matched_school_id               UUID REFERENCES schools(id),
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    processed_at                    TIMESTAMPTZ
);

-- =============================================================================
-- 9. صلاحيات المستخدمين
-- =============================================================================
CREATE TABLE user_school_permissions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id        UUID REFERENCES schools(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) CHECK (permission_level IN ('view','edit','admin')),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, school_id)
);

-- جدول خاص للمستخدم الـ super admin (بدون school_id)
-- permission_level = 'admin' + school_id = NULL → صلاحية كاملة
ALTER TABLE user_school_permissions ALTER COLUMN school_id DROP NOT NULL;

-- =============================================================================
-- 10. إعدادات النظام والإشعارات والسجل
-- =============================================================================
CREATE TABLE admin_settings (
    id         SERIAL PRIMARY KEY,
    key        TEXT UNIQUE NOT NULL,
    value      TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    body       TEXT,
    type       VARCHAR(30) CHECK (type IN ('density_alert','upload_success','upload_error','info')),
    is_read    BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id),
    school_id  UUID REFERENCES schools(id),
    action     TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'UPLOAD'
    table_name TEXT,
    record_id  UUID,
    old_data   JSONB,
    new_data   JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 11. الفهارس
-- =============================================================================
CREATE INDEX idx_schools_code       ON schools(school_code);
CREATE INDEX idx_schools_admin      ON schools(administration_id);
CREATE INDEX idx_schools_type       ON schools(school_type);
CREATE INDEX idx_schools_active     ON schools(is_active);
CREATE INDEX idx_class_school_year  ON class_statistics(school_id, academic_year);
CREATE INDEX idx_leaders_school     ON school_leaders(school_id, job_title);
CREATE INDEX idx_staff_school_cat   ON school_staff(school_id, job_category);
CREATE INDEX idx_staff_work         ON school_staff(work_status);
CREATE INDEX idx_staging_status     ON staging_school_data(validation_status);
CREATE INDEX idx_staging_session    ON staging_school_data(upload_session_id);
CREATE INDEX idx_low_school_year    ON low_performer_students(school_id, academic_year);
CREATE INDEX idx_inclusion_school   ON inclusion_students_list(school_id, academic_year);
CREATE INDEX idx_notif_user         ON notifications(user_id, is_read);
CREATE INDEX idx_audit_school       ON audit_log(school_id, created_at);

-- =============================================================================
-- 12. Trigger: تحديث updated_at تلقائياً
-- =============================================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'schools','school_buildings','school_leaders','school_staff',
    'class_statistics','educational_administrations'
  ]
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trg_touch_%s
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- =============================================================================
-- 13. تفعيل RLS
-- =============================================================================
ALTER TABLE educational_administrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_buildings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_leaders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_staff                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_statistics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_performer_students       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inclusion_students_list      ENABLE ROW LEVEL SECURITY;
ALTER TABLE expatriate_students_list     ENABLE ROW LEVEL SECURITY;
ALTER TABLE refugee_students_list        ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_school_data          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_school_permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications                ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                    ENABLE ROW LEVEL SECURITY;

-- دالة مساعدة: هل المستخدم له صلاحية على مدرسة؟
CREATE OR REPLACE FUNCTION can_access_school(p_school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_school_permissions
        WHERE user_id = auth.uid()
          AND (school_id = p_school_id OR school_id IS NULL)
          AND permission_level IN ('view','edit','admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة مساعدة: هل المستخدم super admin؟
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_school_permissions
        WHERE user_id = auth.uid()
          AND school_id IS NULL
          AND permission_level = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- سياسات RLS
CREATE POLICY "إدارات — للجميع قراءة"      ON educational_administrations FOR SELECT USING (true);
CREATE POLICY "إدارات — الأدمن فقط للكتابة" ON educational_administrations FOR ALL USING (is_admin());

CREATE POLICY "مدارس — حسب الصلاحية"   ON schools FOR SELECT USING (can_access_school(id) OR is_admin());
CREATE POLICY "مدارس — أدمن للكتابة"   ON schools FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "مدارس — أدمن للتعديل"   ON schools FOR UPDATE USING (is_admin());
CREATE POLICY "مدارس — أدمن للحذف"     ON schools FOR DELETE USING (is_admin());

CREATE POLICY "مباني — حسب الصلاحية"      ON school_buildings  FOR ALL USING (can_access_school(school_id) OR is_admin());
CREATE POLICY "قيادات — حسب الصلاحية"     ON school_leaders    FOR ALL USING (can_access_school(school_id) OR is_admin());
CREATE POLICY "عاملين — حسب الصلاحية"     ON school_staff      FOR ALL USING (can_access_school(school_id) OR is_admin());
CREATE POLICY "إحصاءات — حسب الصلاحية"    ON class_statistics  FOR ALL USING (can_access_school(school_id) OR is_admin());
CREATE POLICY "ضعاف — حسب الصلاحية"       ON low_performer_students   FOR ALL USING (can_access_school(school_id) OR is_admin());
CREATE POLICY "دمج — حسب الصلاحية"        ON inclusion_students_list  FOR ALL USING (can_access_school(school_id) OR is_admin());
CREATE POLICY "وافدين — حسب الصلاحية"     ON expatriate_students_list FOR ALL USING (can_access_school(school_id) OR is_admin());
CREATE POLICY "لاجئين — حسب الصلاحية"     ON refugee_students_list    FOR ALL USING (can_access_school(school_id) OR is_admin());

CREATE POLICY "تدريج — المستخدم يرى تدريجه" ON staging_school_data      FOR ALL USING (uploaded_by = auth.uid() OR is_admin());
CREATE POLICY "صلاحيات — المستخدم يرى صلاحياته" ON user_school_permissions FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "صلاحيات — الأدمن للكتابة"  ON user_school_permissions FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "إشعارات — المستخدم يرى إشعاراته" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "سجل — الأدمن فقط"         ON audit_log FOR SELECT USING (is_admin());

-- =============================================================================
-- 14. المشاهدات التحليلية
-- =============================================================================

-- مشاهدة: ملخص كل مدرسة
CREATE OR REPLACE VIEW school_summary AS
SELECT
    s.id AS school_id,
    s.school_code,
    s.school_name_ar,
    s.school_type,
    s.educational_stage,
    s.is_active,
    ea.name_ar     AS administration_name,
    ea.governorate,
    sb.actual_classrooms,
    sb.building_status,
    sb.has_internet,
    COALESCE(SUM(cs.total_students),     0) AS total_students,
    COALESCE(SUM(cs.number_of_classes),  0) AS total_classes,
    COALESCE(SUM(cs.inclusion_total),    0) AS total_inclusion,
    COALESCE(SUM(cs.expatriate_count),   0) AS total_expatriate,
    COALESCE(SUM(cs.retained_for_repeat),0) AS total_retained,
    COALESCE(SUM(cs.dropout_count),      0) AS total_dropouts,
    COALESCE(SUM(cs.boys_count),         0) AS total_boys,
    COALESCE(SUM(cs.girls_count),        0) AS total_girls,
    ROUND(AVG(cs.density_per_class), 1)     AS avg_density,
    COUNT(DISTINCT lp.id)                   AS low_performer_count,
    COUNT(DISTINCT sl.id) FILTER (WHERE sl.job_category = 'معلم')  AS teacher_count,
    COUNT(DISTINCT sa.id) FILTER (WHERE sa.job_category = 'إداري') AS admin_count,
    COUNT(DISTINCT sw.id) FILTER (WHERE sw.job_category = 'عامل')  AS worker_count
FROM schools s
LEFT JOIN educational_administrations ea ON s.administration_id = ea.id
LEFT JOIN school_buildings sb            ON s.id = sb.school_id
LEFT JOIN class_statistics cs            ON s.id = cs.school_id AND cs.academic_year = '2025-2026'
LEFT JOIN low_performer_students lp      ON s.id = lp.school_id AND lp.academic_year = '2025-2026'
LEFT JOIN school_staff sl                ON s.id = sl.school_id
LEFT JOIN school_staff sa                ON s.id = sa.school_id
LEFT JOIN school_staff sw                ON s.id = sw.school_id
GROUP BY s.id, ea.name_ar, ea.governorate,
         sb.actual_classrooms, sb.building_status, sb.has_internet;

-- مشاهدة: مدارس الكثافة المرتفعة
CREATE OR REPLACE VIEW high_density_schools AS
SELECT
    s.id AS school_id,
    s.school_code,
    s.school_name_ar,
    s.school_type,
    ea.name_ar AS administration_name,
    ea.governorate,
    cs.grade_level,
    cs.total_students,
    cs.number_of_classes,
    cs.density_per_class,
    CASE
        WHEN cs.density_per_class > 60 THEN 'خطر'
        WHEN cs.density_per_class > 50 THEN 'مرتفع'
        WHEN cs.density_per_class > 40 THEN 'متوسط'
        ELSE 'مقبول'
    END AS density_status
FROM class_statistics cs
JOIN schools s ON cs.school_id = s.id
LEFT JOIN educational_administrations ea ON s.administration_id = ea.id
WHERE cs.academic_year = '2025-2026'
  AND cs.number_of_classes > 0
ORDER BY cs.density_per_class DESC;

-- مشاهدة: ملخص الإدارة التعليمية
CREATE OR REPLACE VIEW administration_summary AS
SELECT
    ea.id           AS administration_id,
    ea.code,
    ea.name_ar,
    ea.governorate,
    COUNT(DISTINCT s.id)                     AS total_schools,
    COALESCE(SUM(ss.total_students),  0)     AS total_students,
    COALESCE(SUM(ss.total_classes),   0)     AS total_classes,
    COALESCE(SUM(ss.teacher_count),   0)     AS total_teachers,
    COALESCE(SUM(ss.total_inclusion), 0)     AS total_inclusion,
    COALESCE(SUM(ss.total_expatriate),0)     AS total_expatriate,
    ROUND(AVG(ss.avg_density), 1)            AS avg_density,
    COUNT(s.id) FILTER (WHERE ss.avg_density > 50) AS high_density_schools_count
FROM educational_administrations ea
LEFT JOIN schools s ON ea.id = s.administration_id AND s.is_active = true
LEFT JOIN school_summary ss ON s.id = ss.school_id
GROUP BY ea.id;

-- =============================================================================
-- 15. الدوال المخزنة
-- =============================================================================

-- دالة: البحث عن مدارس بديلة ذات كثافة أقل من 40
CREATE OR REPLACE FUNCTION find_alternative_schools(
    target_school_id UUID,
    year VARCHAR DEFAULT '2025-2026'
)
RETURNS TABLE (
    alternative_school_id   UUID,
    alternative_school_code VARCHAR,
    alternative_school_name VARCHAR,
    avg_density             DECIMAL,
    available_classrooms    INT,
    total_students          BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.school_code,
        s.school_name_ar,
        ROUND(AVG(cs.density_per_class), 1) AS avg_density,
        sb.actual_classrooms,
        COALESCE(SUM(cs.total_students), 0) AS total_students
    FROM schools s
    JOIN class_statistics cs ON s.id = cs.school_id AND cs.academic_year = year
    JOIN school_buildings  sb ON s.id = sb.school_id
    WHERE s.administration_id = (
        SELECT administration_id FROM schools WHERE id = target_school_id
    )
      AND s.id != target_school_id
      AND s.is_active = true
    GROUP BY s.id, sb.actual_classrooms
    HAVING ROUND(AVG(cs.density_per_class), 1) < 40
    ORDER BY avg_density ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 16. بيانات البداية
-- =============================================================================

-- إدارة تعليمية افتراضية
INSERT INTO educational_administrations (code, name_ar, governorate) VALUES
  ('ADM001', 'إدارة العمرانية التعليمية', 'الجيزة')
ON CONFLICT (code) DO NOTHING;

-- إعدادات النظام
INSERT INTO admin_settings (key, value) VALUES
  ('academic_year', '2025-2026'),
  ('density_warning_threshold', '50'),
  ('density_danger_threshold', '60'),
  ('system_name', 'منظومة التعليم الابتدائى')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 17. منح المستخدم صلاحيات Super Admin
-- استبدل المعرف أدناه بمعرف المستخدم الفعلي من Authentication
-- =============================================================================
-- INSERT INTO user_school_permissions (user_id, school_id, permission_level)
-- VALUES ('YOUR_USER_UUID_HERE', NULL, 'admin')
-- ON CONFLICT DO NOTHING;

-- =============================================================================
-- تم الانتهاء من Schema v2.0
-- =============================================================================
