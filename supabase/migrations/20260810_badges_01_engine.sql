-- ══════════════════════════════════════════════════════════════════════════════
-- **الأوسمة** — ما بلغَه العضوُ في أديب، يُرصَد آليًّا ويُعرَض في صفحته العلنيّة
--
-- المبدأ الحاكم: **الوسامُ حقيقةٌ تُرصَد لا زينةٌ تُوزَّع.** فلكلِّ وسامٍ تاريخُ استحقاقٍ
-- هو تاريخُ الواقعة نفسِها (يومُ حضورِه الفعاليّةَ الثالثة، لا يومُ تشغيلِنا المُزامِن)،
-- وسببٌ مكتوبٌ يُقرَأ.
--
-- والمبدأ الثاني: **تعريفُ الوسام بيانٌ لا كود.** فالعتبةُ في الصفّ، والمحرِّكُ واحد.
-- إضافةُ «حضر عشرًا» صفٌّ يُضاف. وحدَه **صنفٌ جديدٌ من القواعد** يحتاج فرعًا في
-- `badge_awards()`، وهذا صريحٌ لا مستور.
--
-- والثالث: **الوسامُ لا يُنزَع.** المُزامِنُ يُضيف ولا يحذف، فمن قاد وحدةً بقي قائدًا
-- في سجلّه وإن انتهت ولايتُه.
--
-- ولا وسامَ سلبيّ: الإنذاراتُ لا تدخل هذا الباب ولا تُعرَض في صفحةٍ علنيّة.
-- ══════════════════════════════════════════════════════════════════════════════


-- ═══ ١) الجدولان ══════════════════════════════════════════════════════════════

create table if not exists public.badges (
  id             uuid primary key default gen_random_uuid(),
  badge_key      text not null unique,
  name_ar        text not null check (btrim(name_ar) <> ''),
  -- «كيف يُنال» بعبارةٍ يفهمها غريبٌ في ثانيتين، فهي تُعرَض للزائر
  description_ar text not null check (btrim(description_ar) <> ''),
  icon           text not null,
  kind           text not null default 'computed' check (kind in ('computed', 'granted')),
  -- قاعدةُ الاحتساب: مفتاحٌ يعرفه المحرِّك، وعتبةٌ تأتي من الصفّ لا من الكود
  rule_key       text check (rule_key in ('tenure_days', 'events_attended', 'unit_leadership', 'election_candidacy')),
  threshold      integer check (threshold > 0),
  -- الطموحُ يُعرَض: الوسامُ الذي لم يُنَل بعدُ يُرى مقفلًا، فالمقفلُ يدفع والمخفيُّ لا
  show_locked    boolean not null default true,
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  -- المحتسَبُ لا بدّ له من قاعدةٍ وعتبة، والممنوحُ لا قاعدةَ له ولا عتبة
  constraint badges_rule_matches_kind check (
    (kind = 'computed' and rule_key is not null and threshold is not null) or
    (kind = 'granted'  and rule_key is null     and threshold is null)
  )
);

comment on table public.badges is
  'تعريفُ الأوسمة. وسامٌ جديدٌ على قاعدةٍ قائمة = صفٌّ يُضاف، لا كودٌ يُرصَّع.';

create table if not exists public.member_badges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  badge_id   uuid not null references public.badges(id)   on delete cascade,
  -- تاريخُ الواقعة لا تاريخُ الرصد. وهذا ما يجعل الوسامَ حقيقةً يمكن التحقّقُ منها
  earned_at  timestamptz not null,
  evidence   text,                                          -- سببٌ يُقرَأ: «حضر ثلاث فعاليّات»
  granted_by uuid references public.profiles(id),            -- للممنوح وحده (م٥)
  created_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

comment on table public.member_badges is
  'ما نالَه الأعضاء. المُزامِنُ يُضيف ولا يحذف: الوسامُ لا يُنزَع.';

create index if not exists member_badges_user_idx  on public.member_badges (user_id);
create index if not exists member_badges_badge_idx on public.member_badges (badge_id);


-- ═══ ٢) المحرِّكُ المُحتسِب ════════════════════════════════════════════════════
--
-- يقرأ صفوفَ `badges` ويقيس كلَّ قاعدةٍ بعتبتها. وكلُّ فرعٍ يُرجِع **تاريخَ الواقعة**.

