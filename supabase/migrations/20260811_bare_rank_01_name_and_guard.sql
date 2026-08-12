-- الرتبةُ عاريةٌ، والوحدةُ تقول نوعَها.
--
-- القصّة: رتبُ أديب كلمةٌ مجرّدة (قائد · نائب · عضو)، والوحدةُ تحمل نوعَها في اسمها
-- (لجنة التصميم · قسم الإنتاج الإعلامي). فإذا قيلتا معًا استقام الكلامُ بلا صنعة:
-- «قائد لجنة التصميم».
--
-- إلّا رتبةً واحدة كُتبت **«منسّق قسم»** (20260710_org_realign_phase1)، فحُشرت كلمةُ
-- «قسم» في الرتبة فصارت نصفَ جملةٍ لا رتبة. فخرجت مع وحدتها: «منسّق قسم **قسم**
-- الإنتاج الإعلامي».
--
-- وعولج العَرَض لا العلّة: عُلّم الواصلُ حيلةً عند الملتقى (إن كانت آخرُ كلمةٍ في الرتبة
-- هي أوّلَ كلمةٍ في الوحدة فاحذف إحداهما). فسترت العيبَ **حيث يمرّ أحدٌ على الواصل**،
-- وانكشف حيث لا يمرّ: جدولُ الانتخابات يُبرز الرتبة ثمّ يُتبعها وحدتَها، وكرتُ المنصب
-- يضع كلًّا في سطر — وكلاهما يضع القطعتين بيده فلا تعمل الحيلة. فعاد العيبُ كما كان.
--
-- والعلاج هنا: **يُصحَّح الاسم فتسقط الحاجة إلى الحيلة**، ولا يُحرَس ما لا وجود له.
--   «منسّق قسم» + «قسم الإنتاج الإعلامي»  ⇐ يحتاج حيلة
--   «منسّق»     + «قسم الإنتاج الإعلامي»  ⇐ «منسّق قسم الإنتاج الإعلامي» صحيحةً بذاتها
--
-- ولئلّا يعود أحدٌ فيحشو نوعَ وحدةٍ في رتبة، يمنعه **قيدٌ** لا وصيّة.

-- ١. الاسم يعود رتبةً مجرّدة كأخواته.
update public.roles set role_name_ar = 'منسّق' where role_name = 'department_head';

-- ٢. القيد: لا تبتلع الرتبةُ نوعَ وحدة. الوحدةُ عمودٌ آخر (`user_roles.committee_id`
--    و`department_id`) و«الوحدة الأمّ» عمودٌ ثالث (`roles.home_committee_id`) — فمن
--    كتبها في الاسم أنشأ مصدرًا رابعًا يكذب على الثلاثة.
--    (الكلمة كلمةً لا جزءًا من كلمة، فلا يُمنع اسمٌ فيه «المقسم» أو «الإدارية».)
alter table public.roles
  drop constraint if exists roles_rank_is_bare;
alter table public.roles
  add constraint roles_rank_is_bare
  check (role_name_ar !~ '(^|[[:space:]])(لجنة|قسم|إدارة)([[:space:]]|$)');

comment on constraint roles_rank_is_bare on public.roles is
  'الرتبةُ مجرّدةٌ من نوع الوحدة — الوحدةُ تُقال من عمودها لا من الاسم (20260811).';

-- ٣. سقطت الحيلة من التوأم: لم يبقَ اسمٌ يتلامس مع وحدته، والقيدُ يمنع عودتَه.
--    فمن كتب اسمًا معطوبًا بعد اليوم يُردّ عند الباب، ولا يُستَر في بعض الشاشات دون بعض.
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
  select nullif(btrim(
    -- roleTitle: الرتبة + وحدتها الأمّ
    btrim(coalesce(p_role_ar, '') || coalesce(' ' || nullif(btrim(coalesce(p_home_name, '')), ''), ''))
    -- assignmentScope: وحدة الإسناد، صامتةً إن كانت الأمّ نفسها
    || coalesce(' ' || nullif(btrim(coalesce(
         case when p_unit_id is not null and p_unit_id = p_home_id then null else p_unit_name end, '')), ''), '')
  ), '');
$function$;
