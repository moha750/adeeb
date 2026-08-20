-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260705132428   الاسم: get_board_members_active_only

-- تصحيح: احسب المجلس من الأدوار النشطة فقط (ur.is_active = true).
-- النظام يضبط الدور القديم is_active=false والحالي true عند تغيير المنصب.
create or replace function public.get_board_members()
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  role_name text,
  role_level int,
  twitter_account text,
  linkedin_account text
)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.full_name, t.avatar_url, t.role_name, t.role_level, t.twitter_account, t.linkedin_account
  from (
    select distinct on (p.id)
      p.id,
      p.full_name,
      p.avatar_url,
      r.role_name_ar as role_name,
      r.role_level,
      md.twitter_account,
      md.linkedin_account
    from profiles p
    join user_roles ur on ur.user_id = p.id and ur.is_active = true
    join roles r on r.id = ur.role_id
    left join member_details md on md.user_id = p.id
    where p.account_status = 'active'
      and r.role_level >= 5
    order by p.id, r.role_level desc
  ) t
  order by t.role_level desc, t.full_name;
$$;

grant execute on function public.get_board_members() to anon, authenticated;
