-- =====================================================
-- إزالة حقل committee_name الإنجليزي واستخدام committee_name_ar كمعرف فريد
-- =====================================================

-- 1. إزالة قيد UNIQUE من committee_name
ALTER TABLE public.committees DROP CONSTRAINT IF EXISTS committees_committee_name_key;

-- 2. إضافة قيد UNIQUE على committee_name_ar
ALTER TABLE public.committees ADD CONSTRAINT committees_committee_name_ar_key UNIQUE (committee_name_ar);

-- 3. حذف عمود committee_name
ALTER TABLE public.committees DROP COLUMN IF EXISTS committee_name;

-- 4. تحديث view user_roles_with_details لإزالة committee_name
DROP VIEW IF EXISTS public.user_roles_with_details;

CREATE OR REPLACE VIEW public.user_roles_with_details AS
SELECT 
    ur.id,
    ur.user_id,
    ur.role_id,
    ur.committee_id,
    ur.is_active,
    ur.assigned_at,
    ur.assigned_by,
    ur.notes,
    p.full_name,
    p.email,
    p.avatar_url,
    r.role_name,
    r.role_name_ar,
    r.role_level,
    r.role_category,
    c.committee_name_ar,
    ur.is_active as role_is_active,
    ur.assigned_at
FROM public.profiles p
INNER JOIN public.user_roles ur ON p.id = ur.user_id
INNER JOIN public.roles r ON ur.role_id = r.id
LEFT JOIN public.committees c ON ur.committee_id = c.id;

-- 5. تحديث view tasks_with_details لاستخدام committee_name_ar فقط
DROP VIEW IF EXISTS public.tasks_with_details;

CREATE OR REPLACE VIEW public.tasks_with_details AS
SELECT 
    t.id,
    t.task_name,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.assigned_to,
    t.assigned_by,
    t.project_id,
    t.committee_id,
    t.created_at,
    t.updated_at,
    p1.full_name as assigned_to_name,
    p1.email as assigned_to_email,
    p2.full_name as assigned_by_name,
    c.committee_name_ar as committee_name,
    pr.project_name
FROM public.tasks t
LEFT JOIN public.profiles p1 ON t.assigned_to = p1.id
LEFT JOIN public.profiles p2 ON t.assigned_by = p2.id
LEFT JOIN public.committees c ON t.committee_id = c.id
LEFT JOIN public.projects pr ON t.project_id = pr.id;

-- 6. تحديث view projects_with_details لاستخدام committee_name_ar فقط
DROP VIEW IF EXISTS public.projects_with_details;

CREATE OR REPLACE VIEW public.projects_with_details AS
SELECT 
    pr.id,
    pr.project_name,
    pr.description,
    pr.status,
    pr.priority,
    pr.start_date,
    pr.end_date,
    pr.budget,
    pr.created_at,
    p.full_name as project_leader_name,
    c.committee_name_ar as committee_name,
    COUNT(DISTINCT t.id) as tasks_count,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks_count
FROM public.projects pr
LEFT JOIN public.profiles p ON pr.project_leader = p.id
LEFT JOIN public.committees c ON pr.committee_id = c.id
LEFT JOIN public.tasks t ON pr.id = t.project_id
GROUP BY pr.id, pr.project_name, pr.description, pr.status, pr.priority, 
         pr.start_date, pr.end_date, pr.budget, pr.created_at, 
         p.full_name, c.committee_name_ar;

-- تعليق توضيحي
COMMENT ON COLUMN public.committees.committee_name_ar IS 'اسم اللجنة بالعربية (المعرف الفريد)';
