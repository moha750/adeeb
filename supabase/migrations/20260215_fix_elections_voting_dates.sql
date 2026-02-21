-- ========================================
-- إصلاح جدول elections - جعل voting_end_date nullable
-- ========================================

-- جعل voting_end_date و voting_start_date nullable
ALTER TABLE elections 
ALTER COLUMN voting_end_date DROP NOT NULL;

ALTER TABLE elections 
ALTER COLUMN voting_start_date DROP NOT NULL;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN elections.voting_end_date IS 'تاريخ انتهاء التصويت - يتم تحديده عند بدء التصويت';
COMMENT ON COLUMN elections.voting_start_date IS 'تاريخ بدء التصويت - يتم تحديده عند بدء التصويت';
