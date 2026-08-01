-- أهل الدفّة: قائمة مناصب صريحة بدل عتبة رقميّة
--
-- كان الاختيار عتبةً على سُلَّمٍ رقميّ مكتوبٍ مرّتين داخل الدالّة (rnk >= 2)،
-- فكان استثناء منصبٍ بعينه مستحيلًا إلا بتحريك السُّلَّم كلّه.
-- صار الاختيار قائمةً واحدة بأسماء المناصب، وترتيبُها هو ترتيب العرض.
--
-- الاستثناء المطلوب: عضو الموارد البشريّة وعضو الضمان والجودة
-- (hr_admin_member, qa_admin_member) لم يعودا من أهل الدفّة.
--
-- role_level باقٍ في المخرجات للتوافق فقط (لا قارئ له في الواجهة)،
-- ويُشتقّ من موضع المنصب في القائمة: الأعلى منصبًا = الرقم الأكبر.

create or replace function public.get_board_members()
returns table(
  id uuid,
  full_name text,
  avatar_url text,
  gender text,
  role_name text,
  role_level integer,
  twitter_account text,
  linkedin_account text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with board_roles as (
    select
      u.role_key,
      u.ord::int                                  as ord,
      (count(*) over () - u.ord + 1)::int         as lvl
    from unnest(array[
      'club_president',              -- رئيس نادي أدِيب
      'president_advisor',           -- مستشار رئيس النادي
      'executive_council_president', -- رئيس المجلس التنفيذي
      'hr_committee_leader',         -- قائد إدارة الموارد البشرية
      'qa_committee_leader',         -- قائد إدارة الضمان والجودة
      'department_head',             -- منسّق قسم
      'committee_leader',            -- قائد
      'activity_coordinator',        -- منسّق نشاط
      'deputy_committee_leader'      -- نائب
    ]) with ordinality as u(role_key, ord)
  )
  select
    t.id, t.full_name, t.avatar_url, t.gender,
    t.role_name, t.lvl as role_level,
    t.twitter_account, t.linkedin_account
  from (
    -- صاحب أكثر من صفّ يظهر بأعلى مناصبه وحده
    select distinct on (p.id)
      p.id, p.full_name, p.avatar_url, p.gender,
      r.role_name_ar as role_name,
      b.ord, b.lvl,
      md.twitter_account, md.linkedin_account
    from profiles p
    join user_roles ur on ur.user_id = p.id and ur.is_active = true
    join roles r       on r.id = ur.role_id
    join board_roles b on b.role_key = r.role_name
    left join member_details md on md.user_id = p.id
    where p.account_status = 'active'
    order by p.id, b.ord
  ) t
  order by t.ord, t.full_name;
$function$;
