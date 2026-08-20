-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234133   الاسم: fix_permissive_rls_policies_site_visits

-- Migration: إصلاح RLS Policies المتساهلة في جدول site_visits
-- الهدف: استبدال USING (true) و WITH CHECK (true) بصلاحيات فعلية

-- حذف الـ policies القديمة المتساهلة
DROP POLICY IF EXISTS "allow_all_insert" ON site_visits;
DROP POLICY IF EXISTS "allow_all_update_duration" ON site_visits;
DROP POLICY IF EXISTS "allow_public_insert_visits" ON site_visits;

-- السماح بالإضافة للزوار (public) - ولكن بشروط
CREATE POLICY "site_visits_insert_public" ON site_visits
FOR INSERT
TO public
WITH CHECK (
  -- التأكد من وجود البيانات الأساسية
  visitor_id IS NOT NULL
  AND session_id IS NOT NULL
  AND page_url IS NOT NULL
  -- منع إضافة بيانات مستقبلية
  AND (visited_at IS NULL OR visited_at <= now())
);

-- السماح بالتحديث فقط لنفس الجلسة (لتحديث المدة)
CREATE POLICY "site_visits_update_own_session" ON site_visits
FOR UPDATE
TO public
USING (
  -- السماح بالتحديث فقط لنفس الـ session_id
  session_id = current_setting('request.headers', true)::json->>'x-session-id'
  OR
  -- أو إذا كان المستخدم مصادق عليه ولديه صلاحية
  (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND p.permission_key IN ('site_visits.manage', 'system.admin')
    )
  )
)
WITH CHECK (
  -- السماح بتحديث duration_seconds فقط
  visitor_id = (SELECT visitor_id FROM site_visits WHERE id = site_visits.id)
  AND session_id = (SELECT session_id FROM site_visits WHERE id = site_visits.id)
  AND page_url = (SELECT page_url FROM site_visits WHERE id = site_visits.id)
);

COMMENT ON POLICY "site_visits_insert_public" ON site_visits IS 'يسمح للزوار بتسجيل زياراتهم مع التحقق من البيانات الأساسية';
COMMENT ON POLICY "site_visits_update_own_session" ON site_visits IS 'يسمح بتحديث مدة الزيارة فقط لنفس الجلسة';
