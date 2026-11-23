-- توحيد مسمّيات المناصب (1 من 2): التوأمُ في القاعدة — آمنٌ مع الكود الحيّ القديم (2026-11-23)
--
-- قرار محمد (وثيقة المشروع titles-unification.md): يرى الشخصُ مسمّاه واحدًا في كلّ مكان، مؤنَّثًا للمرأة
-- إلّا «عضو»، و«نائب لجنة …» لا «نائب قائد لجنة …».
--
-- هذا الترحيلُ لا يمسّ `roles.role_name_ar`: الكودُ الحيّ يُلحق اسمَ الوحدة بالرتبة، فلو صارت الرتبةُ
-- «مشرف الموارد البشرية» قبل رفع الكود الجديد لقرأ الناسُ «مشرف الموارد البشرية إدارة الموارد البشرية».
-- فالرتبُ الجديدةُ في الترحيل الثاني (titles_02)، يُطبَّق بعد الرفع. وما هنا يصلح للحالين:
--   · `rank_for` و`position_title` توأما `rankFor` و`positionLine`/`personTitle` في
--     `packages/core/src/positionLabel.ts`: الرتبةُ المجرّدة (كلمة) تُلحق بها الوحدة، والمسمّى التامّ
--     (أكثرُ من كلمة) يُقال وحدَه، وكلُّه بجنس صاحبه إلّا «عضو».
--   · `position_title_of` (الشهادة، التقييم) و`badge_awards` و`_election_target_label` ورسائلُ
--     `assign_position` و`_run_position_batch` تقرأ المسمّى من التوأم لا من وصلٍ يدويّ.
--   · الشهاداتُ الصادرة وأدلّةُ الأوسمة المحفوظة تُعاد تسميتُها بالصيغة الجديدة، ويشهد بذلك `activity_log`.

-- ═══ (1) التوأمان ═══

