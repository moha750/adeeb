-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260717010817   الاسم: funcs_batch2_gates_to_capabilities

do $mig$
declare fn text; d text;
begin
  -- أنشطة + منسّق النشاط (منح الوصول لحامل manage_activities أو دور activity_coordinator)
  foreach fn in array array[
    'public.get_active_attendance_windows()',
    'public.get_activity_attendance_list(uuid)',
    'public.mark_attendance(uuid,text)'
  ] loop
    d := pg_get_functiondef(fn::regprocedure);
    d := regexp_replace(d,
      'SELECT\s+EXISTS\s*\(.*role_level.*\)\s+INTO\s+v_authorized\s*;',
      'v_authorized := check_user_permission(v_user_id, ''manage_activities'') OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = v_user_id AND ur.is_active = true AND r.role_name = ''activity_coordinator'');');
    execute d;
  end loop;

  -- الانتحال → impersonate_users (استبدال تعبير EXISTS داخل الشرط)
  foreach fn in array array[
    'public.get_impersonation_history(integer,integer)',
    'public.start_impersonation(uuid,text)',
    'public.verify_impersonation_access(uuid)'
  ] loop
    d := pg_get_functiondef(fn::regprocedure);
    d := regexp_replace(d,
      'EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+user_roles\s+ur\s+JOIN\s+roles\s+r\s+ON\s+ur\.role_id\s*=\s*r\.id\s+WHERE\s+ur\.user_id\s*=\s*auth\.uid\(\)\s+AND\s+ur\.is_active\s*=\s*true\s+AND\s+r\.role_level\s*>=\s*\d+\s*\)',
      'check_user_permission(auth.uid(), ''impersonate_users'')');
    execute d;
  end loop;

  -- المقابلة → manage_interviews
  d := pg_get_functiondef('public.mark_acceptance_message_sent(uuid)'::regprocedure);
  d := regexp_replace(d,
    'SELECT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+user_roles\s+ur\s+JOIN\s+roles\s+r\s+ON\s+r\.id\s*=\s*ur\.role_id\s+WHERE\s+ur\.user_id\s*=\s*v_user_id\s+AND\s+ur\.is_active\s*=\s*true\s+AND\s+r\.role_level\s*>=\s*7\s*\)\s+INTO\s+v_is_admin\s*;',
    'v_is_admin := check_user_permission(v_user_id, ''manage_interviews'');');
  execute d;

  -- بيانات الدخول → manage_member_data (إزالة قراءة role_level + تبديل الشرط)
  foreach fn in array array[
    'public.update_member_email(uuid,text)',
    'public.update_member_password(uuid,text)'
  ] loop
    d := pg_get_functiondef(fn::regprocedure);
    d := regexp_replace(d,
      'SELECT\s+r\.role_level\s+INTO\s+v_caller_role_level\s+FROM\s+user_roles\s+ur\s+JOIN\s+roles\s+r\s+ON\s+ur\.role_id\s*=\s*r\.id\s+WHERE\s+ur\.user_id\s*=\s*auth\.uid\(\)\s*;',
      '');
    d := regexp_replace(d,
      'v_caller_role_level\s+IS\s+NULL\s+OR\s+v_caller_role_level\s*<\s*10',
      'NOT check_user_permission(auth.uid(), ''manage_member_data'')');
    execute d;
  end loop;
end $mig$;
