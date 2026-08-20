-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260717010137   الاسم: role_level_producers_to_capabilities

-- منتِجات الرقم → قدرات/ترتيب اسميّ، مع ترحيل تابعتها ثمّ إسقاط الميّت.

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path to 'public','pg_temp'
as $$ select check_user_permission(auth.uid(), 'view_members'); $$;

create or replace function public.gw_is_admin(p_user_id uuid)
returns boolean language sql stable security definer set search_path to 'public','pg_temp'
as $$ select check_user_permission(p_user_id, 'manage_games'); $$;

create or replace function public.get_user_primary_role(p_user uuid)
returns text language sql stable security definer set search_path to 'public'
as $$
  select r.role_name
  from user_roles ur join roles r on r.id = ur.role_id
  where ur.user_id = p_user and ur.is_active = true
  order by case r.role_name
    when 'club_president' then 1 when 'president_advisor' then 2
    when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
    when 'qa_committee_leader' then 5 when 'department_head' then 6
    when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
    when 'committee_leader' then 9 when 'activity_coordinator' then 10
    when 'deputy_committee_leader' then 11 when 'committee_member' then 12
    else 99 end
  limit 1;
$$;

-- ترحيل testimonials عن is_admin_user (≥5) → manage_website (محتوى موقع، نظير faq/sponsors/works)
drop policy "testimonials_admin_all" on public.testimonials;
create policy "testimonials_admin_all" on public.testimonials as permissive for all to public
  using (check_user_permission(auth.uid(), 'manage_website'));

-- الآن تُسقَط الثلاث الميّتة (بلا تبعيّة باقية)
drop function if exists public.get_user_max_role_level(uuid);
drop function if exists public.get_user_highest_role_level(uuid);
drop function if exists public.is_admin_user(uuid);
