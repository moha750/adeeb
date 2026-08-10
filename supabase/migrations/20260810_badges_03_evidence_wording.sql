-- ══════════════════════════════════════════════════════════════════════════════
-- سببُ وسام الحضور يُؤخَذ من وصف الوسام نفسِه
--
-- كان يُركَّب في الكود: `'حضر ' || threshold || ' من فعاليّات أديب'`، فيخرج «حضر 1 من
-- فعاليّات أديب» وليست عربيّة. والوصفُ مكتوبٌ في الصفّ بعبارةٍ صحيحة («حضر أولى
-- فعاليّاته مع أديب»)، فهو أولى. وهذا هو المبدأ نفسُه: **العبارةُ بيانٌ لا كود.**
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.badge_awards()
returns table (user_id uuid, badge_id uuid, earned_at timestamptz, evidence text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, b.id,
         (p.joined_date + make_interval(days => b.threshold))::timestamptz,
         'انضمّ إلى أديب في ' || to_char(p.joined_date, 'YYYY-MM-DD')
  from public.badges b
  join public.profiles p
    on p.joined_date is not null
   and p.joined_date + make_interval(days => b.threshold) <= current_date
  where b.is_active and b.kind = 'computed' and b.rule_key = 'tenure_days'

  union all

  select a.uid, b.id, a.attended_at, b.description_ar
  from public.badges b
  join (
    select r.user_id as uid, r.attended_at,
           row_number() over (partition by r.user_id order by r.attended_at, r.id) as n
    from public.activity_reservations r
    where r.attendance_status = 'attended' and r.attended_at is not null
  ) a on a.n = b.threshold
  where b.is_active and b.kind = 'computed' and b.rule_key = 'events_attended'

  union all

  select x.uid, b.id, x.first_at, 'تولّى منصب ' || x.title
  from public.badges b
  cross join lateral (
    select ur.user_id as uid, min(ur.assigned_at) as first_at,
           (array_agg(r.role_name_ar order by ur.assigned_at))[1] as title
    from public.user_roles ur
    join public.roles r on r.role_name = ur.role_name
    where r.holder_uniqueness is distinct from 'multi' and ur.assigned_at is not null
    group by ur.user_id
  ) x
  where b.is_active and b.kind = 'computed' and b.rule_key = 'unit_leadership'

  union all

  select c.user_id, b.id, min(c.submitted_at), 'ترشّح لانتخابات أديب'
  from public.badges b
  join public.election_candidates c on c.status in ('approved', 'withdrawn') and c.submitted_at is not null
  where b.is_active and b.kind = 'computed' and b.rule_key = 'election_candidacy'
  group by c.user_id, b.id;
$$;

update public.member_badges mb
set evidence = b.description_ar
from public.badges b
where b.id = mb.badge_id and b.rule_key = 'events_attended';
