-- تقييمُ القيادات الربعيّ (٤): وسمُ المشرف بين مقيِّمي المجلس.
--
-- شقُّ المجلس يُسمّى في الواجهة «المجلس الإداري» (محمد ٢٠٢٦-١٠-٢٧)، وهو رئيس أدِيب والرئيس التنفيذي وقائدا
-- الإدارتين. لكنّ اللائحة (م٤/1) تُدخل معهم في تقييم القائد ونائبه المشرفَين على اللجنة من الإدارتين، وليسا
-- من المجلس الإداري. فيعود مع كلّ مقيِّمٍ عمودُ `supervisor`: من في شقّ المجلس لأنّه يشرف على اللجنة لا لأنّه
-- من المجلس، فتسمه الواجهةُ «مشرف» ولا يُحسب تحت الاسم ما ليس منه. (أقرّه محمد ٢٠٢٦-١٠-٢٨.)
--
-- تغييرُ شكل العائد يستلزم إسقاطَ الدالّة وإعادتَها. وهي للخدمة وحدها كما كانت: لا منح.

drop function if exists public.evaluation_admin_electorate(integer);

create function public.evaluation_admin_electorate(p_target integer)
returns table(rater_id uuid, full_name text, part text, added_by_correction boolean, removed boolean, supervisor boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.rater_id, p.full_name, e.part, e.added_by_correction, e.removed_at is not null,
         e.part = 'council'
           and t.committee_id is not null
           and exists (select 1 from committee_supervision cs
                       where cs.supervisor_id = e.rater_id and cs.committee_id = t.committee_id)
           and not exists (select 1 from user_roles ur
                           where ur.user_id = e.rater_id and ur.is_active
                             and ur.role_name in ('club_president', 'executive_council_president',
                                                  'hr_committee_leader', 'qa_committee_leader'))
  from evaluation_electorate e
  join evaluation_targets t on t.id = e.target_id
  left join profiles p on p.id = e.rater_id
  where e.target_id = p_target
  order by e.part desc, p.full_name;
$$;
revoke all on function public.evaluation_admin_electorate(integer) from public, anon, authenticated;
