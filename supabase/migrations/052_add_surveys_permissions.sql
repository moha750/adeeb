-- =====================================================
-- إضافة صلاحيات نظام الاستبيانات
-- Add Surveys System Permissions
-- =====================================================
-- تاريخ الإنشاء: 2026-01-26
-- الوصف: إضافة صلاحيات نظام الاستبيانات إلى نظام الصلاحيات المركزي
-- =====================================================

-- إضافة صلاحيات الاستبيانات
INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
-- صلاحيات عرض الاستبيانات
('surveys.view', 'عرض الاستبيانات', 'View Surveys', 'عرض قائمة الاستبيانات', 'surveys', 'surveys', false),
('surveys.view_all', 'عرض جميع الاستبيانات', 'View All Surveys', 'عرض جميع الاستبيانات بما فيها المسودات', 'surveys', 'surveys', false),
('surveys.view_responses', 'عرض الاستجابات', 'View Responses', 'عرض استجابات الاستبيانات', 'surveys', 'surveys', false),
('surveys.view_analytics', 'عرض التحليلات', 'View Analytics', 'عرض تحليلات وإحصائيات الاستبيانات', 'surveys', 'surveys', false),

-- صلاحيات إنشاء الاستبيانات
('surveys.create', 'إنشاء استبيان', 'Create Survey', 'إنشاء استبيان جديد', 'surveys', 'surveys', false),
('surveys.create_from_template', 'إنشاء من قالب', 'Create From Template', 'إنشاء استبيان من قالب جاهز', 'surveys', 'surveys', false),

-- صلاحيات تعديل الاستبيانات
('surveys.update', 'تعديل الاستبيان', 'Update Survey', 'تعديل استبيان موجود', 'surveys', 'surveys', false),
('surveys.update_all', 'تعديل جميع الاستبيانات', 'Update All Surveys', 'تعديل أي استبيان في النظام', 'surveys', 'surveys', false),

-- صلاحيات حذف الاستبيانات
('surveys.delete', 'حذف الاستبيان', 'Delete Survey', 'حذف استبيان', 'surveys', 'surveys', false),
('surveys.delete_all', 'حذف جميع الاستبيانات', 'Delete All Surveys', 'حذف أي استبيان في النظام', 'surveys', 'surveys', false),

-- صلاحيات نشر الاستبيانات
('surveys.publish', 'نشر الاستبيان', 'Publish Survey', 'نشر استبيان وجعله متاحاً', 'surveys', 'surveys', false),
('surveys.unpublish', 'إلغاء نشر الاستبيان', 'Unpublish Survey', 'إيقاف أو إغلاق استبيان', 'surveys', 'surveys', false),

-- صلاحيات إدارة الأسئلة
('surveys.manage_questions', 'إدارة الأسئلة', 'Manage Questions', 'إضافة وتعديل وحذف أسئلة الاستبيان', 'surveys', 'surveys', false),
('surveys.manage_sections', 'إدارة الأقسام', 'Manage Sections', 'إضافة وتعديل وحذف أقسام الاستبيان', 'surveys', 'surveys', false),

-- صلاحيات المشاركة
('surveys.share', 'مشاركة الاستبيان', 'Share Survey', 'إنشاء روابط مشاركة للاستبيان', 'surveys', 'surveys', false),
('surveys.manage_shares', 'إدارة المشاركات', 'Manage Shares', 'إدارة روابط المشاركة', 'surveys', 'surveys', false),

-- صلاحيات التصدير
('surveys.export_responses', 'تصدير الاستجابات', 'Export Responses', 'تصدير استجابات الاستبيان', 'surveys', 'surveys', false),
('surveys.export_analytics', 'تصدير التحليلات', 'Export Analytics', 'تصدير تحليلات الاستبيان', 'surveys', 'surveys', false),

-- صلاحيات القوالب
('surveys.view_templates', 'عرض القوالب', 'View Templates', 'عرض قوالب الاستبيانات', 'surveys', 'survey_templates', false),
('surveys.create_template', 'إنشاء قالب', 'Create Template', 'إنشاء قالب استبيان جديد', 'surveys', 'survey_templates', false),
('surveys.update_template', 'تعديل القالب', 'Update Template', 'تعديل قالب استبيان', 'surveys', 'survey_templates', false),
('surveys.delete_template', 'حذف القالب', 'Delete Template', 'حذف قالب استبيان', 'surveys', 'survey_templates', false),

