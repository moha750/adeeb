-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260717011417   الاسم: notifications_select_derole_level

-- سياسة إشعارات SELECT: استبدال كتلتَي role_level (جمهور committee_leaders و admins) فقط،
-- وإبقاء تعبير الجمهور الضخم (الانتخابات…) حرفيًّا. جمهورٌ = هويّة، فالبديل قدرة/اسم لا رقم.
do $mig$
declare v_qual text;
begin
  select pg_get_expr(polqual, polrelid) into v_qual
  from pg_policy where polname = 'Users can view their notifications'
    and polrelid = 'public.notifications'::regclass;

  -- committee_leaders (role_level>=7) → قدرة view_pending_members (= صفّ ≥7 نفسه، ٨ أدوار)
  v_qual := regexp_replace(v_qual,
    'EXISTS \( SELECT 1\s+FROM \(user_roles ur\s+JOIN roles r ON \(\(r\.id = ur\.role_id\)\)\)\s+WHERE \(\(ur\.user_id = auth\.uid\(\)\) AND \(r\.role_level >= 7\)\)\)',
    'check_user_permission(auth.uid(), ''view_pending_members'')');

  -- admins (role_level>=9) → هويّةً بالاسم: رئيس النادي + المستشار (= صفّ ≥9 نفسه)
  v_qual := regexp_replace(v_qual,
    'EXISTS \( SELECT 1\s+FROM \(user_roles ur\s+JOIN roles r ON \(\(r\.id = ur\.role_id\)\)\)\s+WHERE \(\(ur\.user_id = auth\.uid\(\)\) AND \(r\.role_level >= 9\)\)\)',
    '(EXISTS ( SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND ur.is_active AND r.role_name IN (''club_president'', ''president_advisor'')))');

  execute 'DROP POLICY "Users can view their notifications" ON public.notifications';
  execute format('CREATE POLICY "Users can view their notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public USING (%s)', v_qual);
end $mig$;
