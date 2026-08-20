-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260317224740   الاسم: create_file_downloads_tracker_and_fix_rls


-- ============================================================
-- 1. جدول تتبع تحميلات الملفات
-- ============================================================
CREATE TABLE IF NOT EXISTS file_downloads (
    id              BIGSERIAL PRIMARY KEY,
    file_key        TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    downloaded_at   TIMESTAMPTZ DEFAULT now(),
    ip_hash         TEXT,
    user_agent      TEXT,
    country         TEXT
);

ALTER TABLE file_downloads ENABLE ROW LEVEL SECURITY;

-- أي زائر يستطيع إضافة سجل تحميل (بدون مصادقة)
CREATE POLICY "file_downloads_insert_anon"
    ON file_downloads FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- القراءة فقط للمصادقين (لوحة التحكم)
CREATE POLICY "file_downloads_select_auth"
    ON file_downloads FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- 2. إصلاح RLS: تفعيل RLS على جدول departments
-- ============================================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_select_all"
    ON departments FOR SELECT
    USING (true);

CREATE POLICY "departments_modify_president"
    ON departments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND r.role_name = 'club_president'
        )
    );

-- ============================================================
-- 3. إصلاح RLS: user_roles_insert يجب أن يكون مقيداً
-- (الـ policy الحالية لا تحتوي على WITH CHECK — أي أحد يستطيع إدراج أدوار!)
-- ============================================================
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;

CREATE POLICY "user_roles_insert"
    ON user_roles FOR INSERT
    TO authenticated
    WITH CHECK (
        get_user_max_role_level(auth.uid()) >= 8
    );

-- ============================================================
-- 4. تشديد user_roles_update: يجب أن يكون level أعلى من المستهدف
-- ============================================================
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;

CREATE POLICY "user_roles_update"
    ON user_roles FOR UPDATE
    TO authenticated
    USING (
        get_user_max_role_level(auth.uid()) >= 9
    )
    WITH CHECK (
        get_user_max_role_level(auth.uid()) >= 9
    );

-- ============================================================
-- 5. دالة تسجيل التحميل (تُستدعى من الصفحة العامة)
-- ============================================================
CREATE OR REPLACE FUNCTION log_file_download(
    p_file_key  TEXT,
    p_file_name TEXT,
    p_ip_hash   TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id BIGINT;
BEGIN
    INSERT INTO file_downloads (file_key, file_name, ip_hash, user_agent)
    VALUES (p_file_key, p_file_name, p_ip_hash, p_user_agent)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- ============================================================
-- 6. دالة إحصائيات التحميل
-- ============================================================
CREATE OR REPLACE FUNCTION get_download_stats(p_file_key TEXT)
RETURNS TABLE (
    total_downloads BIGINT,
    today_downloads BIGINT,
    this_week_downloads BIGINT,
    last_download TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE downloaded_at >= CURRENT_DATE)::BIGINT,
        COUNT(*) FILTER (WHERE downloaded_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT,
        MAX(downloaded_at)
    FROM file_downloads
    WHERE file_key = p_file_key;
END;
$$;

