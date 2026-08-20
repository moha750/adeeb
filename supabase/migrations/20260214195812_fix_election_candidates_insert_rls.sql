-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260214195812   الاسم: fix_election_candidates_insert_rls


-- حذف السياسة القديمة
DROP POLICY IF EXISTS election_candidates_insert_own ON election_candidates;

-- إنشاء سياسة INSERT جديدة بدون التحقق من جدول elections (لأن سياسة SELECT على elections قد تمنع الوصول)
CREATE POLICY election_candidates_insert_authenticated ON election_candidates
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
);

