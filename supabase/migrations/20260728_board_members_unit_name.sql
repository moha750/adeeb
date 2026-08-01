-- أهل الدفّة: الوحدة تُذكر مع المنصب العامّ
--
-- «قائد» و«نائب» و«منسّق نشاط» و«منسّق قسم» أسماءٌ عامّة لا تُعرّف صاحبها:
-- سبع بطاقاتٍ تقول «قائد» ولا تقول قائدةَ أيّ لجنة. فتُرجع الدالّة اسم الوحدة
-- في عمودٍ مستقلّ `unit_name`، والبطاقة تدمجه في سطر المنصب («قائد لجنة التصميم»).
--
-- والدمجُ للعامّ وحده: «قائد إدارة الموارد البشرية» و«رئيس المجلس التنفيذي»
-- يُعرِّفان نفسيهما، ولجنتاهما (٢٢ و٢٣) اسمُهما «إدارة الموارد البشرية»
-- و«إدارة الضمان والجودة» — فإلحاقهما تكرارٌ. لذلك القائمة الواحدة نفسها
-- تسمّي **أيّ** المناصب يحتاج وحدته، فلا يُرصَّع استثناءٌ في الواجهة.
--
-- التركيب النصّيّ يبقى في الواجهة: القاعدة تُعطي القطعتين لا الجملة.
-- تغيير المخرجات يوجب drop + create، وتُعاد المنح بعده.

drop function if exists public.get_board_members();

create function public.get_board_members()
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
    select
      u.role_key,
      u.ord::int as ord,
      -- المناصب العامّة: اسمها لا يذكر وحدتها، فتُذكر معها
      u.role_key = any (array[
        'department_head',
        'committee_leader',
        'activity_coordinator',
        'deputy_committee_leader'
      ]) as with_unit
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
      case when b.with_unit then coalesce(c.committee_name_ar, d.name_ar) end as unit_name,
      b.ord,
      coalesce('c' || ur.committee_id::text, 'u' || p.id::text) as cluster,
      md.twitter_account, md.linkedin_account
    from profiles p
    join user_roles ur on ur.user_id = p.id and ur.is_active = true
    join roles r       on r.id = ur.role_id
    join board_roles b on b.role_key = r.role_name
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