-- صلاحيات متقدمة
('surveys.manage_notifications', 'إدارة الإشعارات', 'Manage Notifications', 'إدارة إشعارات الاستبيانات', 'surveys', 'surveys', false),
('surveys.view_audit_log', 'عرض سجل التدقيق', 'View Audit Log', 'عرض سجل تعديلات الاستبيانات', 'surveys', 'surveys', false),
('surveys.delete_responses', 'حذف الاستجابات', 'Delete Responses', 'حذف استجابات المستخدمين', 'surveys', 'surveys', false)

ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- منح الصلاحيات للأدوار
-- =====================================================

-- المستوى 7: عرض وإدارة أساسية
DO $$
DECLARE
    v_role_id INTEGER;
    v_permission_id INTEGER;
BEGIN
    -- الحصول على معرف الدور (مستوى 7)
    SELECT id INTO v_role_id FROM public.roles WHERE role_level = 7 LIMIT 1;
    
    IF v_role_id IS NOT NULL THEN
        -- منح صلاحيات المستوى 7
        FOR v_permission_id IN 
            SELECT id FROM public.permissions 
            WHERE permission_key IN (
                'surveys.view',
                'surveys.view_all',
                'surveys.view_responses',
                'surveys.view_analytics',
                'surveys.create',
                'surveys.create_from_template',
                'surveys.update',
                'surveys.publish',
                'surveys.unpublish',
                'surveys.manage_questions',
                'surveys.manage_sections',
                'surveys.share',
                'surveys.manage_shares',
                'surveys.export_responses',
                'surveys.export_analytics',
                'surveys.view_templates'
            )
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id, scope)
            VALUES (v_role_id, v_permission_id, 'all')
            ON CONFLICT (role_id, permission_id, scope) DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- المستوى 8: صلاحيات إضافية
DO $$
DECLARE
    v_role_id INTEGER;
    v_permission_id INTEGER;
BEGIN
    SELECT id INTO v_role_id FROM public.roles WHERE role_level = 8 LIMIT 1;
    
    IF v_role_id IS NOT NULL THEN
        FOR v_permission_id IN 
            SELECT id FROM public.permissions 
            WHERE permission_key IN (
                'surveys.view',
                'surveys.view_all',
                'surveys.view_responses',
                'surveys.view_analytics',
                'surveys.create',
                'surveys.create_from_template',
                'surveys.update',
                'surveys.update_all',
                'surveys.delete',
                'surveys.publish',
                'surveys.unpublish',
                'surveys.manage_questions',
                'surveys.manage_sections',
                'surveys.share',
                'surveys.manage_shares',
                'surveys.export_responses',
                'surveys.export_analytics',
                'surveys.view_templates',
                'surveys.create_template',
                'surveys.update_template',
                'surveys.manage_notifications',
                'surveys.view_audit_log'
            )
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id, scope)
            VALUES (v_role_id, v_permission_id, 'all')
            ON CONFLICT (role_id, permission_id, scope) DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- المستوى 9 و 10: صلاحيات كاملة
DO $$
DECLARE
    v_role_id INTEGER;
    v_permission_id INTEGER;
    v_level INTEGER;
BEGIN
    FOR v_level IN 9..10 LOOP
        SELECT id INTO v_role_id FROM public.roles WHERE role_level = v_level LIMIT 1;
        
        IF v_role_id IS NOT NULL THEN
            FOR v_permission_id IN 
                SELECT id FROM public.permissions WHERE module = 'surveys'
            LOOP
                INSERT INTO public.role_permissions (role_id, permission_id, scope)
                VALUES (v_role_id, v_permission_id, 'all')
                ON CONFLICT (role_id, permission_id, scope) DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- تعليقات
-- =====================================================

COMMENT ON TABLE public.permissions IS 'جدول الصلاحيات المركزي - يتضمن صلاحيات نظام الاستبيانات';