create or replace function public.rank_for(p_title text, p_gender text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- توأمُ `rankFor`: المسمّى المعرَّف يُؤنَّث كلُّه، وغيرُه أوّلُ كلمته؛ و«عضو» للجنسين، والمجهولُ مذكّر.
  select case
    when p_title is null or p_gender is distinct from 'female' then p_title
    when p_title = 'الرئيس التنفيذي' or p_title like 'الرئيس التنفيذي %'
      then 'الرئيسة التنفيذية' || substr(p_title, char_length('الرئيس التنفيذي') + 1)
    when p_title = 'الرئيس التنفيذيّ' or p_title like 'الرئيس التنفيذيّ %'
      then 'الرئيسة التنفيذيّة' || substr(p_title, char_length('الرئيس التنفيذيّ') + 1)
    else coalesce(
      case split_part(p_title, ' ', 1)
        when 'قائد' then 'قائدة' when 'نائب' then 'نائبة'
        when 'منسّق' then 'منسّقة' when 'منسق' then 'منسقة'
        when 'رئيس' then 'رئيسة' when 'مشرف' then 'مشرفة'
      end || substr(p_title, char_length(split_part(p_title, ' ', 1)) + 1),
      p_title)
  end;
$$;

comment on function public.rank_for(text, text) is
  'توأم rankFor في packages/core/src/positionLabel.ts: من زاد رتبةً في أحدهما زادها في الآخر.';

create or replace function public.position_title(p_rank text, p_unit text, p_gender text, p_acting boolean default false)
returns text
language sql
immutable
set search_path = ''
as $$
  -- توأمُ `personTitle`: الرتبةُ بجنس صاحبها، ثمّ الوحدةُ إن كانت الرتبةُ مجرّدة، ثمّ «تكليفًا».
  select nullif(btrim(concat_ws(' ',
           nullif(public.rank_for(btrim(coalesce(p_rank, '')), p_gender), ''),
           case when btrim(coalesce(p_rank, '')) ~ '\s' then null else nullif(btrim(coalesce(p_unit, '')), '') end
         )), '')
         || case when p_acting then ' تكليفًا' else '' end;
$$;

comment on function public.position_title(text, text, text, boolean) is
  'توأم positionLine/personTitle: الرتبة المجرّدة تُلحق بها الوحدة، والمسمّى التامّ (أكثر من كلمة) يُقال وحده، بجنس صاحبه.';

-- ═══ (2) مسمّى الشخص في القاعدة: بجنسه ═══

create or replace function public.position_title_of(p_user uuid)
returns text
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  with seats as (
    select
      (ur.is_active or ur.frozen_by is not null) as live,
      ur.is_acting,
      ur.assigned_at,
      -- من التوأم لا وصلًا يدويًّا: بجنس صاحبه، والمسمّى التامّ بلا وحدة (توحيد المسمّيات 2026-11-23)
      public.position_title(r.role_name_ar, coalesce(unit.committee_name_ar, dept.name_ar), pf.gender, ur.is_acting) as title
    from user_roles ur
    join roles r on r.role_name = ur.role_name
    left join profiles    pf   on pf.id = ur.user_id
    left join committees  unit on unit.id = ur.committee_id
    left join departments dept on dept.id = ur.department_id
    where ur.user_id = p_user
  )
  select coalesce(
    (select string_agg(title, ' و' order by is_acting, assigned_at) from seats where live and title is not null),
    (select title from seats where title is not null and not is_acting order by assigned_at desc limit 1)
  );
$function$;

-- ═══ (3) وسامُ القيادة: «تولّى منصب …» و«تولّت منصب قائدة …» ═══

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
  select x.uid, b.id, x.first_at,
         case when x.gender = 'female' then 'تولّت منصب ' else 'تولّى منصب ' end || x.title
  from public.badges b
  cross join lateral (
    select distinct on (ur.user_id)
      ur.user_id as uid,
      ur.assigned_at as first_at,
      pf.gender,
      public.position_title(r.role_name_ar, coalesce(c.committee_name_ar, d.name_ar), pf.gender, ur.is_acting) as title
    from public.user_roles ur
    join public.roles r on r.role_name = ur.role_name
    left join public.profiles    pf on pf.id = ur.user_id
    left join public.committees  c on c.id = ur.committee_id
    left join public.departments d on d.id = ur.department_id
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

-- ═══ (4) اسمُ مقعد الانتخاب: من الكتالوج ═══
-- كان محفورًا: «نائب قائد لجنة» (القرار: «نائب لجنة»)، و«منسّق قسم» يُلحق به اسمُ قسمٍ يبدأ بـ«قسم»
-- فيُقرأ «منسّق قسم قسم الإنتاج الإعلامي». فصار من `roles.role_name_ar` والتوأم، كسائر المسمّيات.

create or replace function public._election_target_label(p_election_id uuid)
returns text
language sql
stable
set search_path to 'public'
as $function$
  select coalesce((
    select public.position_title(
             coalesce(r.role_name_ar, e.target_role_name),
             coalesce(c.committee_name_ar, d.name_ar),
             null)
    from elections e
    left join roles       r on r.role_name = e.target_role_name
    left join committees  c on c.id = e.target_committee_id
    left join departments d on d.id = e.target_department_id
    where e.id = p_election_id), '');
$function$;

-- ═══ (5) رسائلُ الإسناد والدفعات: المسمّى من التوأم ═══
-- تُعدَّل على تعريفها الحيّ نفسِه (لا نسخةٍ في المستودع قد تكون شاخت)، وكلُّ استبدالٍ يجب أن يقع
-- مرّةً بعينها وإلّا توقّف الترحيلُ كلُّه.

do $mig$
declare
  v_def text;
  v_new text;
  n int;
begin
  -- assign_position: «هذا العضو يشغل «…»» بجنس صاحبه، وسطرُ «نُقل من» بلا شرطةٍ طويلة
  select pg_get_functiondef('public.assign_position(uuid,uuid,text,integer,integer,boolean,text,boolean)'::regprocedure) into v_def;

  v_new := replace(v_def,
    $o$coalesce(r.role_name_ar, ur.role_name) || coalesce(' ' || c.committee_name_ar, ' ' || d.name_ar, ''),$o$,
    $n$public.position_title(coalesce(r.role_name_ar, ur.role_name), coalesce(c.committee_name_ar, d.name_ar), (select pf.gender from profiles pf where pf.id = ur.user_id)),$n$);
  if v_new = v_def then raise exception 'assign_position: لم يقع استبدالُ مسمّى المقعد المشغول'; end if;
  v_def := v_new;

  v_new := regexp_replace(v_def,
    $o$coalesce\(r\.role_name_ar, vac\.role_name\)\s*\|\| coalesce\(' — ' \|\| c\.committee_name_ar, ' — ' \|\| d\.name_ar, ''\)$o$,
    $n$public.position_title(coalesce(r.role_name_ar, vac.role_name), coalesce(c.committee_name_ar, d.name_ar), (select pf.gender from profiles pf where pf.id = p_user))$n$);
  if v_new = v_def then raise exception 'assign_position: لم يقع استبدالُ سطر «نُقل من»'; end if;
  execute v_new;

  -- _run_position_batch: ثلاثةُ مواضع — مقعدٌ مكرَّر، ومقعدٌ مشغولٌ خارج الدفعة (اسمُ مقعد)، وصاحبُ مقعدٍ لا تطوله اليد (بجنسه)
  select pg_get_functiondef('public._run_position_batch(uuid,jsonb,bigint)'::regprocedure) into v_def;

  select count(*) into n from regexp_matches(v_def,
    $o$coalesce\(r\.role_name_ar, b\.r\) \|\| coalesce\(' ' \|\| c\.committee_name_ar, ' ' \|\| d\.name_ar, ''\)$o$, 'g');
  if n <> 2 then raise exception '_run_position_batch: ينتظر موضعين لاسم المقعد، ووجد %', n; end if;
  v_def := regexp_replace(v_def,
    $o$coalesce\(r\.role_name_ar, b\.r\) \|\| coalesce\(' ' \|\| c\.committee_name_ar, ' ' \|\| d\.name_ar, ''\)$o$,
    $n$public.position_title(coalesce(r.role_name_ar, b.r), coalesce(c.committee_name_ar, d.name_ar), null)$n$, 'g');

  v_new := replace(v_def,
    $o$coalesce(rl.role_name_ar, ur.role_name) || coalesce(' ' || c.committee_name_ar, ' ' || d.name_ar, '') as label,$o$,
    $n$public.position_title(coalesce(rl.role_name_ar, ur.role_name), coalesce(c.committee_name_ar, d.name_ar), (select pf.gender from profiles pf where pf.id = ur.user_id)) as label,$n$);
  if v_new = v_def then raise exception '_run_position_batch: لم يقع استبدالُ مسمّى صاحب المقعد'; end if;
  execute v_new;
end
$mig$;

-- ═══ (6) أوصافُ المقاعد ═══

update roles set description = case role_name
  when 'hr_admin_member'         then 'مشرف الموارد البشرية: عضوٌ في إدارة الموارد البشرية يتابع ما يُسنَد إليه الإشرافُ عليه من اللجان، ومسمّاه واحدٌ مهما كان عددها'
  when 'qa_admin_member'         then 'مشرف الضمان والجودة: عضوٌ في إدارة الضمان والجودة يتابع جودة العمل فيما يُسنَد إليه الإشرافُ عليه من اللجان'
  when 'exec_admin_member'       then 'عضو تنفيذي: ذراعُ الرئيس التنفيذي في أعماله، بلا سلطةٍ على الأشخاص'
  when 'department_head'         then 'منسّق القسم: يدير قسمه الذي يضمّ عدّة لجان'
  when 'committee_leader'        then 'قائد اللجنة: يدير لجنته'
  when 'deputy_committee_leader' then 'نائب اللجنة: يعمل مع قائدها، ويقوم مقامه في غيابه'
  when 'club_president'          then 'رئيس أدِيب: أعلى منصبٍ في النادي'
  else description end
where role_name in ('hr_admin_member','qa_admin_member','exec_admin_member','department_head',
                    'committee_leader','deputy_committee_leader','club_president');

-- ═══ (7) المسمّى المحفوظ: الشهاداتُ الصادرة وأدلّةُ الأوسمة ═══
-- `_retitle` يحوّل نصًّا محفوظًا بالصيغة القديمة إلى الجديدة: المقاعدُ الثلاثةُ بأسمائها التامّة، و«نائب لجنة»،
-- و«رئيس أدِيب»، ثمّ التأنيثُ أوّلَ كلّ مسمّى (والمسمّياتُ المتعدّدةُ موصولةٌ بـ« و»). ويعود في الترحيل الثاني
-- ليلحق بما صدر بين الترحيلين.

create or replace function public._retitle(p_title text, p_gender text)
returns text
language sql
immutable
set search_path = ''
as $$
  select string_agg(public.rank_for(seg, p_gender), ' و' order by ord)
  from regexp_split_to_table(
         regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(p_title,
           '(^| و)عضو إدارة الموارد البشرية', '\1مشرف الموارد البشرية', 'g'),
           '(^| و)عضو إدارة الضمان والجودة',   '\1مشرف الضمان والجودة', 'g'),
           '(^| و)عضو الإدارة التنفيذية',       '\1عضو تنفيذي', 'g'),
           'نائب قائد لجنة',                    'نائب لجنة', 'g'),
           'رئيس نادي أدِيب',                   'رئيس أدِيب', 'g'),
         ' و') with ordinality as t(seg, ord);
$$;

with changed as (
  update experience_certificates c
     set position_title = public._retitle(c.position_title, p.gender)
    from profiles p
   where p.id = c.user_id
     and public._retitle(c.position_title, p.gender) is distinct from c.position_title
  returning c.id, c.user_id, c.serial, c.position_title
)
insert into activity_log (user_id, action_type, target_type, target_id, details)
select null, 'retitle_certificate', 'profile', ch.user_id::text,
       jsonb_build_object('certificate_id', ch.id, 'serial', ch.serial, 'position', ch.position_title,
                          'why', 'توحيد مسمّيات المناصب (2026-11-23): الشهادةُ تحمل المسمّى بصيغته الجديدة')
from changed ch;

update member_badges mb
   set evidence = case when p.gender = 'female' then 'تولّت منصب ' else 'تولّى منصب ' end
                  || public._retitle(substr(mb.evidence, char_length('تولّى منصب ') + 1), p.gender)
  from profiles p
 where p.id = mb.user_id
   and mb.evidence like 'تولّى منصب %'
   and mb.evidence <> 'تولّى منصب أَدِيب';
