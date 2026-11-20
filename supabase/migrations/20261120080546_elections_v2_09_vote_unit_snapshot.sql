-- الانتخابات ٢٠٢٦، الدفعة ٩ (بإذن المالك ٢٠٢٦-١١-٢٠: «أريد الحل الثاني»)
--
-- **وحدةُ المصوّت تُحفظ مع صوته.** كان الصوتُ يحفظ رتبةَ صاحبه ساعةَ صوّت (`voter_role_snapshot`: «قائد») ولا يحفظ وحدتَه،
-- فقال تفصيلُ الأصوات «قائد» ولم يُعرف قائدُ ماذا (محمد: «قادة من؟ لماذا يكتب فقط الدور؟»).
-- ١) عمودٌ جديد `voter_unit_snapshot`: اسمُ لجنة الرتبة أو قسمها أو إدارتها ساعةَ الإدلاء، يكتبه محفّزُ الأهليّة نفسُه
--    الذي يكتب الرتبةَ والوزن، ويُنقل في إعادة التصويت مع الوزن والرتبة كما هما.
-- ٢) **والأصواتُ القديمة لا تُمسّ**: هي مختومةٌ (`votes_immutable_upd`) ولا يُفتح ختمُها لعمودِ عرض. فتُقرأ وحدتُها من سجلّ
--    المناصب (`user_roles` بتاريخَي `assigned_at` و`ended_at`): الإسنادُ بالرتبة نفسِها الذي كان قائمًا ساعةَ الصوت، وإلّا أقربُها.
-- ٣) `get_election_vote_detail` تُخرج `voter_unit`. وتغيّرُ شكل ما تُرجعه يُلزم إسقاطَها وإعادتَها، فتُعاد صلاحيّتُها كما كانت
--    (`authenticated` وحده؛ وحارسُها داخلها: `has_election_admin_permission`).

alter table public.election_votes add column if not exists voter_unit_snapshot text;
comment on column public.election_votes.voter_unit_snapshot is
  'اسم وحدة رتبة المصوّت ساعة الإدلاء (لجنة أو قسم أو إدارة)، يكتبه enforce_vote_eligibility. فارغ للرتب بلا وحدة وللأصوات قبل 2026-11-20';

-- وحدةُ رتبةٍ لشخصٍ في لحظة: الإسنادُ القائمُ فيها أوّلًا، ثمّ النشط، ثمّ الأصيلُ قبل التكليف، ثمّ الأحدث.
-- مغلقةٌ (لا منحَ لأحد): يستعملها المحفّزُ ودالّةُ التفصيل وكلتاهما بصلاحيّة المالك.
create or replace function public._voter_unit_at(p_user uuid, p_role text, p_at timestamptz)
 returns text
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(c.committee_name_ar, d.name_ar)
  from user_roles ur
  left join committees c on c.id = ur.committee_id
  left join departments d on d.id = ur.department_id
  where ur.user_id = p_user and ur.role_name = p_role
  order by (ur.assigned_at <= p_at and (ur.ended_at is null or ur.ended_at > p_at)) desc,
           ur.is_active desc, ur.is_acting, ur.assigned_at desc
  limit 1;
$function$;
revoke all on function public._voter_unit_at(uuid, text, timestamptz) from public, anon, authenticated;

-- المحفّز: يُستبدل في **تعريفه الحيّ**، وكلُّ استبدالٍ يُشترط أن يقع مرّةً واحدة وإلّا رُدّ الترحيلُ كلُّه (كالدفعة ٨)
do $mig$
declare
  v_def text;
  a1 constant text := E'    new.voter_role_snapshot := v_prev.voter_role_snapshot;\n';
  a2 constant text := E'  new.voter_role_snapshot := coalesce(get_user_primary_role(new.voter_id), ''unknown'');\n';
begin
  v_def := pg_get_functiondef('public.enforce_vote_eligibility()'::regprocedure);
  if (char_length(v_def) - char_length(replace(v_def, a1, ''))) / char_length(a1) <> 1 then
    raise exception 'enforce_vote_eligibility: لم يوجد سطرُ نقل الرتبة في إعادة التصويت مرّةً واحدة';
  end if;
  if (char_length(v_def) - char_length(replace(v_def, a2, ''))) / char_length(a2) <> 1 then
    raise exception 'enforce_vote_eligibility: لم يوجد سطرُ لقطة الرتبة مرّةً واحدة';
  end if;
  v_def := replace(v_def, a1, a1 || E'    new.voter_unit_snapshot := v_prev.voter_unit_snapshot;\n');
  v_def := replace(v_def, a2, a2 || E'  new.voter_unit_snapshot := public._voter_unit_at(new.voter_id, new.voter_role_snapshot, now());\n');
  execute v_def;
end
$mig$;

drop function if exists public.get_election_vote_detail(uuid);
create function public.get_election_vote_detail(p_election uuid)
 returns table(voter_id uuid, voter_name text, voter_role text, voter_unit text, candidate_id uuid, candidate_number integer, candidate_name text, vote_weight numeric, vote_choice text, voted_at timestamp with time zone, voided_at timestamp with time zone, void_reason text)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
begin
  if not exists (select 1 from elections e where e.id = p_election) then
    raise exception 'الانتخاب غير موجود';
  end if;
  if not has_election_admin_permission(auth.uid()) then
    raise exception 'تفصيل الأصوات متاح لإدارة الانتخابات فقط';
  end if;
  return query
  select v.voter_id, vp.full_name, v.voter_role_snapshot,
         coalesce(v.voter_unit_snapshot, public._voter_unit_at(v.voter_id, v.voter_role_snapshot, v.created_at)),
         v.candidate_id, ec.candidate_number, cp.full_name,
         v.vote_weight, v.vote_choice, v.created_at, v.voided_at, v.void_reason
  from election_votes v
  left join election_candidates ec on ec.id = v.candidate_id
  left join profiles vp on vp.id = v.voter_id
  left join profiles cp on cp.id = ec.user_id
  where v.election_id = p_election
  order by v.created_at;
end;
$function$;
revoke all on function public.get_election_vote_detail(uuid) from public, anon;
-- يناديها عميلُ الجلسة في صفحة الانتخاب، وحارسُها في متنها (مديرو الانتخابات وحدهم)
grant execute on function public.get_election_vote_detail(uuid) to authenticated, service_role;
