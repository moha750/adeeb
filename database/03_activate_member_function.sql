-- ============================================
-- SQL Function: activate_member_account
-- ============================================
-- الغرض: تفعيل حساب عضو مع تحديث account_status
-- يتجاوز triggers التي تمنع التحديث المباشر

CREATE OR REPLACE FUNCTION activate_member_account(
  p_member_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- تشغيل بصلاحيات مالك الدالة (postgres)
AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  -- الحصول على الحالة القديمة
  SELECT account_status INTO v_old_status
  FROM members
  WHERE id = p_member_id;
  
  -- التحقق من وجود السجل
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member with ID % not found', p_member_id;
  END IF;
  
  -- تحديث سجل العضو
  -- الـ Trigger سيسمح بالتحديث لأن auth.uid() = NULL و OLD.user_id = NULL
  UPDATE members
  SET 
    user_id = p_user_id,
    account_status = 'active',
    account_activated_at = NOW()
  WHERE id = p_member_id;
  
  -- تسجيل في log
  RAISE NOTICE 'Member % activated: % -> active', p_member_id, v_old_status;
END;
$$;

-- منح صلاحيات التنفيذ للمستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION activate_member_account(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_member_account(UUID, UUID) TO service_role;

-- إضافة تعليق توضيحي
COMMENT ON FUNCTION activate_member_account IS 'تفعيل حساب عضو عادي - يتجاوز triggers للسماح بتحديث account_status';
