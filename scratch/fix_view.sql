const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    let [key, ...rest] = line.split('=');
    let val = rest.join('=');
    val = val.split('#')[0].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[key.trim()] = val;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function fixView() {
  const sql = `
CREATE OR REPLACE VIEW school_summary AS
WITH stats_sum AS (
    SELECT school_id, 
           SUM(total_students) AS total_students,
           SUM(number_of_classes) AS total_classes,
           SUM(inclusion_total) AS total_inclusion,
           SUM(expatriate_count) AS total_expatriate,
           SUM(retained_for_repeat) AS total_retained,
           SUM(dropout_count) AS total_dropouts,
           SUM(boys_count) AS total_boys,
           SUM(girls_count) AS total_girls,
           ROUND(AVG(density_per_class), 1) AS avg_density
    FROM class_statistics 
    WHERE academic_year = '2025-2026'
    GROUP BY school_id
),
lp_count AS (
    SELECT school_id, COUNT(*) AS low_performer_count
    FROM low_performer_students
    WHERE academic_year = '2025-2026'
    GROUP BY school_id
),
staff_counts AS (
    SELECT school_id,
           COUNT(*) FILTER (WHERE job_category = 'معلم') AS teacher_count,
           COUNT(*) FILTER (WHERE job_category = 'إداري') AS admin_count,
           COUNT(*) FILTER (WHERE job_category = 'عامل') AS worker_count
    FROM school_staff
    GROUP BY school_id
)
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
    COALESCE(cs.total_students, 0) AS total_students,
    COALESCE(cs.total_classes, 0) AS total_classes,
    COALESCE(cs.total_inclusion, 0) AS total_inclusion,
    COALESCE(cs.total_expatriate, 0) AS total_expatriate,
    COALESCE(cs.total_retained, 0) AS total_retained,
    COALESCE(cs.total_dropouts, 0) AS total_dropouts,
    COALESCE(cs.total_boys, 0) AS total_boys,
    COALESCE(cs.total_girls, 0) AS total_girls,
    COALESCE(cs.avg_density, 0) AS avg_density,
    COALESCE(lp.low_performer_count, 0) AS low_performer_count,
    COALESCE(st.teacher_count, 0) AS teacher_count,
    COALESCE(st.admin_count, 0) AS admin_count,
    COALESCE(st.worker_count, 0) AS worker_count
FROM schools s
LEFT JOIN educational_administrations ea ON s.administration_id = ea.id
LEFT JOIN school_buildings sb            ON s.id = sb.school_id
LEFT JOIN stats_sum cs                   ON s.id = cs.school_id
LEFT JOIN lp_count lp                    ON s.id = lp.school_id
LEFT JOIN staff_counts st                ON s.id = st.school_id;
  `;

  // Since Supabase JS client doesn't support running arbitrary SQL,
  // we would usually do this in a migration or the SQL Editor.
  // However, I can try to use a Supabase Edge Function if available or just tell the user.
  // Wait, I can't run SQL directly. 
  console.log('SQL to fix the view is prepared.');
  console.log(sql);
}
fixView();
