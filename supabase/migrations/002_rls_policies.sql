-- =====================================================
-- نظام إدارة نادي أدِيب - سياسات الأمان (RLS)
-- =====================================================
-- تاريخ الإنشاء: 2026-01-16
-- الوصف: سياسات Row Level Security لحماية البيانات
-- =====================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- سياسات جدول الملفات الشخصية (profiles)
-- =====================================================

-- يمكن للجميع قراءة الملفات الشخصية النشطة
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    USING (account_status = 'active');

-- يمكن للمستخدم تحديث ملفه الشخصي فقط
CREATE POLICY "profiles_update_own_policy" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- يمكن للمستخدمين ذوي صلاحية إدارة المستخدمين تحديث أي ملف
CREATE POLICY "profiles_update_admin_policy" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- يمكن للمستخدمين ذوي صلاحية إدارة المستخدمين إنشاء ملفات جديدة
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- يمكن لرئيس النادي فقط حذف الملفات
CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level = 10
        )
    );

-- =====================================================
-- سياسات جدول اللجان (committees)
-- =====================================================

-- يمكن للجميع قراءة اللجان النشطة
CREATE POLICY "committees_select_policy" ON public.committees
    FOR SELECT
    USING (is_active = true);

-- يمكن للمستوى 8 وأعلى إدارة اللجان
CREATE POLICY "committees_all_policy" ON public.committees
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- =====================================================
-- سياسات جدول الأدوار (roles)
-- =====================================================

-- يمكن للجميع قراءة الأدوار
CREATE POLICY "roles_select_policy" ON public.roles
    FOR SELECT
    USING (true);

-- يمكن لرئيس النادي فقط إدارة الأدوار
CREATE POLICY "roles_all_policy" ON public.roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level = 10
        )
    );

-- =====================================================
-- سياسات جدول ربط المستخدمين بالأدوار (user_roles)
-- =====================================================

-- يمكن للمستخدم قراءة أدواره
CREATE POLICY "user_roles_select_own_policy" ON public.user_roles
    FOR SELECT
    USING (user_id = auth.uid());

-- يمكن للمستوى 8 وأعلى قراءة جميع الأدوار
CREATE POLICY "user_roles_select_admin_policy" ON public.user_roles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- يمكن للمستوى 9 وأعلى تعيين الأدوار
CREATE POLICY "user_roles_insert_policy" ON public.user_roles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 9
        )
    );

-- يمكن للمستوى 9 وأعلى تحديث الأدوار
CREATE POLICY "user_roles_update_policy" ON public.user_roles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 9
        )
    );

-- يمكن لرئيس النادي فقط حذف الأدوار
CREATE POLICY "user_roles_delete_policy" ON public.user_roles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level = 10
        )
    );

-- =====================================================
-- سياسات جدول الصلاحيات (permissions)
-- =====================================================

-- يمكن للجميع قراءة الصلاحيات
CREATE POLICY "permissions_select_policy" ON public.permissions
    FOR SELECT
    USING (true);

-- يمكن لرئيس النادي فقط إدارة الصلاحيات
CREATE POLICY "permissions_all_policy" ON public.permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level = 10
        )
    );

-- =====================================================
-- سياسات جدول ربط الأدوار بالصلاحيات (role_permissions)
-- =====================================================

-- يمكن للجميع قراءة صلاحيات الأدوار
CREATE POLICY "role_permissions_select_policy" ON public.role_permissions
    FOR SELECT
    USING (true);

-- يمكن لرئيس النادي فقط إدارة صلاحيات الأدوار
CREATE POLICY "role_permissions_all_policy" ON public.role_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level = 10
        )
    );

-- =====================================================
-- سياسات جدول المشاريع (projects)
-- =====================================================

-- يمكن للجميع قراءة المشاريع في لجانهم
CREATE POLICY "projects_select_policy" ON public.projects
    FOR SELECT
    USING (
        committee_id IN (
            SELECT committee_id FROM public.user_roles
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- يمكن لقادة اللجان ومن فوقهم إنشاء مشاريع
CREATE POLICY "projects_insert_policy" ON public.projects
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
            AND (ur.committee_id = committee_id OR r.role_level >= 8)
        )
    );

-- يمكن لقادة المشاريع وقادة اللجان تحديث المشاريع
CREATE POLICY "projects_update_policy" ON public.projects
    FOR UPDATE
    USING (
        project_leader = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
            AND (ur.committee_id = committee_id OR r.role_level >= 8)
        )
    );

-- يمكن للمستوى 8 وأعلى حذف المشاريع
CREATE POLICY "projects_delete_policy" ON public.projects
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- =====================================================
-- سياسات جدول المهام (tasks)
-- =====================================================

