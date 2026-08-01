-- =============================================
-- تتبّع إرسال رسالة القبول النهائي عبر واتساب
-- =============================================
-- يضيف:
--   1. عمودان جديدان على membership_interviews لتتبّع إرسال رسالة القبول
--      (acceptance_message_sent_at / acceptance_message_sent_by)
--   2. RPC: mark_acceptance_message_sent — لتسجيل إرسال الرسالة (إدارة فقط، level >= 7)

-- =============================================
-- 1. أعمدة جديدة على membership_interviews
-- =============================================
ALTER TABLE membership_interviews
    ADD COLUMN IF NOT EXISTS acceptance_message_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS acceptance_message_sent_by UUID REFERENCES auth.users(id);

-- =============================================
-- 2. RPC: تسجيل إرسال رسالة القبول (إدارة فقط)
-- =============================================
-- Idempotent: إعادة الاستدعاء تُحدِّث التاريخ — لدعم إعادة الإرسال إذا لزم.
-- شرط: لا يمكن تسجيل إرسال لمقابلة نتيجتها ليست "accepted".
CREATE OR REPLACE FUNCTION mark_acceptance_message_sent(p_interview_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id  UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_result   TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = v_user_id
          AND ur.is_active = true
          AND r.role_level >= 7
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;

    SELECT result INTO v_result
    FROM membership_interviews
    WHERE id = p_interview_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INTERVIEW_NOT_FOUND';
    END IF;

    IF v_result IS DISTINCT FROM 'accepted' THEN
        RAISE EXCEPTION 'NOT_ACCEPTED';
    END IF;

    UPDATE membership_interviews
    SET acceptance_message_sent_at = now(),
        acceptance_message_sent_by = v_user_id
    WHERE id = p_interview_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 3. صلاحيات
-- =============================================
GRANT EXECUTE ON FUNCTION mark_acceptance_message_sent(UUID) TO authenticated;
