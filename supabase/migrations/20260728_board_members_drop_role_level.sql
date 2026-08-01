-- أهل الدفّة: إعدام `role_level` من مخرجات الدالّة
--
-- بقي العمود بعد 20260728_board_members_explicit_roles للتوافق وحده، ولا قارئ له:
-- الواجهة الوحيدة (BoardMembers.tsx → BoardCarousel) لا تعرف الحقل أصلًا.
-- بقاؤه رقمٌ يوحي برتبةٍ في نظامٍ صار قدراتيًّا بالكامل — والهُويّة لا العدد.
--
-- الترتيب لم يتغيّر: القائمة الصريحة هي مصدره، مطابقةً لـ ROLE_ORDER
-- في v2/apps/web/src/lib/roleOrder.ts (منقوصةً منها المستثنيات: عضوا
-- الموارد والضمان، والعضو العاديّ).
--
-- تغيير المخرجات يوجب drop + create، ولذلك تُعاد المنح صراحةً بعده.

drop function if exists public.get_board_members();

create function public.get_board_members()
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
  )
  select
    t.id, t.full_name, t.avatar_url, t.gender,
    t.role_name, t.twitter_account, t.linkedin_account
  from (
    -- صاحب أكثر من صفّ يظهر بأعلى مناصبه وحده
    select distinct on (p.id)
      p.id, p.full_name, p.avatar_url, p.gender,
      r.role_name_ar as role_name,
      b.ord,
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

grant execute on function public.get_board_members() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
