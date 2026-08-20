-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260215083653   الاسم: create_permissions_system_v2


-- حذف الدالة القديمة إن وجدت
DROP FUNCTION IF EXISTS get_user_permissions(uuid);
DROP FUNCTION IF EXISTS check_user_permission(uuid, text);

-- إنشاء جدول الصلاحيات
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    permission_key TEXT UNIQUE NOT NULL,
    permission_name_ar TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول ربط الصلاحيات بالمناصب
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- إضافة الصلاحيات الأساسية
INSERT INTO permissions (permission_key, permission_name_ar, description, category) VALUES
-- صلاحيات الانتخابات
('manage_elections', 'إدارة الانتخابات', 'فتح وإغلاق الانتخابات وإدارة المرشحين', 'elections'),
('open_election', 'فتح باب الترشح', 'إنشاء انتخابات جديدة وفتح باب الترشح', 'elections'),
('review_candidates', 'مراجعة المرشحين', 'قبول أو رفض طلبات الترشح', 'elections'),
('manage_voting', 'إدارة التصويت', 'فتح وإغلاق التصويت وإعلان النتائج', 'elections'),
('view_election_results', 'عرض نتائج الانتخابات', 'الاطلاع على نتائج الانتخابات', 'elections'),
('nominate_self', 'الترشح للقيادة', 'تقديم طلب ترشح للمناصب القيادية', 'elections'),
('cast_vote', 'التصويت', 'التصويت في الانتخابات', 'elections'),

-- صلاحيات العضوية
('manage_registration', 'إدارة التسجيل', 'التحكم في إعدادات باب التسجيل', 'membership'),
('gift_membership', 'إهداء العضوية', 'منح عضوية مباشرة بدون تسجيل', 'membership'),
('view_applications', 'عرض الطلبات', 'الاطلاع على طلبات العضوية', 'membership'),
('approve_applications', 'قبول الطلبات', 'قبول أو رفض طلبات العضوية', 'membership'),
('manage_committees', 'إدارة اللجان', 'إنشاء وتعديل اللجان', 'membership'),
('manage_committee_members', 'إدارة أعضاء اللجنة', 'إضافة وإزالة أعضاء من اللجنة', 'membership'),

-- صلاحيات الأخبار
('manage_news', 'إدارة الأخبار', 'إنشاء وتعديل وحذف الأخبار', 'news'),
('publish_news', 'نشر الأخبار', 'نشر الأخبار للعامة', 'news'),
('instant_publish', 'النشر الفوري', 'نشر الأخبار بدون مراجعة', 'news'),

-- صلاحيات الإدارة
('impersonate_users', 'التنكر كمستخدم', 'الدخول بهوية مستخدم آخر', 'admin'),
('manage_notifications', 'إدارة الإشعارات', 'إرسال إشعارات للأعضاء', 'admin'),
('view_watchtower', 'برج المراقبة', 'الاطلاع على سجلات النظام', 'admin'),
('manage_positions', 'إدارة المناصب', 'تعيين وإزالة المناصب', 'admin'),
('manage_member_data', 'إدارة بيانات الأعضاء', 'تغيير البريد وكلمة المرور', 'admin'),

-- صلاحيات الموقع
('manage_website', 'إدارة الموقع', 'تعديل محتوى الموقع الرئيسي', 'website'),
('manage_surveys', 'إدارة الاستبيانات', 'إنشاء وإدارة الاستبيانات', 'surveys')
ON CONFLICT (permission_key) DO NOTHING;

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

-- إنشاء دالة للتحقق من الصلاحيات
CREATE OR REPLACE FUNCTION check_user_permission(p_user_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id 
        AND ur.is_active = true
        AND p.permission_key = p_permission_key
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة لجلب جميع صلاحيات المستخدم
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_key TEXT, permission_name_ar TEXT, category TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.permission_key, p.permission_name_ar, p.category
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id 
    AND ur.is_active = true
    ORDER BY p.category, p.permission_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

