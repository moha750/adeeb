-- تقييمُ القيادات (٦): إداريّو الإدارة التنفيذيّة يقيّمون القيادات، في شقّ المجلس.
--
-- سألت الإدارةُ التنفيذيّة يومَ فتح أوّل تقييمٍ شهريّ (٢٠٢٦-١١-٢٢): لماذا لا نقيّم؟ واللائحةُ (م٤) لم تذكرهم:
-- صوتُ إدارتهم كان يصل عبر الرئيس التنفيذيّ وحده. فعدّلها محمد في اليوم نفسه: يقيّمون **الجميع** (قادةَ اللجان
-- ونوّابَهم ومنسّقي الأقسام) لأنّهم إدارةٌ تنفيذيّة، و**في شقّ المجلس (30%)** لا في شقّ الأعضاء. فشقُّ الأعضاء
-- رأيُ من يعمل تحت القائد في وحدته، ونصابُه («النصف») يُحسب منها، ولو دخلوه لرفعوا المطلوبَ في كلّ لجنةٍ بأناسٍ
-- من خارجها. ووزنُ صوتهم كوزن إداريّي الموارد والجودة (قرار ٢٠٢٦-١٠-١٠). والمكلَّفُ بمقعدهم يقيّم: للمكلَّف كلُّ
-- ما للمنصب (الدستور م٣٤).
--
-- وثلاثةُ أجزاء:
--   ١) `_evaluation_raters`: يدخلون شقَّ المجلس لكلّ مقيَّم، من الشهر القادم وما بعده.
--   ٢) `evaluation_admin_electorate`: يعود عمودُ `executive` ليجمعهم نافذةُ التفصيل تحت اسمهم، كما يُجمع المشرفون،
--      فلا يُحسبون تحت «المجلس الإداري» وليسوا منه.
--   ٣) **تقييم نوفمبر 2026 المفتوح**: بقرار محمد يدخلونه الآن لا من ديسمبر. فيُضافون إلى لقطة كلّ دورةٍ مفتوحة
--      ويُشعَرون. ومن كان في شقّ الأعضاء ولم يقيّم بعدُ انتقل إلى المجلس (م٤/3)؛ ومن قيّم بورقة أعضاءٍ بقيت ورقتُه
--      كما هي. والجزءُ يُعاد بلا أثر: لا يضيف صفًّا موجودًا، ولا يمسّ دورةً غيرَ مفتوحة.

-- ══ ١) المقيِّمون ══════════════════════════════════════════════════════════

create or replace function public._evaluation_raters(p_user uuid, p_role text, p_committee integer, p_department integer)
returns table(rater_id uuid, part text)
language sql
stable
security definer
set search_path to 'public'
as $$
  with council as (
    select ur.user_id
    from user_roles ur
    where ur.is_active
      and ur.role_name in ('club_president', 'executive_council_president', 'hr_committee_leader', 'qa_committee_leader',
                           -- م٤ المعدّلة (٢٠٢٦-١١-٢٢): إداريّو الإدارة التنفيذيّة يقيّمون الجميع
                           'exec_admin_member')
    union
    select cs.supervisor_id
    from committee_supervision cs
    join committees u on u.id = cs.unit_id
    where p_role <> 'department_head'
      and cs.committee_id = p_committee
      and u.supervises
      and exists (select 1 from user_roles s
                  where s.user_id = cs.supervisor_id and s.is_active and s.committee_id = u.id)
  ),
  members as (
    select ur.user_id
    from user_roles ur
    where p_role <> 'department_head' and ur.is_active and ur.committee_id = p_committee
    union
    select ur.user_id
    from user_roles ur
    join committees c on c.id = p_committee
    where p_role <> 'department_head' and ur.is_active
      and ur.role_name = 'department_head' and ur.department_id = c.department_id
    union
    select ur.user_id
    from user_roles ur
    join committees c on c.id = ur.committee_id
    where p_role = 'department_head' and ur.is_active
      and c.department_id = p_department and c.is_active and c.council_id = 'executive'
  ),
  everyone as (
    select user_id, 'council'::text as part from council
    union all
    select user_id, 'members' from members where user_id not in (select user_id from council)
  )
  select e.user_id, e.part
  from everyone e
  where e.user_id <> p_user
    and public.is_adeeb_member(e.user_id)
    and not exists (select 1 from user_roles a where a.user_id = e.user_id and a.is_active and a.role_name = 'adeeb_admin');
$$;
comment on function public._evaluation_raters(uuid, text, integer, integer) is
  'المقيِّمون لمقيَّمٍ واحد وشقُّ كلٍّ منهم (لائحة تقييم القيادات م٣ وم٤، وإداريّو الإدارة التنفيذيّة من ٢٠٢٦-١١-٢٢). يُقرأ لحظةَ الفتح ويُحفظ لقطة.';