create or replace function public.badge_awards()
returns table (user_id uuid, badge_id uuid, earned_at timestamptz, evidence text)
language sql
stable
security definer
set search_path = public
as $$
  -- ١) مدّةُ العضويّة: يُستحقّ يومَ اكتمالِ المدّة، لا يومَ رصدِنا له
  select p.id,
         b.id,
         (p.joined_date + make_interval(days => b.threshold))::timestamptz,
         'انضمّ إلى أديب في ' || to_char(p.joined_date, 'YYYY-MM-DD')
  from public.badges b
  join public.profiles p
    on p.joined_date is not null
   and p.joined_date + make_interval(days => b.threshold) <= current_date
  where b.is_active and b.kind = 'computed' and b.rule_key = 'tenure_days'

  union all

  -- ٢) الحضور: تاريخُ الاستحقاق هو حضورُ الفعاليّةِ رقمَ العتبة
  select a.uid,
         b.id,
         a.attended_at,
         'حضر ' || b.threshold::text || ' من فعاليّات أديب'
  from public.badges b
  join (
    select r.user_id as uid,
           r.attended_at,
           row_number() over (partition by r.user_id order by r.attended_at, r.id) as n
    from public.activity_reservations r
    where r.attendance_status = 'attended' and r.attended_at is not null
  ) a on a.n = b.threshold
  where b.is_active and b.kind = 'computed' and b.rule_key = 'events_attended'

  union all

  -- ٣) قيادةُ وحدة: كلُّ منصبٍ فريدِ الحامل قيادةٌ، والتعريفُ مكتوبٌ في القاعدة
  --    (`holder_uniqueness <> 'multi'`) فلا نُرصِّع قائمةَ أسماءٍ تشيخ مع الهيكلة.
  --    ولا يُشترَط أن يكون المنصبُ قائمًا: من قاد فقد قاد.
  select x.uid, b.id, x.first_at, 'تولّى منصب ' || x.title
  from public.badges b
  cross join lateral (
    select ur.user_id as uid,
           min(ur.assigned_at) as first_at,
           (array_agg(r.role_name_ar order by ur.assigned_at))[1] as title
    from public.user_roles ur
    join public.roles r on r.role_name = ur.role_name
    where r.holder_uniqueness is distinct from 'multi'
      and ur.assigned_at is not null
    group by ur.user_id
  ) x
  where b.is_active and b.kind = 'computed' and b.rule_key = 'unit_leadership'

  union all

  -- ٤) الترشُّح: المقبولُ وحدَه ترشُّح. والمرفوضُ لم يصر مرشَّحًا، والمنسحبُ كان مرشَّحًا فيُحتسَب
  select c.user_id, b.id, min(c.submitted_at), 'ترشّح لانتخابات أديب'
  from public.badges b
  join public.election_candidates c on c.status in ('approved', 'withdrawn') and c.submitted_at is not null
  where b.is_active and b.kind = 'computed' and b.rule_key = 'election_candidacy'
  group by c.user_id, b.id;
$$;

comment on function public.badge_awards() is
  'يحسب من يستحقّ ماذا ومتى. قراءةٌ محضة لا تكتب شيئًا.';


-- ═══ ٣) المُزامِن ═════════════════════════════════════════════════════════════

create or replace function public.sync_badges()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.member_badges (user_id, badge_id, earned_at, evidence)
  select a.user_id, a.badge_id, a.earned_at, a.evidence
  from public.badge_awards() a
  on conflict (user_id, badge_id) do nothing;

  get diagnostics n = row_count;
  return n;
end;
$$;

comment on function public.sync_badges() is
  'يرصد ما استُحقّ ولم يُسجَّل. يُضيف ولا يحذف: الوسامُ لا يُنزَع.';


-- ═══ ٤) حزمةُ الإطلاق ═════════════════════════════════════════════════════════
--
-- والنِّسَبُ من مئةٍ وسبعةٍ وثمانين عضوًا يومَ الكتابة. وقاعدةُ الندرة: لا وسامَ
-- يستحقُّه أكثرُ من سبعين بالمئة. ولذلك **لا وسامَ لمجرّد حَملِ منصب** (ستّةٌ وثمانون
-- بالمئة يحملونه) فذاك تعريفُ العضو لا وسامُه، ومكانُه ترويسةُ الصفحة.

insert into public.badges (badge_key, name_ar, description_ar, icon, rule_key, threshold, sort_order, show_locked)
values
  ('tenure_year',      'سنةٌ في أديب',  'أتمّ سنةً كاملةً في عضويّة النادي',        'CalendarCheck', 'tenure_days',       365, 10, true),
  ('unit_leader',      'قائدُ وحدة',    'تولّى قيادةَ لجنةٍ أو قسمٍ في أديب',        'Compass',       'unit_leadership',     1, 20, false),
  ('election_nominee', 'مرشَّح',         'ترشّح لانتخابات أديب ووافقت لجنةُ الانتخابات على ترشُّحه', 'Megaphone', 'election_candidacy', 1, 30, false),
  ('attendee_first',   'حاضرٌ أوّل',     'حضر أولى فعاليّاته مع أديب',               'Ticket',        'events_attended',     1, 40, true),
  ('attendee_three',   'مواظِب',         'حضر ثلاثًا من فعاليّات أديب',              'Repeat',        'events_attended',     3, 50, true),
  ('attendee_five',    'ملازِم',         'حضر خمسًا من فعاليّات أديب',               'Fire',          'events_attended',     5, 60, true)
on conflict (badge_key) do nothing;


-- ═══ ٥) الأقفال ═══════════════════════════════════════════════════════════════
--
-- الزائرُ لا يقرأ هذين الجدولين مباشرةً: بابُه `get_public_profile` وحدَه (م٢)،
-- وهو الذي يحرس قانونَ الخصوصيّة في موضعٍ واحد.

alter table public.badges        enable row level security;
alter table public.member_badges enable row level security;

drop policy if exists badges_read on public.badges;
create policy badges_read on public.badges
  for select to authenticated using (is_active);

drop policy if exists member_badges_read on public.member_badges;
create policy member_badges_read on public.member_badges
  for select to authenticated using (true);

revoke all on function public.badge_awards()  from public, anon, authenticated;
revoke all on function public.sync_badges()   from public, anon, authenticated;
grant execute on function public.sync_badges() to service_role;
