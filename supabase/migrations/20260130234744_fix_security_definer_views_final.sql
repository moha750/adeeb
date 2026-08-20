-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234744   الاسم: fix_security_definer_views_final

-- Migration: إزالة SECURITY DEFINER من Views الحرجة (نسخة نهائية مصححة)

-- حذف الـ Views القديمة
DROP VIEW IF EXISTS surveys_overview CASCADE;
DROP VIEW IF EXISTS survey_responses_detailed CASCADE;

-- إعادة إنشاء surveys_overview بدون SECURITY DEFINER وبالأعمدة الصحيحة
CREATE OR REPLACE VIEW surveys_overview AS
SELECT 
  s.id,
  s.title,
  s.description,
  s.status,
  s.survey_type,
  s.access_type,
  s.created_by,
  s.created_at,
  s.updated_at,
  s.published_at,
  s.closed_at,
  s.total_responses,
  s.total_completed,
  s.total_views,
  p.full_name as creator_name,
  p.email as creator_email,
  c.committee_name_ar as committee_name,
  COUNT(DISTINCT sr.id) as response_count,
  COUNT(DISTINCT sq.id) as question_count
FROM surveys s
LEFT JOIN profiles p ON s.created_by = p.id
LEFT JOIN committees c ON s.committee_id = c.id
LEFT JOIN survey_responses sr ON s.id = sr.survey_id
LEFT JOIN survey_questions sq ON s.id = sq.survey_id
GROUP BY s.id, p.full_name, p.email, c.committee_name_ar;

-- إعادة إنشاء survey_responses_detailed بدون SECURITY DEFINER وبالأعمدة الصحيحة
CREATE OR REPLACE VIEW survey_responses_detailed AS
SELECT 
  sr.id as response_id,
  sr.survey_id,
  sr.user_id,
  sr.started_at,
  sr.completed_at,
  sr.time_spent_seconds,
  sr.ip_address,
  sr.status,
  s.title as survey_title,
  s.survey_type,
  p.full_name as respondent_name,
  p.email as respondent_email,
  COUNT(sa.id) as answers_count
FROM survey_responses sr
JOIN surveys s ON sr.survey_id = s.id
LEFT JOIN profiles p ON sr.user_id = p.id
LEFT JOIN survey_answers sa ON sr.id = sa.response_id
GROUP BY sr.id, s.title, s.survey_type, p.full_name, p.email;

COMMENT ON VIEW surveys_overview IS 'نظرة عامة على الاستبيانات - بدون SECURITY DEFINER';
COMMENT ON VIEW survey_responses_detailed IS 'تفاصيل ردود الاستبيانات - بدون SECURITY DEFINER';
