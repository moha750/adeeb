-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260717010629   الاسم: funcs_activity_gates_to_capability

-- تحويل بوّابة 9 دوالّ أنشطة (role_level>=8) إلى قدرة manage_activities — باستبدال كتلة البوّابة في تعريفها المخزَّن.
do $mig$
declare fn text; d text;
begin
  foreach fn in array array[
    'public.admin_cancel_reservation(uuid,text)',
    'public.assign_activity_coordinator(uuid)',
    'public.confirm_whatsapp(uuid)',
    'public.get_activity_full_details(uuid)',
    'public.list_activity_coordinators()',
    'public.list_certificates_for_send()',
    'public.mark_certificate_sent(uuid)',
    'public.revoke_activity_coordinator(uuid)',
    'public.search_members_for_coordinator(text)'
  ] loop
    d := pg_get_functiondef(fn::regprocedure);
    d := regexp_replace(d,
      'SELECT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+user_roles\s+ur\s+JOIN\s+roles\s+r\s+ON\s+r\.id\s*=\s*ur\.role_id\s+WHERE\s+ur\.user_id\s*=\s*v_user_id\s+AND\s+ur\.is_active\s*=\s*true\s+AND\s+r\.role_level\s*>=\s*8\s*\)\s+INTO\s+v_is_admin\s*;',
      'v_is_admin := check_user_permission(v_user_id, ''manage_activities'');');
    execute d;
  end loop;
end $mig$;
