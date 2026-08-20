-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260723153505   الاسم: survey_rls_respect_flags

-- سياسات القراءة تحترم عَلَمَي الأرشفة/الحذف: الاستبيان المحذوف/المؤرشف (وإن بقيت حالته active) لا يُقرأ عبر RLS.
alter policy surveys_read_public on surveys
  using (status = 'active' and access_type = 'public' and archived_at is null and deleted_at is null);

alter policy surveys_read_members on surveys
  using (
    status = 'active' and access_type = 'members_only'
    and archived_at is null and deleted_at is null
    and survey_is_active_member((select auth.uid()))
  );

alter policy survey_questions_read on survey_questions
  using (exists (
    select 1 from surveys s
    where s.id = survey_questions.survey_id
      and s.status = 'active'
      and s.archived_at is null and s.deleted_at is null
      and (s.access_type = 'public' or (s.access_type = 'members_only' and survey_is_active_member((select auth.uid()))))
  ));
