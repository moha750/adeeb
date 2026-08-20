-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260808113712   الاسم: 20260808_elections_37_member_nav_signals

-- إشارات ظهور أبواب العضو الثلاثة — استعلامٌ واحد للقائمة الجانبيّة (يُقرأ كلّ تحميل).
-- can_run: له انتخابٌ مفتوحٌ للترشّح ولم يترشّح · has_candidacy: له ترشّحٌ قائم ·
-- can_vote: له تصويتٌ مفتوحٌ لم يصوّت فيه. يُستدعى بالخدمة (p_user) أو بالجلسة (auth.uid()).
create or replace function public.get_member_election_signals(p_user uuid default null)
returns table(can_run boolean, has_candidacy boolean, can_vote boolean)
language sql stable security definer set search_path to 'public'
as $function$
  select
    exists (select 1 from get_eligible_elections_for_user(coalesce(p_user, auth.uid())) e where e.has_submission = false),
    exists (select 1 from get_user_candidacies(coalesce(p_user, auth.uid()))),
    exists (select 1 from get_votable_elections_for_user(coalesce(p_user, auth.uid())) v where v.has_voted = false);
$function$;
