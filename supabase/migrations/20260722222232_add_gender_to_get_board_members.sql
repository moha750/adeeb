-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260722222232   الاسم: add_gender_to_get_board_members

-- إضافة عمود gender لإرجاع get_board_members (لأيقونة أهل الدفّة حين لا صورة).
-- تغيير توقيع RETURNS TABLE يستلزم DROP + CREATE. المنطق نفسه، أُضيف p.gender فقط.
DROP FUNCTION IF EXISTS public.get_board_members();

CREATE OR REPLACE FUNCTION public.get_board_members()
 RETURNS TABLE(id uuid, full_name text, avatar_url text, gender text, role_name text, role_level integer, twitter_account text, linkedin_account text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.id, t.full_name, t.avatar_url, t.gender, t.role_name, t.rnk as role_level, t.twitter_account, t.linkedin_account
  from (
    select distinct on (p.id)
      p.id, p.full_name, p.avatar_url, p.gender,
      r.role_name_ar as role_name,
      (case r.role_name
        when 'club_president' then 12 when 'president_advisor' then 11
        when 'executive_council_president' then 10 when 'hr_committee_leader' then 9
        when 'qa_committee_leader' then 8 when 'department_head' then 7
        when 'hr_admin_member' then 6 when 'qa_admin_member' then 5
        when 'committee_leader' then 4 when 'activity_coordinator' then 3
        when 'deputy_committee_leader' then 2 when 'committee_member' then 1
        else 0 end) as rnk,
      md.twitter_account, md.linkedin_account
    from profiles p
    join user_roles ur on ur.user_id = p.id and ur.is_active = true
    join roles r on r.id = ur.role_id
    left join member_details md on md.user_id = p.id
    where p.account_status = 'active'
      and (case r.role_name
        when 'club_president' then 12 when 'president_advisor' then 11
        when 'executive_council_president' then 10 when 'hr_committee_leader' then 9
        when 'qa_committee_leader' then 8 when 'department_head' then 7
        when 'hr_admin_member' then 6 when 'qa_admin_member' then 5
        when 'committee_leader' then 4 when 'activity_coordinator' then 3
        when 'deputy_committee_leader' then 2 when 'committee_member' then 1
        else 0 end) >= 2
    order by p.id, rnk desc
  ) t
  order by t.rnk desc, t.full_name;
$function$;
