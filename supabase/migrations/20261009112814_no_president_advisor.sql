-- لا مستشارَ للرئيس بعد اليوم (قرار المالك ٢٠٢٦-١٠-٠٩: «فمن اليوم وصاعدًا لا مستشار رئيس»)
--
-- يُزال المنصبُ من جذره لا يُعطَّل: صفُّه في `roles`، وقدراتُه، وذكرُه في جدولَي السلطة،
-- وكلُّ دالّةٍ وسياسةٍ تسمّيه بالاسم. ولم يكن له شاغلٌ حقيقيّ، بل مقعدُ تجربةٍ واحد لأبواب الخروج
-- («تجربة مستشار الرئيس»، `tadvisor@adeeb.club`، ٢٠٢٦-٠٨-٢٠)، فيُمحى الحسابُ معه بوصفة الحسابات
-- التجريبيّة نفسها: السجلُّ والرموز يدويًّا (لا مفتاحَ لهما)، ثمّ الملفُّ، ثمّ مستخدمُ المصادقة.
--
-- وما يبقى بعده: ترحيلاتُ ما مضى كما طُبّقت، فهي سجلُّ ما كان لا وصفُ ما هو كائن.

-- (١) الحسابُ التجريبيّ وما علق به
do $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = 'tadvisor@adeeb.club';
  if v_id is null then
    return;
  end if;

  delete from public.activity_log where user_id = v_id or target_id = v_id::text;
  -- زيارةُ زاحفٍ واحدة لصفحته العلنيّة: عنوانُها اسمُه
  delete from public.site_pageviews where page_title = 'تجربة مستشار الرئيس، أديب';
  -- الملفُّ يجرّ معه مقعدَه (`user_roles`) وأرشيفَه (`member_details`) وطلبَ خروجه بمفاتيح CASCADE
  delete from public.profiles where id = v_id;
  delete from auth.refresh_tokens where user_id = v_id::text;
  delete from auth.users where id = v_id;
end $$;

-- (٢) المنصبُ وما بُني عليه
delete from public.role_permissions where role_name = 'president_advisor';

update public.position_authority
set target_roles   = array_remove(target_roles,   'president_advisor'),
    blocked_roles  = array_remove(blocked_roles,  'president_advisor'),
    own_unit_roles = array_remove(own_unit_roles, 'president_advisor')
where 'president_advisor' = any (coalesce(target_roles,   '{}'))
   or 'president_advisor' = any (coalesce(blocked_roles,  '{}'))
   or 'president_advisor' = any (coalesce(own_unit_roles, '{}'));

update public.membership_authority
set blocked_roles = array_remove(blocked_roles, 'president_advisor'),
    note = replace(note, 'ورئيس النادي والمستشار', 'ورئيس النادي')
where 'president_advisor' = any (coalesce(blocked_roles, '{}'));

delete from public.user_roles where role_name = 'president_advisor';
delete from public.roles      where role_name = 'president_advisor';

-- (٣) الدوالّ التي تسمّيه

-- قاضو الخروج: كان للمستشار فرعٌ يقضي فيه الرئيسان، فسقط الفرع.
create or replace function public.exit_decider_roles(p_user uuid)
 returns text[]
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select case
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'executive_council_president')
      then array['club_president']
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name in ('hr_committee_leader', 'qa_committee_leader'))
      then array['club_president', 'executive_council_president']
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'qa_admin_member')
      then array['club_president', 'executive_council_president', 'qa_committee_leader']
    else array['club_president', 'executive_council_president', 'hr_committee_leader']
  end;
$function$;

-- المنصبُ الأوّل: الترتيبُ نفسُه بلا خانة المستشار.
create or replace function public.get_user_primary_role(p_user uuid)
 returns text
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select r.role_name
  from user_roles ur join roles r on r.role_name = ur.role_name
  where ur.user_id = p_user and ur.is_active = true
  order by case r.role_name
    when 'club_president' then 1
    when 'executive_council_president' then 2 when 'hr_committee_leader' then 3
    when 'qa_committee_leader' then 4 when 'department_head' then 5
    when 'hr_admin_member' then 6 when 'qa_admin_member' then 7
    when 'committee_leader' then 8 when 'deputy_committee_leader' then 9
    when 'committee_member' then 10
    else 99 end
  limit 1;
$function$;

-- كشفُ «أهل الدفّة» والإسناد: الاسمُ يُنزع من قائمتيهما ولا يُمسّ سطرٌ سواه.
do $$
declare
  v_def text;
  v_old text := $q$'club_president','president_advisor','executive_council_president'$q$;
  v_new text := $q$'club_president','executive_council_president'$q$;
  v_fn  regprocedure;
begin
  foreach v_fn in array array[
    'public.get_board_members()'::regprocedure,
    'public.assign_position(uuid,uuid,text,integer,integer,boolean,text)'::regprocedure
  ] loop
    v_def := pg_get_functiondef(v_fn);
    if position(v_old in v_def) = 0 then
      raise exception '%: لم يُوجد سطرُ المستشار كما كُتب', v_fn;
    end if;
    execute replace(v_def, v_old, v_new);
  end loop;
end $$;

-- (٤) سياسةُ الإشعارات: جمهورُ «admins» كان الرئيسَ والمستشار، فصار الرئيسَ وحده.
do $$
declare
  v_qual text;
  v_old  text := $q$(ur.role_name = ANY (ARRAY['club_president'::text, 'president_advisor'::text]))$q$;
  v_new  text := $q$(ur.role_name = 'club_president'::text)$q$;
begin
  select qual into v_qual from pg_policies
  where schemaname = 'public' and tablename = 'notifications'
    and policyname = 'Users can view their notifications';
  if v_qual is null or position(v_old in v_qual) = 0 then
    raise exception 'سياسةُ الإشعارات: لم يُوجد سطرُ المستشار كما كُتب';
  end if;
  execute format('alter policy %I on public.notifications using (%s)',
                 'Users can view their notifications', replace(v_qual, v_old, v_new));
end $$;

-- (٥) الشاهد: لا يبقى للاسم ذكرٌ في دالّةٍ ولا سياسةٍ ولا جدول
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.prosrc ilike '%president_advisor%') then
    raise exception 'بقيت دالّةٌ تسمّي المستشار';
  end if;
  if exists (select 1 from pg_policies
             where qual ilike '%president_advisor%' or with_check ilike '%president_advisor%') then
    raise exception 'بقيت سياسةٌ تسمّي المستشار';
  end if;
  if exists (select 1 from public.roles where role_name = 'president_advisor' or role_name_ar ilike '%مستشار%')
     or exists (select 1 from public.user_roles where role_name = 'president_advisor')
     or exists (select 1 from public.role_permissions where role_name = 'president_advisor')
     or exists (select 1 from public.position_authority
                where 'president_advisor' = any (coalesce(target_roles, '{}') || coalesce(blocked_roles, '{}') || coalesce(own_unit_roles, '{}')))
     or exists (select 1 from public.membership_authority
                where 'president_advisor' = any (coalesce(blocked_roles, '{}')) or note ilike '%مستشار%')
     or exists (select 1 from public.profiles where full_name ilike '%مستشار%' or email = 'tadvisor@adeeb.club')
     or exists (select 1 from auth.users where email = 'tadvisor@adeeb.club') then
    raise exception 'بقي للمستشار أثرٌ في البيانات';
  end if;
end $$;
