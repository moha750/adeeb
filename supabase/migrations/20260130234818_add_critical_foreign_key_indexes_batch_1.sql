-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234818   الاسم: add_critical_foreign_key_indexes_batch_1

-- Migration: إضافة Indexes على Foreign Keys الحرجة (الدفعة 1)
-- هذه الـ indexes ستحسن أداء الاستعلامات بشكل كبير

-- Indexes لجدول interview_slots (استخدام عالي)
CREATE INDEX IF NOT EXISTS idx_interview_slots_booked_by 
ON interview_slots(booked_by) 
WHERE booked_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interview_slots_interview_id 
ON interview_slots(interview_id) 
WHERE interview_id IS NOT NULL;

-- Indexes لجدول member_onboarding_tokens
CREATE INDEX IF NOT EXISTS idx_member_onboarding_tokens_interview_id 
ON member_onboarding_tokens(interview_id) 
WHERE interview_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_member_onboarding_tokens_application_id 
ON member_onboarding_tokens(application_id) 
WHERE application_id IS NOT NULL;

-- Indexes لجدول membership_applications (جدول حرج)
CREATE INDEX IF NOT EXISTS idx_membership_applications_reviewed_by 
ON membership_applications(reviewed_by) 
WHERE reviewed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membership_applications_approved_for_interview_by 
ON membership_applications(approved_for_interview_by) 
WHERE approved_for_interview_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membership_applications_session_id 
ON membership_applications(session_id) 
WHERE session_id IS NOT NULL;

-- Indexes لجدول member_evaluations
CREATE INDEX IF NOT EXISTS idx_member_evaluations_evaluator_id 
ON member_evaluations(evaluator_id);

-- Indexes لجدول contact_messages
CREATE INDEX IF NOT EXISTS idx_contact_messages_replied_by 
ON contact_messages(replied_by) 
WHERE replied_by IS NOT NULL;

-- Indexes لجدول interview_sessions
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created_by 
ON interview_sessions(created_by);

COMMENT ON INDEX idx_interview_slots_booked_by IS 'تحسين أداء استعلامات الحجوزات';
COMMENT ON INDEX idx_membership_applications_reviewed_by IS 'تحسين أداء استعلامات المراجعة';
COMMENT ON INDEX idx_member_evaluations_evaluator_id IS 'تحسين أداء استعلامات التقييمات';
