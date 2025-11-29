-- ============================================
-- إصلاح خطأ Trigger: column "is_admin" is ambiguous
-- ============================================

-- الخيار 1: حذف الـ Trigger مؤقتاً (الأسرع)
-- ============================================

DROP TRIGGER IF EXISTS trigger_prevent_sensitive_update ON members;
DROP FUNCTION IF EXISTS prevent_sensitive_fields_update();

-- الآن جرب التفعيل - يجب أن يعمل!

-- ============================================
-- الخيار 2: إصلاح الـ Function (الأفضل)
-- ============================================

-- إعادة إنشاء الـ Function بشكل صحيح
CREATE OR REPLACE FUNCTION prevent_sensitive_fields_update()
RETURNS TRIGGER AS $$
DECLARE
  user_is_admin BOOLEAN;  -- تغيير الاسم لتجنب الغموض
BEGIN
  -- التحقق إذا كان المستخدم إداري
  SELECT EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.user_id = auth.uid() 
    AND admins.is_admin = true  -- استخدام admins.is_admin بوضوح
  ) INTO user_is_admin;
  
  -- إذا لم يكن إداري، منع تعديل الحقول الحساسة
  IF NOT user_is_admin THEN
    -- السماح بتحديث user_id من NULL فقط (للتفعيل)
    IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
      -- السماح بالتفعيل
      NULL;
    ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'لا يمكن تعديل user_id';
    END IF;
    
    -- السماح بتحديث account_status من pending إلى active (للتفعيل)
    IF OLD.account_status = 'pending' AND NEW.account_status = 'active' THEN
      -- السماح بالتفعيل
      NULL;
    ELSIF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
      RAISE EXCEPTION 'لا يمكن تعديل حالة الحساب';
    END IF;
    
    -- السماح بتحديث account_activated_at من NULL (للتفعيل)
    IF OLD.account_activated_at IS NULL AND NEW.account_activated_at IS NOT NULL THEN
      -- السماح بالتفعيل
      NULL;
    ELSIF NEW.account_activated_at IS DISTINCT FROM OLD.account_activated_at THEN
      RAISE EXCEPTION 'لا يمكن تعديل تاريخ التفعيل';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء الـ Trigger
DROP TRIGGER IF EXISTS trigger_prevent_sensitive_update ON members;
CREATE TRIGGER trigger_prevent_sensitive_update
BEFORE UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION prevent_sensitive_fields_update();

-- ============================================
-- التحقق من النتيجة
-- ============================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'members';

-- يجب أن ترى:
-- trigger_prevent_sensitive_update | UPDATE | members

-- ============================================
