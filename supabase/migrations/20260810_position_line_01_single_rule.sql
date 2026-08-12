-- تسمية المنصب: قاعدةٌ واحدة في القاعدة، توأمُ `lib/positionLabel.ts` في الواجهة.
--
-- العلّة: جملةُ «الرتبة + الوحدة» كانت تُركَّب في خمسة أمكنة (نسختان في SQL ونسختان في
-- الواجهة إلى جانب المصدر الواحد)، وكلُّ نسخةٍ أسقطت قاعدة. فسقط دمجُ التماسّ من نسختَي
-- SQL («منسّق قسم قسم الإنتاج الإعلامي»)، وسقطت الوحدةُ كلُّها من دليل الوسام («تولّى
-- منصب قائد»).
--
-- والعلاج: **من يقرأ يأخذ القطعتين خامًا** فتُركَّب الجملة في `lib/positionLabel` وحدَه
-- (كما تفعل `get_public_profile` — وهي السابقة الصحيحة). ولا يبقى في SQL إلّا **من يكتب
-- لقطةً** لا مقرأ لها: دليلُ الوسام، وبديلُ الشهادة حين لا يُرسِل المُصدِر مسمّى. فلهذين
-- وحدهما هذه الدالّة، وهي **ترجمةٌ حرفيّة** لقواعد الملفّ الثلاث:
--
--   الاسم  = الرتبة + الوحدة الأمّ (إن وُجدت)                     ← roleTitle
--   الوحدة = وحدة الإسناد، وتُسكت إن كانت الأمّ نفسها              ← assignmentScope
--   الوصل  = مسافةٌ لا فاصل، وتُحذف كلمةُ التماسّ إن تكرّرت        ← positionLine
--
-- من غيّر قاعدةً هنا غيّرها هناك — والملفّان يتناديان بالاسم.

create or replace function public.position_line(
  p_role_ar   text,
  p_home_id   integer,
  p_home_name text,
  p_unit_id   integer,
  p_unit_name text
) returns text
language sql
immutable
set search_path to 'public', 'pg_temp'
as $function$
  with parts as (
    select
      -- roleTitle: الرتبة + وحدتها الأمّ
      btrim(coalesce(p_role_ar, '') || coalesce(' ' || nullif(btrim(coalesce(p_home_name, '')), ''), '')) as title,
      -- assignmentScope: وحدة الإسناد، صامتةً إن كانت الأمّ نفسها
      coalesce(nullif(btrim(coalesce(
        case when p_unit_id is not null and p_unit_id = p_home_id then null else p_unit_name end, '')), ''), '') as scope
  ),
  seam as (
    -- كلمةُ التماسّ: آخرُ كلمةٍ في الاسم («منسّق قسم» ← «قسم»)
    select title, scope, coalesce((regexp_match(title, '(\S+)\s*$'))[1], '') as word from parts
  )
  select nullif(btrim(
    title || case
      when scope = '' then ''
      -- لا تُكرَّر كلمةُ النوع عند الوصل: «منسّق قسم» + «قسم الإنتاج» ← «منسّق قسم الإنتاج»
      when word <> '' and left(scope, length(word) + 1) = word || ' '
        then ' ' || btrim(substr(scope, length(word) + 2))
      else ' ' || scope
    end
  ), '');
$function$;

comment on function public.position_line(text, integer, text, integer, text) is
  'توأمُ lib/positionLabel.ts في SQL — لكاتبي اللقطات وحدهم (دليل الوسام وبديل الشهادة). من يقرأ يأخذ القطعتين خامًا.';


-- ١. مسمّى العضو كما تُقترحه الشهادة، وكما تكتبه حين لا يُرسِل المُصدِر مسمّى.
--    كان يحفر الجملة بنفسه فيسقط دمجُ التماسّ؛ صار ينادي القاعدة الواحدة.
create or replace function public.position_title_of(p_user uuid)
 returns text
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with seats as (
    select
      ur.is_active,
      ur.assigned_at,
      public.position_line(
        r.role_name_ar,
        r.home_committee_id,
        home.committee_name_ar,
        ur.committee_id,
        coalesce(unit.committee_name_ar, dept.name_ar)
      ) as title
    from user_roles ur
    join roles r on r.role_name = ur.role_name
    left join committees  home on home.id = r.home_committee_id
    left join committees  unit on unit.id = ur.committee_id
    left join departments dept on dept.id = ur.department_id
    where ur.user_id = p_user
  )
  select coalesce(
    (select string_agg(title, ' و' order by assigned_at) from seats where is_active and title is not null),
    (select title from seats where title is not null order by assigned_at desc limit 1)
  );
$function$;


-- ٢. دليلُ وسام «تولّى منصبًا» — كان يكتب الرتبة عاريةً («تولّى منصب قائد») لأنّه قرأ
--    `role_name_ar` وحده ولم يعرف وحدةَ المقعد. صار يكتب المسمّى كاملًا بالقاعدة نفسها.
create or replace function public.badge_awards()
 returns table(user_id uuid, badge_id uuid, earned_at timestamp with time zone, evidence text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
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
    -- أوّلُ مقعدٍ مفردٍ تولّاه: صفُّه بعينه لا رتبتُه وحدها، فمنه تُعرف وحدتُه
    select distinct on (ur.user_id)
      ur.user_id as uid,
      ur.assigned_at as first_at,
      public.position_line(
        r.role_name_ar,
        r.home_committee_id,
        home.committee_name_ar,
        ur.committee_id,
        coalesce(c.committee_name_ar, d.name_ar)
      ) as title
    from public.user_roles ur
    join public.roles r on r.role_name = ur.role_name
    left join public.committees  home on home.id = r.home_committee_id
    left join public.committees  c    on c.id = ur.committee_id
    left join public.departments d    on d.id = ur.department_id
    where r.holder_uniqueness is distinct from 'multi' and ur.assigned_at is not null
    order by ur.user_id, ur.assigned_at
  ) x
  where b.is_active and b.kind = 'computed' and b.rule_key = 'unit_leadership'
    and x.title is not null
  union all
  select c.user_id, b.id, min(c.submitted_at), 'ترشّح لانتخابات أديب'
  from public.badges b
  join public.election_candidates c on c.status in ('approved','withdrawn') and c.submitted_at is not null
  where b.is_active and b.kind = 'computed' and b.rule_key = 'election_candidacy'
  group by c.user_id, b.id;
$function$;


-- ٣. الأوسمة الممنوحة **لقطةٌ محفوظة**: إصلاح الحاسبة لا يمسّ ما كُتب. فتُعاد كتابةُ
--    الأدلّة القائمة من الحاسبة نفسها — تُصحَّح «تولّى منصب قائد» ولا يُمسّ تاريخُ النيل.
update public.member_badges mb
   set evidence = a.evidence
  from public.badge_awards() a
 where a.user_id = mb.user_id
   and a.badge_id = mb.badge_id
   and mb.evidence is distinct from a.evidence;
