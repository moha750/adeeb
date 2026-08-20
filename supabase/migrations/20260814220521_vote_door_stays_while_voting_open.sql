-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260814220521   الاسم: vote_door_stays_while_voting_open

-- بابُ التصويت كان يسقط من القائمة فورَ إدلاء العضو بصوته (شرطُ `has_voted = false`)،
-- فيُطرَد من غرفةٍ بُنيت على وعدِ «من صوّت يبقى له أن يقرأ حتّى يُغلق الباب»، وتصير حالةُ
-- «صوّتت» في كرت الفرصة واجهةً لا تُرى. وللتصويت لا سِجلَّ يخلُفه كما لِلترشُّح سِجلُّه.
--
-- فصار البابُ يبقى ما دام في نطاق العضو تصويتٌ **مفتوح**، ويسقط بإغلاقه (بالكنّاسة عند
-- انقضاء المهلة، أو بيد المدير). والأهليّةُ والصوتُ الواحد تحرسهما القاعدة كما كانت.
create or replace function public.get_member_election_signals(p_user uuid default null::uuid)
returns table(can_run boolean, has_candidacy boolean, can_vote boolean)
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    exists (select 1 from get_eligible_elections_for_user(coalesce(p_user, auth.uid())) e where e.has_submission = false),
    exists (select 1 from get_user_candidacies(coalesce(p_user, auth.uid()))),
    exists (select 1 from get_votable_elections_for_user(coalesce(p_user, auth.uid())));
$function$;

