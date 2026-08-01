-- الوحدة الأمّ للدور — إنهاء تكرار «قائد إدارة الضمان والجودة · إدارة الضمان والجودة»
--
-- ═══ العلّة ═══
--
-- كلّ دورٍ إداريّ ينتمي إلى وحدةٍ أمّ (قائد الضمان وعضوُه ينتميان لإدارة الضمان، ٢٣).
-- وهذه المعلومة **لم تكن مكتوبة في القاعدة**، فحُشرت داخل نصّ `role_name_ar`:
-- «قائد إدارة الضمان والجودة». ونتج عن ذلك ثلاث علل:
--
-- ١) تكرارٌ في العرض: الواجهة تُلحق وحدة الإسناد باسم المنصب، ووحدةُ إسناد القائد
--    هي إدارتُه نفسها — فيُقال الاسم مرّتين.
-- ٢) نصٌّ يبطل صامتًا: إعادة تسمية اللجنة ٢٣ تترك اسم الدور يقول الاسم القديم.
-- ٣) قوائم محفورة: `get_board_members` اضطُرّت إلى قائمة بيضاء (`with_unit`) تسمّي
--    أيّ الأدوار يحتاج وحدته — قائمةٌ تُنسى عند إضافة دور.
--
-- ═══ العلاج ═══
--
-- تُكتب المعلومة الناقصة في عمودٍ واحد، ويُنظَّف النصّ الذي كان ينوب عنها. فتصير
-- قاعدة العرض **مقارنةَ معرّفَين** لا استنتاجًا ولا قائمة:
--
--   الاسم  = الرتبة + الوحدة الأمّ (إن وُجدت)
--   الوحدة = وحدة الإسناد، **تُسكت إن كانت الأمّ نفسها**
--
-- فيخرج: «قائد إدارة الضمان والجودة» (أمُّه = إسنادُه)،
--        «عضو إدارة الضمان والجودة · لجنة الإعلام» (يشرف على لجنةٍ ليست أمَّه)،
--        «قائد · لجنة الإعلام» (لا أمّ له).
--
-- ═══ الاستثناء المسمّى ═══
--
-- رئيس نادي أدِيب · رئيس المجلس التنفيذيّ · مستشار رئيس النادي: تبقى بأسمائها
-- الكاملة. أسماؤها لا تشير إلى صفّ لجنةٍ في القاعدة (النادي والمجلس ليسا لجنتين)،
-- فلا تكرارَ فيها ولا نصَّ يبطل بإعادة تسمية.
--
-- ═══ المفتاح الأجنبيّ — الفحص الواجب (درس 20260715_committees_roles_guard_trigger) ═══
--
-- roles→committees مفتاحٌ **أوّل** لا ثانٍ: العلاقة بين الجدولين خاليةٌ اليوم
-- (مفتاحا committees→roles أُسقطا واستُبدلا بتريغر). وفُحص كلّ قارئٍ حيّ:
-- لا `select('*, committees(...)')` من roles ولا العكس في المستودع كلّه —
-- التضمينات كلّها `roles(...)` من user_roles، ومسارُها مفردٌ لم يمسسه هذا المفتاح.

alter table public.roles
  add column if not exists home_committee_id integer references public.committees(id);

comment on column public.roles.home_committee_id is
  'الوحدة الأمّ للدور (اللجنة/الإدارة التي ينتمي إليها شاغلُه). تُركَّب مع role_name_ar في العرض، وتُسكِت وحدة الإسناد إن طابقتها. فارغة لمن لا أمَّ له: أدوار المجالس العليا وأدوار اللجان التنفيذيّة العامّة.';

-- الوحدة الأمّ: إدارة الموارد البشريّة (٢٢) وإدارة الضمان والجودة (٢٣)
update public.roles set home_committee_id = 22 where role_name in ('hr_committee_leader', 'hr_admin_member');
update public.roles set home_committee_id = 23 where role_name in ('qa_committee_leader', 'qa_admin_member');

-- تنظيف النصّ: الاسم يقول الرتبة، والرابط يقول الوحدة
update public.roles set role_name_ar = 'قائد' where role_name in ('hr_committee_leader', 'qa_committee_leader');
update public.roles set role_name_ar = 'عضو'  where role_name in ('hr_admin_member', 'qa_admin_member');

-- ═══ أهل الدفّة: القائمة البيضاء تُستبدل بالقاعدة ═══
-- تغيير المخرجات لا يوجب drop هنا (الأعمدة كما هي)، لكنّ الجسم يُعاد كاملًا.

create or replace function public.get_board_members()
returns table(
  id uuid,
  full_name text,
  avatar_url text,
  gender text,
  role_name text,
  unit_name text,
  twitter_account text,
  linkedin_account text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with board_roles as (
    select u.role_key, u.ord::int as ord
    from unnest(array[
      'club_president',              -- رئيس نادي أدِيب
      'president_advisor',           -- مستشار رئيس النادي
      'executive_council_president', -- رئيس المجلس التنفيذي
      'hr_committee_leader',         -- قائد + إدارة الموارد البشرية
      'qa_committee_leader',         -- قائد + إدارة الضمان والجودة
      'department_head',             -- منسّق قسم
      'committee_leader',            -- قائد
      'activity_coordinator',        -- منسّق نشاط
      'deputy_committee_leader'      -- نائب
    ]) with ordinality as u(role_key, ord)
  ),
  picked as (
    -- صاحب أكثر من صفّ يظهر بأعلى مناصبه وحده
    select distinct on (p.id)
      p.id, p.full_name, p.avatar_url, p.gender,
      -- الاسم = الرتبة + الوحدة الأمّ إن وُجدت
      r.role_name_ar || coalesce(' ' || hc.committee_name_ar, '') as role_name,
      -- الوحدة تُسكت حين تكون الأمّ نفسها، وتُقال فيما عداه
      case when ur.committee_id is not null and ur.committee_id = r.home_committee_id then null
           else coalesce(c.committee_name_ar, d.name_ar) end as unit_name,
      b.ord,
      coalesce('c' || ur.committee_id::text, 'u' || p.id::text) as cluster,
      md.twitter_account, md.linkedin_account
    from profiles p
    join user_roles ur on ur.user_id = p.id and ur.is_active = true
    join roles r       on r.id = ur.role_id
    join board_roles b on b.role_key = r.role_name
    left join committees  hc on hc.id = r.home_committee_id
    left join committees  c  on c.id  = ur.committee_id
    left join departments d  on d.id  = ur.department_id
    left join member_details md on md.user_id = p.id
    where p.account_status = 'active'
    order by p.id, b.ord, ur.committee_id
  ),
  clustered as (
    -- عنقود اللجنة: النائب يتلو قائده (20260728_board_members_pair_deputy_after_leader)
    select
      k.*,
      min(k.ord)          over (partition by k.cluster)                                as cluster_ord,
      first_value(k.full_name) over (partition by k.cluster order by k.ord, k.full_name) as cluster_lead
    from picked k
  )
  select
    c.id, c.full_name, c.avatar_url, c.gender,
    c.role_name, c.unit_name, c.twitter_account, c.linkedin_account
  from clustered c
  order by c.cluster_ord, c.cluster_lead, c.ord, c.full_name;
$function$;

grant execute on function public.get_board_members() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