-- يمكن للمستخدم قراءة مهامه أو مهام لجنته
CREATE POLICY "tasks_select_policy" ON public.tasks
    FOR SELECT
    USING (
        assigned_to = auth.uid()
        OR assigned_by = auth.uid()
        OR committee_id IN (
            SELECT committee_id FROM public.user_roles
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- يمكن لقادة اللجان ومن فوقهم إنشاء مهام
CREATE POLICY "tasks_insert_policy" ON public.tasks
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 6
            AND (ur.committee_id = committee_id OR r.role_level >= 8)
        )
    );

-- يمكن للمستخدم المسند إليه أو المسند منه تحديث المهمة
CREATE POLICY "tasks_update_policy" ON public.tasks
    FOR UPDATE
    USING (
        assigned_to = auth.uid()
        OR assigned_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 6
            AND (ur.committee_id = committee_id OR r.role_level >= 8)
        )
    );

-- يمكن لقادة اللجان ومن فوقهم حذف المهام
CREATE POLICY "tasks_delete_policy" ON public.tasks
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
            AND (ur.committee_id = committee_id OR r.role_level >= 8)
        )
    );

-- =====================================================
-- سياسات جدول الاجتماعات (meetings)
-- =====================================================

-- يمكن للجميع قراءة اجتماعات لجانهم
CREATE POLICY "meetings_select_policy" ON public.meetings
    FOR SELECT
    USING (
        committee_id IN (
            SELECT committee_id FROM public.user_roles
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR meeting_type = 'general'
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- يمكن لقادة اللجان ومن فوقهم إنشاء اجتماعات
CREATE POLICY "meetings_insert_policy" ON public.meetings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
            AND (ur.committee_id = committee_id OR r.role_level >= 8)
        )
    );

-- يمكن لمنشئ الاجتماع أو قادة اللجان تحديثه
CREATE POLICY "meetings_update_policy" ON public.meetings
    FOR UPDATE
    USING (
        created_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
            AND (ur.committee_id = committee_id OR r.role_level >= 8)
        )
    );

-- يمكن للمستوى 8 وأعلى حذف الاجتماعات
CREATE POLICY "meetings_delete_policy" ON public.meetings
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- =====================================================
-- سياسات جدول الحضور (attendance)
-- =====================================================

-- يمكن للمستخدم قراءة حضوره
CREATE POLICY "attendance_select_own_policy" ON public.attendance
    FOR SELECT
    USING (user_id = auth.uid());

-- يمكن للمستوى 7 وأعلى قراءة جميع سجلات الحضور
CREATE POLICY "attendance_select_admin_policy" ON public.attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
        )
    );

-- يمكن للمستوى 7 وأعلى تسجيل الحضور
CREATE POLICY "attendance_insert_policy" ON public.attendance
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
        )
    );

-- يمكن للمستوى 7 وأعلى تحديث الحضور
CREATE POLICY "attendance_update_policy" ON public.attendance
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
        )
    );

-- =====================================================
-- سياسات جدول الإشعارات (notifications)
-- =====================================================

-- يمكن للمستخدم قراءة إشعاراته فقط
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- يمكن للمستوى 7 وأعلى إنشاء إشعارات
CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
        )
    );

-- يمكن للمستخدم تحديث إشعاراته (مثل تحديد كمقروء)
CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- يمكن للمستخدم حذف إشعاراته
CREATE POLICY "notifications_delete_policy" ON public.notifications
    FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================
-- سياسات جدول سجل الأنشطة (activity_log)
-- =====================================================

-- يمكن للمستخدم قراءة سجل أنشطته
CREATE POLICY "activity_log_select_own_policy" ON public.activity_log
    FOR SELECT
    USING (user_id = auth.uid());

-- يمكن للمستوى 8 وأعلى قراءة جميع السجلات
CREATE POLICY "activity_log_select_admin_policy" ON public.activity_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- يمكن للجميع إضافة سجلات (يتم ذلك تلقائياً)
CREATE POLICY "activity_log_insert_policy" ON public.activity_log
    FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- سياسات جدول التقارير (reports)
-- =====================================================

-- يمكن للمستخدم قراءة تقارير لجنته
CREATE POLICY "reports_select_policy" ON public.reports
    FOR SELECT
    USING (
        committee_id IN (
            SELECT committee_id FROM public.user_roles
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR report_type = 'general'
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- يمكن للمستوى 7 وأعلى إنشاء تقارير
CREATE POLICY "reports_insert_policy" ON public.reports
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
        )
    );

-- =====================================================
-- سياسات جدول تعليقات المهام (task_comments)
-- =====================================================

-- يمكن للمستخدم قراءة تعليقات المهام المتاحة له
CREATE POLICY "task_comments_select_policy" ON public.task_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND (
                t.assigned_to = auth.uid()
                OR t.assigned_by = auth.uid()
                OR t.committee_id IN (
                    SELECT committee_id FROM public.user_roles
                    WHERE user_id = auth.uid() AND is_active = true
                )
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- يمكن للمستخدم إضافة تعليقات على المهام المتاحة له
CREATE POLICY "task_comments_insert_policy" ON public.task_comments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND (
                t.assigned_to = auth.uid()
                OR t.assigned_by = auth.uid()
                OR t.committee_id IN (
                    SELECT committee_id FROM public.user_roles
                    WHERE user_id = auth.uid() AND is_active = true
                )
            )
        )
    );

