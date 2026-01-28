-- =====================================================
-- جعل حقل interview_date قابل للقيم الفارغة
-- =====================================================
-- تاريخ الإنشاء: 2026-01-28
-- الوصف: إصلاح مشكلة رفض المتقدمين من البرزخ بدون تاريخ مقابلة
-- المشكلة: null value in column "interview_date" violates not-null constraint
-- =====================================================

-- جعل interview_date قابل للقيم الفارغة (nullable)
ALTER TABLE membership_interviews 
ALTER COLUMN interview_date DROP NOT NULL;

-- تعليق توضيحي
COMMENT ON COLUMN membership_interviews.interview_date IS 'تاريخ المقابلة - قابل للقيم الفارغة في حالة الرفض المباشر من البرزخ';
