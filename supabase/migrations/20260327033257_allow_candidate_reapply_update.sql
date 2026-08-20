-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260327033257   الاسم: allow_candidate_reapply_update

CREATE POLICY "election_candidates_update_self_reapply"
ON public.election_candidates
FOR UPDATE
USING (
    auth.uid() = user_id
    AND status = 'rejected'
    AND allow_reapply = true
)
WITH CHECK (
    auth.uid() = user_id
);
