-- ============================================
-- إصلاح Trigger للسماح بالتفعيل من SECURITY DEFINER
-- ============================================

-- حذف الـ Trigger القديم
DROP TRIGGER IF EXISTS trigger_prevent_sensitive_update ON members;

-- تعديل الدالة لتسمح بالتحديث من SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION prevent_sensitive_fields_update()
RETURNS TRIGGER AS $$
DECLARE
  user_is_admin BOOLEAN;
  is_from_activation_function BOOLEAN;
BEGIN
  -- التحقق إذا كان التحديث من دالة SECURITY DEFINER
  -- عندما يكون auth.uid() NULL والـ user_id يتم تعيينه، هذا يعني التفعيل
  is_from_activation_function := (
    auth.uid() IS NULL 
    AND OLD.user_id IS NULL 
    AND NEW.user_id IS NOT NULL
  );
  
  -- السماح بالتحديث من دالة التفعيل
  IF is_from_activation_function THEN
    RETURN NEW;
  END IF;
  
  -- التحقق إذا كان المستخدم إداري
  SELECT EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.user_id = auth.uid() 
    AND admins.is_admin = true
  ) INTO user_is_admin;
  
  -- إذا كان إداري، السماح بكل شيء
  IF user_is_admin THEN
    RETURN NEW;
  END IF;
  
  -- للمستخدمين العاديين، منع تعديل الحقول الحساسة
  
  -- منع تعديل user_id
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'لا يمكن تعديل user_id';
  END IF;
  
  -- منع تعديل account_status
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION 'لا يمكن تعديل حالة الحساب';
  END IF;
  
  -- منع تعديل account_activated_at
  IF NEW.account_activated_at IS DISTINCT FROM OLD.account_activated_at THEN
    RAISE EXCEPTION 'لا يمكن تعديل تاريخ التفعيل';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء الـ Trigger
CREATE TRIGGER trigger_prevent_sensitive_update
BEFORE UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION prevent_sensitive_fields_update();

-- تعليق توضيحي
COMMENT ON FUNCTION prevent_sensitive_fields_update IS 'منع تعديل الحقول الحساسة - مع السماح للتفعيل من SECURITY DEFINER functions';
