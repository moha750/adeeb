-- بوّابة أدِيب الواحدة (قرار المالك ٢٠٢٦-١٠-١١، والإذنُ بالترحيل ٢٠٢٦-١٠-١٣):
-- مفتاحان **مشتقّان من المكانة** لا يُمنحان بدورٍ ولا يدويًّا:
--   use_portal              لكلّ صاحب حساب (صديق أدِيب فما فوق): الرئيسية وحجوزاتي وشهاداتي وحسابي.
--   view_own_volunteering   لمن مكانتُه «متطوّع أدِيب» (adeeb_standing = 'volunteer'): غرفة «تطوّعي».
-- لا يقرؤهما شيءٌ اليوم: `DASHBOARD_CAPS` في التطبيق تُشتقّ من خريطة الأقفال، وهما ليسا فيها بعد،
-- فالترحيلُ ساكنٌ حتّى تُبنى الغرف وتُربط بهما. والحظرُ الفرديّ (is_granted = false) يبقى نافذًا عليهما.
--
-- تحقّقٌ بعد التطبيق (2026-10-13): صديقُ أدِيب ← use_portal · المتطوّع ← use_portal + view_own_volunteering
-- · العضو ← use_portal مع قدراته (لا view_own_volunteering: المكانةُ لا تتداخل).
--
-- ملاحظةٌ للبناء: حين تدخلان `SECTION_CAP` تصيران في `DASHBOARD_CAPS`، فتظهران في لوحة «الصلاحيات»
-- (`dashboard/system/permissions`) قابلتين للربط بالأدوار. والمشتقّةُ لا تُمنح بدور: تُستثنى هناك.

insert into public.permissions (permission_key, permission_name_ar, description, category)
values
  ('use_portal', 'بوّابة أدِيب', 'مشتقّة: لكلّ صاحب حساب — الرئيسية وحجوزاتي وشهاداتي وحسابي. لا تُمنح بدور.', 'portal'),
  ('view_own_volunteering', 'تطوّعي', 'مشتقّة: لمن مكانتُه «متطوّع أدِيب». لا تُمنح بدور.', 'portal')
on conflict (permission_key) do nothing;

create or replace function public.get_user_permissions(p_user_id uuid)
 returns table(permission_key text, permission_name_ar text, category text)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
    return query
    -- صلاحيات الدور
    select distinct
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    from user_roles ur
    join role_permissions rp on rp.role_name = ur.role_name
    join permissions perm    on perm.id = rp.permission_id
    where ur.user_id  = p_user_id
      and ur.is_active = true

    union

    -- الصلاحيات الفردية المضافة
    select distinct
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    from user_specific_permissions usp
    join permissions perm on perm.id = usp.permission_id
    where usp.user_id   = p_user_id
      and usp.is_granted = true
      and (usp.expires_at is null or usp.expires_at > now())

    union

    -- مفاتيحُ المكانة المشتقّة (بوّابة أدِيب): بابُ كلّ صاحب حساب، وغرفةُ المتطوّع
    select perm.permission_key, perm.permission_name_ar, perm.category
    from permissions perm
    where (perm.permission_key = 'use_portal'
           and exists (select 1 from auth.users u where u.id = p_user_id))
       or (perm.permission_key = 'view_own_volunteering'
           and public.adeeb_standing(p_user_id) = 'volunteer')

    except

    -- حذف الصلاحيات المحظورة صراحةً
    select distinct
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    from user_specific_permissions usp
    join permissions perm on perm.id = usp.permission_id
    where usp.user_id   = p_user_id
      and usp.is_granted = false
      and (usp.expires_at is null or usp.expires_at > now());
end;
$function$;
