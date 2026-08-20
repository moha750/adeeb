-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130214410   الاسم: create_get_pending_members_function

-- إنشاء دالة لجلب الأعضاء المعلقين مع بياناتهم من profiles
CREATE OR REPLACE FUNCTION get_pending_members()
RETURNS TABLE (
    id uuid,
    user_id uuid,
    token text,
    interview_id uuid,
    application_id uuid,
    is_used boolean,
    used_at timestamptz,
    expires_at timestamptz,
    sent_to_email text,
    email_sent_at timestamptz,
    created_at timestamptz,
    profile jsonb
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        mot.id,
        mot.user_id,
        mot.token,
        mot.interview_id,
        mot.application_id,
        mot.is_used,
        mot.used_at,
        mot.expires_at,
        mot.sent_to_email,
        mot.email_sent_at,
        mot.created_at,
        jsonb_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'email', p.email,
            'phone', p.phone,
            'account_status', p.account_status,
            'created_at', p.created_at
        ) as profile
    FROM member_onboarding_tokens mot
    LEFT JOIN profiles p ON mot.user_id = p.id
    WHERE mot.is_used = false
    ORDER BY mot.created_at DESC;
$$;
