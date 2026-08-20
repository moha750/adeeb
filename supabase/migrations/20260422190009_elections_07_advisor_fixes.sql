-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260422190009   الاسم: elections_07_advisor_fixes

-- =============================================
-- نظام الانتخابات — 07: إصلاحات تحذيرات المستشار
-- =============================================

-- 1) إضافة SET search_path للدوال الثلاث المفقودة
CREATE OR REPLACE FUNCTION set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION lock_election_targets()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF OLD.status <> 'draft' THEN
        IF NEW.target_role_name <> OLD.target_role_name
           OR NEW.target_committee_id IS DISTINCT FROM OLD.target_committee_id
           OR NEW.target_department_id IS DISTINCT FROM OLD.target_department_id THEN
            RAISE EXCEPTION 'لا يمكن تعديل منصب/نطاق الانتخاب بعد فتح الترشح';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_vote_update()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'الأصوات نهائية ولا يمكن تعديلها أو حذفها';
END;
$$;

-- 2) حذف سياسة INSERT العامة على سجل التدقيق
--    (كل الكتابة للسجل تأتي من دوال SECURITY DEFINER التي تتجاوز RLS)
DROP POLICY IF EXISTS audit_insert_any ON election_audit_log;

