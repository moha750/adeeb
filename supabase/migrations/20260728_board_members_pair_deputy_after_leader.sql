-- أهل الدفّة: النائب يتلو قائده
--
-- كان الفرزُ بالمنصب ثمّ بالاسم، فيصطفّ القادةُ السبعة ثمّ يأتي النائب آخرَ الصفّ
-- منقطعًا عن لجنته. الرابط بينهما قائمٌ في القاعدة أصلًا: `user_roles.committee_id`.
--
-- فصار الفرز على **عنقود اللجنة** لا على المنصب وحده: كلّ لجنةٍ عنقودٌ واحد،
-- موضعُه في الصفّ موضعُ أرفع أهله (القائد)، وداخله المنصبُ هو الترتيب.
-- من لا لجنة له (رئيس النادي، رئيس المجلس) عنقودُ نفسه، فموضعه لا يتغيّر.
--
-- عامّة لا خاصّة بالنائب: «منسّق نشاط» حين يوجد يلتحق بعنقود لجنته كذلك،
-- ولو خلا مقعدُ القائد فالعنقود يسقط إلى موضع أرفع الباقين فيه.

create or replace function public.get_board_members()
returns table(
  id uuid,
  full_name text,
  avatar_url text,
  gender text,
  role_name text,
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
      'hr_committee_leader',         -- قائد إدارة الموارد البشرية
      'qa_committee_leader',         -- قائد إدارة الضمان والجودة
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
      r.role_name_ar as role_name,
      b.ord,
      coalesce('c' || ur.committee_id::text, 'u' || p.id::text) as cluster,
      md.twitter_account, md.linkedin_account
    from profiles p
    join user_roles ur on ur.user_id = p.id and ur.is_active = true
    join roles r       on r.id = ur.role_id
    join board_roles b on b.role_key = r.role_name
    left join member_details md on md.user_id = p.id
    where p.account_status = 'active'
    order by p.id, b.ord, ur.committee_id
  ),
  clustered as (
    select
      k.*,
      min(k.ord)          over (partition by k.cluster)                                as cluster_ord,
      first_value(k.full_name) over (partition by k.cluster order by k.ord, k.full_name) as cluster_lead
    from picked k
  )
  select
    c.id, c.full_name, c.avatar_url, c.gender,
    c.role_name, c.twitter_account, c.linkedin_account
  from clustered c
  order by c.cluster_ord, c.cluster_lead, c.ord, c.full_name;
$function$;
