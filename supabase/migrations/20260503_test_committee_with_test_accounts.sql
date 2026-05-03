-- =============================================
-- لجنة التجارب — مؤقتة لاختبار النظام (ستُحذف لاحقاً)
-- =============================================
-- ينشئ لجنة جديدة باسم "لجنة التجارب"، ثم ينقل إليها كل
-- حسابات التجربة كأعضاء (committee_member)، مع تعطيل
-- أي دور نشط حالي لهم لأن النظام يسمح بدور واحد فقط لكل عضو.

DO $$
DECLARE
    v_committee_id  INTEGER;
    v_role_id       INTEGER;
    v_assigned_by   UUID := '8dd48fe4-d01f-4fa9-90bc-1bcaf154fe22';  -- محمد إسماعيل المطر
    v_test_users    UUID[] := ARRAY[
        '539b81fa-9b56-4078-9904-86b96d4d12d1',  -- تجربة 1
        '700ced79-7312-42c2-8e60-d2c62a35d97d',  -- تجربة 2
        'e5b33211-76e0-4a0f-8bb2-469e548a3b57',  -- تجربة 3
        '60f6a5f4-277a-4a92-a111-66cbefd6bcb2',  -- تجربة 4
        '94aee8e9-8d80-4972-b903-dea2a08947b4',  -- تجربة 5
        'edee953f-883f-46ff-84be-465ca7558e1c',  -- تجربة 6
        '0bc16686-6f1b-4367-977f-b104e174f457',  -- تجربة 7
        '4eba61fc-5442-4096-9deb-1f000558bf8e',  -- تجربة 8
        '530e5b92-f24a-45ee-a32c-866ecb24cbe9',  -- تجربة 9
        '791bead3-2107-41f3-8596-ad7da9ef0887',  -- تجربة 10
        '54ddbccc-b7d5-47d9-8e82-64690d5f02b2',  -- تجربة دمية يعني
        'c2e50793-6cd8-481a-a461-345fda2f19f3'   -- تجرب بيث قف
    ]::UUID[];
    v_user_id       UUID;
BEGIN
    SELECT id INTO v_role_id FROM roles WHERE role_name = 'committee_member';
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Role committee_member not found';
    END IF;

    -- 1) إنشاء اللجنة (أو إعادة استخدامها إن وُجدت بنفس الاسم)
    SELECT id INTO v_committee_id
    FROM committees
    WHERE committee_name_ar = 'لجنة التجارب'
    LIMIT 1;

    IF v_committee_id IS NULL THEN
        INSERT INTO committees (committee_name_ar, description, is_active, department_id)
        VALUES (
            'لجنة التجارب',
            'لجنة مخصصة لاختبار النظام تحتوي حسابات التجربة فقط — مؤقتة وستُحذف لاحقاً.',
            TRUE,
            NULL
        )
        RETURNING id INTO v_committee_id;
    END IF;

    -- 2) لكل حساب تجربة: عطّل أدواره النشطة الحالية ثم أضفه للجنة الجديدة
    FOREACH v_user_id IN ARRAY v_test_users LOOP
        UPDATE user_roles
        SET is_active = FALSE
        WHERE user_id = v_user_id
          AND is_active = TRUE;

        -- منع التكرار في حال أُعيد التشغيل
        DELETE FROM user_roles
        WHERE user_id = v_user_id
          AND role_id = v_role_id
          AND committee_id = v_committee_id;

        INSERT INTO user_roles (user_id, role_id, committee_id, department_id, is_active, assigned_by, notes)
        VALUES (
            v_user_id,
            v_role_id,
            v_committee_id,
            NULL,
            TRUE,
            v_assigned_by,
            'نقل تلقائي إلى لجنة التجارب (مؤقتة)'
        );
    END LOOP;

    RAISE NOTICE 'Test committee id: %, members assigned: %', v_committee_id, array_length(v_test_users, 1);
END;
$$ LANGUAGE plpgsql;
