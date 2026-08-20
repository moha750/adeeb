-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260418182547   الاسم: committee_leaders_read_member_details

CREATE POLICY "committee_leaders_can_read_members_details"
ON public.member_details
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles leader_ur
    JOIN public.roles leader_r ON leader_r.id = leader_ur.role_id
    JOIN public.user_roles member_ur
      ON member_ur.committee_id = leader_ur.committee_id
    WHERE leader_ur.user_id = auth.uid()
      AND leader_ur.is_active = true
      AND leader_r.role_name IN ('committee_leader', 'deputy_committee_leader')
      AND member_ur.user_id = member_details.user_id
      AND member_ur.is_active = true
      AND leader_ur.committee_id IS NOT NULL
  )
);