-- ══ ٢) وسمُ الإداريّ التنفيذيّ في نافذة التفصيل ════════════════════════════════
-- مَن في شقّ المجلس لأنّه إداريٌّ تنفيذيّ، لا لأنّه من المجلس الإداريّ ولا لأنّه يشرف على اللجنة.
-- تغييرُ شكل العائد يستلزم إسقاطَ الدالّة وإعادتَها. وهي للخدمة وحدها كما كانت: لا منح.

drop function if exists public.evaluation_admin_electorate(integer);

create function public.evaluation_admin_electorate(p_target integer)
returns table(rater_id uuid, full_name text, part text, added_by_correction boolean, removed boolean,
              supervisor boolean, seat_title text, gender text, executive boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  with x as (
    select e.*, t.committee_id as t_committee,
           exists (select 1 from user_roles ur
                   where ur.user_id = e.rater_id and ur.is_active
                     and ur.role_name in ('club_president', 'executive_council_president',
                                          'hr_committee_leader', 'qa_committee_leader')) as in_board
    from evaluation_electorate e
    join evaluation_targets t on t.id = e.target_id
    where e.target_id = p_target
  )
  select x.rater_id, p.full_name, x.part, x.added_by_correction, x.removed_at is not null,
         x.part = 'council' and not x.in_board
           and x.t_committee is not null
           and exists (select 1 from committee_supervision cs
                       where cs.supervisor_id = x.rater_id and cs.committee_id = x.t_committee),
         case when x.rater_id is not null then public.position_title_of(x.rater_id) end,
         p.gender,
         x.part = 'council' and not x.in_board
           and exists (select 1 from user_roles ur
                       where ur.user_id = x.rater_id and ur.is_active and ur.role_name = 'exec_admin_member')
  from x
  left join profiles p on p.id = x.rater_id
  order by x.part desc, p.full_name;
$$;
revoke all on function public.evaluation_admin_electorate(integer) from public, anon, authenticated;

-- ══ ٣) تقييمُ الشهر المفتوح ══════════════════════════════════════════════════

do $$
declare
  v_cycle record;
  v_new   jsonb;
begin
  for v_cycle in select * from evaluation_cycles where status = 'open' loop
    -- من في شقّ الأعضاء بلا ورقةٍ بعدُ ينتقل إلى المجلس (م٤/3: من اجتمع له الشقّان فله ورقةٌ واحدة، في المجلس)
    update evaluation_electorate e
    set part = 'council'
    from evaluation_targets t, user_roles ur
    where t.id = e.target_id and t.cycle_id = v_cycle.id
      and e.part = 'members' and e.removed_at is null
      and ur.user_id = e.rater_id and ur.is_active and ur.role_name = 'exec_admin_member'
      and not exists (select 1 from evaluation_ballots b where b.target_id = e.target_id and b.rater_id = e.rater_id);

    with added as (
      insert into evaluation_electorate (target_id, rater_id, part)
      select t.id, r.rater_id, 'council'
      from evaluation_targets t
      cross join lateral _evaluation_raters(t.user_id, t.role_name, t.committee_id, t.department_id) r
      where t.cycle_id = v_cycle.id and t.excluded is null and t.cancelled is null and t.verdict is null
        and r.part = 'council'
        and exists (select 1 from user_roles ur
                    where ur.user_id = r.rater_id and ur.is_active and ur.role_name = 'exec_admin_member')
      on conflict (target_id, rater_id) do nothing
      returning target_id, rater_id
    ),
    logged as (
      insert into evaluation_audit_log (cycle_id, target_id, event, reason, details)
      select v_cycle.id, a.target_id, 'rater_added',
             'تعديل المادة الرابعة: إداريّو الإدارة التنفيذيّة يقيّمون في شقّ المجلس',
             jsonb_build_object('rater', a.rater_id, 'part', 'council')
      from added a
      returning details
    )
    select coalesce(jsonb_agg(distinct details->'rater'), '[]'::jsonb) into v_new from logged;

    update evaluation_targets t
    set members_eligible = (select count(*) from evaluation_electorate e
                            where e.target_id = t.id and e.part = 'members' and e.removed_at is null),
        council_eligible = (select count(*) from evaluation_electorate e
                            where e.target_id = t.id and e.part = 'council' and e.removed_at is null)
    where t.cycle_id = v_cycle.id and t.excluded is null;

    if jsonb_array_length(v_new) > 0 then
      perform notify_event('evaluation.opened', jsonb_build_object(
        'cycleId', v_cycle.id, 'closesAt', v_cycle.closes_at, 'lastDay', v_cycle.due_on + 3, 'raters', v_new), null);
    end if;
  end loop;
end;
$$;