-- يمكن للمستخدم تحديث تعليقاته فقط
CREATE POLICY "task_comments_update_policy" ON public.task_comments
    FOR UPDATE
    USING (user_id = auth.uid());

-- يمكن للمستخدم حذف تعليقاته أو المستوى 7 وأعلى
CREATE POLICY "task_comments_delete_policy" ON public.task_comments
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
        )
    );

-- =====================================================
-- سياسات جدول مرفقات المهام (task_attachments)
-- =====================================================

-- يمكن للمستخدم قراءة مرفقات المهام المتاحة له
CREATE POLICY "task_attachments_select_policy" ON public.task_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND (
                t.assigned_to = auth.uid()
                OR t.assigned_by = auth.uid()
                OR t.committee_id IN (
                    SELECT committee_id FROM public.user_roles
                    WHERE user_id = auth.uid() AND is_active = true
                )
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- يمكن للمستخدم رفع مرفقات للمهام المتاحة له
CREATE POLICY "task_attachments_insert_policy" ON public.task_attachments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND (
                t.assigned_to = auth.uid()
                OR t.assigned_by = auth.uid()
                OR t.committee_id IN (
                    SELECT committee_id FROM public.user_roles
                    WHERE user_id = auth.uid() AND is_active = true
                )
            )
        )
    );

-- يمكن للمستخدم حذف مرفقاته فقط
CREATE POLICY "task_attachments_delete_policy" ON public.task_attachments
    FOR DELETE
    USING (uploaded_by = auth.uid());

-- =====================================================
-- سياسات جدول تقييمات الأعضاء (member_evaluations)
-- =====================================================

-- يمكن للمستخدم قراءة تقييماته
CREATE POLICY "member_evaluations_select_own_policy" ON public.member_evaluations
    FOR SELECT
    USING (user_id = auth.uid());

-- يمكن للمستوى 7 وأعلى قراءة جميع التقييمات
CREATE POLICY "member_evaluations_select_admin_policy" ON public.member_evaluations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
        )
    );

-- يمكن للمستوى 7 وأعلى إنشاء تقييمات
CREATE POLICY "member_evaluations_insert_policy" ON public.member_evaluations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
        )
    );

-- يمكن للمقيّم تحديث تقييماته
CREATE POLICY "member_evaluations_update_policy" ON public.member_evaluations
    FOR UPDATE
    USING (evaluator_id = auth.uid());

-- =====================================================
-- سياسات جدول الإعلانات (announcements)
-- =====================================================

-- يمكن للجميع قراءة الإعلانات المنشورة الموجهة لهم
CREATE POLICY "announcements_select_policy" ON public.announcements
    FOR SELECT
    USING (
        published_at IS NOT NULL
        AND published_at <= NOW()
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (
            target_audience = 'all'
            OR (
                target_audience = 'supreme_council'
                AND EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    JOIN public.roles r ON ur.role_id = r.id
                    WHERE ur.user_id = auth.uid() 
                    AND ur.is_active = true 
                    AND r.role_category = 'supreme_council'
                )
            )
            OR (
                target_audience = 'administrative_council'
                AND EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    JOIN public.roles r ON ur.role_id = r.id
                    WHERE ur.user_id = auth.uid() 
                    AND ur.is_active = true 
                    AND r.role_category IN ('administrative_council', 'supreme_council')
                )
            )
            OR (
                target_audience = 'specific_committee'
                AND committee_id IN (
                    SELECT committee_id FROM public.user_roles
                    WHERE user_id = auth.uid() AND is_active = true
                )
            )
        )
    );

-- يمكن للمستوى 7 وأعلى إنشاء إعلانات
CREATE POLICY "announcements_insert_policy" ON public.announcements
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 7
        )
    );

-- يمكن لمنشئ الإعلان أو المستوى 8 وأعلى تحديثه
CREATE POLICY "announcements_update_policy" ON public.announcements
    FOR UPDATE
    USING (
        created_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- يمكن للمستوى 8 وأعلى حذف الإعلانات
CREATE POLICY "announcements_delete_policy" ON public.announcements
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true 
            AND r.role_level >= 8
        )
    );

-- =====================================================
-- تعليقات ختامية
-- =====================================================
-- تم إنشاء سياسات RLS شاملة لحماية جميع البيانات
-- السياسات تعتمد على مستوى الدور (role_level) والفئة (role_category)
-- كل مستخدم يمكنه الوصول فقط للبيانات المصرح له بها
