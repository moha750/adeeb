-- =====================================================
-- إضافة star_rating وإصلاح أعمدة الجداول
-- Add star_rating type and fix table columns
-- =====================================================
-- تاريخ الإنشاء: 2026-01-27
-- الوصف: إضافة نوع سؤال star_rating وإصلاح أعمدة survey_answers
-- =====================================================

-- 1. تحديث قيد question_type لإضافة star_rating
ALTER TABLE public.survey_questions 
DROP CONSTRAINT IF EXISTS survey_questions_question_type_check;

ALTER TABLE public.survey_questions 
ADD CONSTRAINT survey_questions_question_type_check 
CHECK (question_type IN (
    'short_text',
    'long_text',
    'single_choice',
    'multiple_choice',
    'dropdown',
    'rating_scale',
    'linear_scale',
    'star_rating',
    'date',
    'time',
    'email',
    'phone',
    'number',
    'url',
    'file_upload',
    'matrix',
    'ranking',
    'yes_no',
    'agreement_scale',
    'nps'
));

-- 2. إضافة عمود answer_value إلى survey_answers (إذا لم يكن موجوداً)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'survey_answers' 
        AND column_name = 'answer_value'
    ) THEN
        ALTER TABLE public.survey_answers 
        ADD COLUMN answer_value TEXT;
    END IF;
END $$;

-- 3. نقل البيانات من answer_text إلى answer_value إذا كانت موجودة
UPDATE public.survey_answers 
SET answer_value = answer_text 
WHERE answer_value IS NULL AND answer_text IS NOT NULL;

-- 4. إضافة تعليق على العمود الجديد
COMMENT ON COLUMN public.survey_answers.answer_value IS 
'قيمة الإجابة - يمكن أن تكون نص، رقم، أو JSON للإجابات المعقدة';

-- 5. إنشاء فهرس على answer_value للبحث السريع
CREATE INDEX IF NOT EXISTS idx_survey_answers_answer_value 
ON public.survey_answers USING gin(to_tsvector('arabic', answer_value));
