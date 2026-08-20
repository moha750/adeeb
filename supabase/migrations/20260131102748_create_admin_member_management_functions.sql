-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260131102748   الاسم: create_admin_member_management_functions

-- دالة لتحديث البريد الإلكتروني للعضو (رئيس النادي فقط)
CREATE OR REPLACE FUNCTION update_member_email(
    p_user_id UUID,
    p_new_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role_level INT;
    v_result JSON;
BEGIN
    -- التحقق من صلاحية المستخدم الحالي (يجب أن يكون رئيس النادي - المستوى 10)
    SELECT r.role_level INTO v_caller_role_level
    FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid();
    
    IF v_caller_role_level IS NULL OR v_caller_role_level < 10 THEN
        RAISE EXCEPTION 'غير مصرح لك بتنفيذ هذا الإجراء';
    END IF;
    
    -- التحقق من أن البريد الإلكتروني الجديد غير مستخدم
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_new_email AND id != p_user_id) THEN
        RAISE EXCEPTION 'البريد الإلكتروني مستخدم بالفعل';
    END IF;
    
    -- تحديث البريد الإلكتروني في auth.users
    UPDATE auth.users
    SET email = p_new_email,
        raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'::jsonb),
            '{email}',
            to_jsonb(p_new_email)
        ),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- تحديث البريد الإلكتروني في profiles
    UPDATE profiles
    SET email = p_new_email,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    v_result := json_build_object(
        'success', true,
        'message', 'تم تحديث البريد الإلكتروني بنجاح',
        'user_id', p_user_id,
        'new_email', p_new_email
    );
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- دالة لتحديث كلمة المرور للعضو (رئيس النادي فقط)
CREATE OR REPLACE FUNCTION update_member_password(
    p_user_id UUID,
    p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role_level INT;
    v_result JSON;
    v_password_hash TEXT;
BEGIN
    -- التحقق من صلاحية المستخدم الحالي (يجب أن يكون رئيس النادي - المستوى 10)
    SELECT r.role_level INTO v_caller_role_level
    FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid();
    
    IF v_caller_role_level IS NULL OR v_caller_role_level < 10 THEN
        RAISE EXCEPTION 'غير مصرح لك بتنفيذ هذا الإجراء';
    END IF;
    
    -- التحقق من طول كلمة المرور
    IF LENGTH(p_new_password) < 8 THEN
        RAISE EXCEPTION 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    END IF;
    
    -- تشفير كلمة المرور باستخدام crypt
    v_password_hash := crypt(p_new_password, gen_salt('bf'));
    
    -- تحديث كلمة المرور في auth.users
    UPDATE auth.users
    SET encrypted_password = v_password_hash,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    v_result := json_build_object(
        'success', true,
        'message', 'تم تحديث كلمة المرور بنجاح',
        'user_id', p_user_id
    );
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION update_member_email(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_member_password(UUID, TEXT) TO authenticated;
