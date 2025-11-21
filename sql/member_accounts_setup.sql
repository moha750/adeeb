-- ============================================
-- سكريبت إعداد نظام حسابات الأعضاء
-- نادي أديب - جامعة الملك فيصل
-- ============================================

-- 1. إضافة أعمدة جديدة لجدول members
-- ============================================

-- إضافة عمود user_id لربط العضو بحساب Supabase Auth
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- إضافة فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

-- إضافة عمود لتتبع حالة الحساب
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'pending' 
CHECK (account_status IN ('pending', 'active', 'suspended', 'inactive'));

-- إضافة عمود لتاريخ آخر تسجيل دخول
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- إضافة عمود لتاريخ تفعيل الحساب
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS account_activated_at TIMESTAMPTZ;

-- 2. إنشاء جدول دعوات الأعضاء
-- ============================================

CREATE TABLE IF NOT EXISTS member_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_invitations_token ON member_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_member ON member_invitations(member_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON member_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON member_invitations(email);

-- 3. إنشاء جدول سجل نشاط الأعضاء
-- ============================================

CREATE TABLE IF NOT EXISTS member_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'login', 'logout', 'profile_update', 'password_change', 
    'email_change', 'account_activated', 'account_suspended'
  )),
  activity_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_activity_member ON member_activity_log(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON member_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON member_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON member_activity_log(created_at DESC);

-- 4. إعداد Row Level Security (RLS)
-- ============================================

-- تفعيل RLS على جدول members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- السماح للأعضاء بقراءة بياناتهم فقط
DROP POLICY IF EXISTS "Members can read own data" ON members;
CREATE POLICY "Members can read own data"
ON members FOR SELECT
USING (auth.uid() = user_id);

-- السماح للأعضاء بتحديث بياناتهم فقط (باستثناء بعض الحقول الحساسة)
DROP POLICY IF EXISTS "Members can update own data" ON members;
CREATE POLICY "Members can update own data"
ON members FOR UPDATE
USING (auth.uid() = user_id);

-- السماح للإداريين بقراءة كل البيانات
DROP POLICY IF EXISTS "Admins can read all members" ON members;
CREATE POLICY "Admins can read all members"
ON members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- السماح للإداريين بإضافة أعضاء جدد
DROP POLICY IF EXISTS "Admins can insert members" ON members;
CREATE POLICY "Admins can insert members"
ON members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- السماح للإداريين بإدارة كل الأعضاء (تحديث وحذف)
DROP POLICY IF EXISTS "Admins can manage all members" ON members;
CREATE POLICY "Admins can manage all members"
ON members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- 5. إعداد RLS لجدول member_invitations
-- ============================================

ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;

-- السماح للإداريين فقط بقراءة الدعوات
DROP POLICY IF EXISTS "Admins can read invitations" ON member_invitations;
CREATE POLICY "Admins can read invitations"
ON member_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- السماح للإداريين بإنشاء دعوات
DROP POLICY IF EXISTS "Admins can create invitations" ON member_invitations;
CREATE POLICY "Admins can create invitations"
ON member_invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- السماح للإداريين بتحديث الدعوات
DROP POLICY IF EXISTS "Admins can update invitations" ON member_invitations;
CREATE POLICY "Admins can update invitations"
ON member_invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- السماح بقراءة الدعوة باستخدام التوكن (للتفعيل)
DROP POLICY IF EXISTS "Public can read invitation by token" ON member_invitations;
CREATE POLICY "Public can read invitation by token"
ON member_invitations FOR SELECT
USING (true); -- سيتم التحقق من التوكن في التطبيق

-- 6. إعداد RLS لجدول member_activity_log
-- ============================================

ALTER TABLE member_activity_log ENABLE ROW LEVEL SECURITY;

-- السماح للأعضاء بقراءة سجل نشاطهم فقط
DROP POLICY IF EXISTS "Members can read own activity" ON member_activity_log;
CREATE POLICY "Members can read own activity"
ON member_activity_log FOR SELECT
USING (auth.uid() = user_id);

-- السماح للإداريين بقراءة كل السجلات
DROP POLICY IF EXISTS "Admins can read all activity" ON member_activity_log;
CREATE POLICY "Admins can read all activity"
ON member_activity_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- السماح بإدراج سجلات النشاط (سيتم التحقق في التطبيق)
DROP POLICY IF EXISTS "Allow insert activity log" ON member_activity_log;
CREATE POLICY "Allow insert activity log"
ON member_activity_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 7. إنشاء دوال مساعدة
-- ============================================

-- دالة للتحقق من انتهاء صلاحية الدعوة
CREATE OR REPLACE FUNCTION is_invitation_valid(token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM member_invitations
    WHERE invitation_token = token
    AND status = 'pending'
    AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث حالة الدعوات المنتهية تلقائياً
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE member_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتسجيل نشاط العضو
CREATE OR REPLACE FUNCTION log_member_activity(
  p_member_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_activity_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO member_activity_log (
    member_id, user_id, activity_type, activity_details, 
    ip_address, user_agent
  )
  VALUES (
    p_member_id, p_user_id, p_activity_type, p_activity_details,
    p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث آخر تسجيل دخول
CREATE OR REPLACE FUNCTION update_member_last_login()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type = 'login' THEN
    UPDATE members
    SET last_login = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لتحديث آخر تسجيل دخول تلقائياً
DROP TRIGGER IF EXISTS trigger_update_last_login ON member_activity_log;
CREATE TRIGGER trigger_update_last_login
AFTER INSERT ON member_activity_log
FOR EACH ROW
EXECUTE FUNCTION update_member_last_login();

-- دالة لمنع تعديل الحقول الحساسة من قبل الأعضاء
CREATE OR REPLACE FUNCTION prevent_sensitive_fields_update()
RETURNS TRIGGER AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- التحقق إذا كان المستخدم إداري
  SELECT EXISTS (
    SELECT 1 FROM admins 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  ) INTO is_admin;
  
  -- إذا لم يكن إداري، منع تعديل الحقول الحساسة
  IF NOT is_admin THEN
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لمنع تعديل الحقول الحساسة
DROP TRIGGER IF EXISTS trigger_prevent_sensitive_update ON members;
CREATE TRIGGER trigger_prevent_sensitive_update
BEFORE UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION prevent_sensitive_fields_update();

-- 8. إنشاء view لعرض معلومات الأعضاء مع حالة الحساب
-- ============================================

CREATE OR REPLACE VIEW members_with_account_status AS
SELECT 
  m.id,
  m.full_name,
  m.email,
  m.phone,
  m.committee,
  m.college,
  m.major,
  m.degree,
  m.avatar_url,
  m.user_id,
  m.account_status,
  m.last_login,
  m.account_activated_at,
  m.created_at,
  CASE 
    WHEN m.user_id IS NOT NULL AND m.account_status = 'active' THEN 'مفعل'
    WHEN m.user_id IS NOT NULL AND m.account_status = 'suspended' THEN 'معلق'
    WHEN m.user_id IS NOT NULL AND m.account_status = 'inactive' THEN 'غير نشط'
    ELSE 'غير مفعل'
  END as account_status_ar,
  (
    SELECT COUNT(*) 
    FROM member_invitations mi 
    WHERE mi.member_id = m.id AND mi.status = 'pending'
  ) as pending_invitations_count,
  (
    SELECT mi.created_at 
    FROM member_invitations mi 
    WHERE mi.member_id = m.id 
    ORDER BY mi.created_at DESC 
    LIMIT 1
  ) as last_invitation_sent
FROM members m;

-- 9. إنشاء جدول إحصائيات الأعضاء
-- ============================================

CREATE TABLE IF NOT EXISTS member_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  total_logins INTEGER DEFAULT 0,
  total_events_attended INTEGER DEFAULT 0,
  total_certificates INTEGER DEFAULT 0,
  profile_completion_percentage INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهرس
CREATE INDEX IF NOT EXISTS idx_member_stats_member ON member_statistics(member_id);

-- دالة لحساب نسبة اكتمال الملف الشخصي
CREATE OR REPLACE FUNCTION calculate_profile_completion(p_member_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_fields INTEGER := 15; -- عدد الحقول الكلي
  v_filled_fields INTEGER := 0;
  v_member RECORD;
BEGIN
  SELECT * INTO v_member FROM members WHERE id = p_member_id;
  
  IF v_member.full_name IS NOT NULL AND v_member.full_name != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.email IS NOT NULL AND v_member.email != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.phone IS NOT NULL AND v_member.phone != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.college IS NOT NULL AND v_member.college != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.major IS NOT NULL AND v_member.major != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.degree IS NOT NULL AND v_member.degree != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.birth_date IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.committee IS NOT NULL AND v_member.committee != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.academic_number IS NOT NULL AND v_member.academic_number != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.national_id IS NOT NULL AND v_member.national_id != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.avatar_url IS NOT NULL AND v_member.avatar_url != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.x_handle IS NOT NULL AND v_member.x_handle != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.instagram_handle IS NOT NULL AND v_member.instagram_handle != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.tiktok_handle IS NOT NULL AND v_member.tiktok_handle != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  IF v_member.linkedin_handle IS NOT NULL AND v_member.linkedin_handle != '' THEN v_filled_fields := v_filled_fields + 1; END IF;
  
  RETURN ROUND((v_filled_fields::NUMERIC / v_total_fields::NUMERIC) * 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. تعليقات توضيحية
-- ============================================

COMMENT ON TABLE member_invitations IS 'جدول دعوات تفعيل حسابات الأعضاء';
COMMENT ON TABLE member_activity_log IS 'سجل نشاط الأعضاء في النظام';
COMMENT ON TABLE member_statistics IS 'إحصائيات نشاط الأعضاء';
COMMENT ON COLUMN members.user_id IS 'معرف المستخدم في Supabase Auth';
COMMENT ON COLUMN members.account_status IS 'حالة الحساب: pending (قيد الانتظار), active (نشط), suspended (معلق), inactive (غير نشط)';
COMMENT ON COLUMN members.last_login IS 'تاريخ آخر تسجيل دخول';
COMMENT ON COLUMN members.account_activated_at IS 'تاريخ تفعيل الحساب';

-- ============================================
-- انتهى السكريبت
-- ============================================

-- ملاحظات مهمة:
-- 1. تأكد من تشغيل هذا السكريبت من حساب له صلاحيات كافية
-- 2. راجع سياسات RLS وتأكد من أنها تناسب احتياجاتك الأمنية
-- 3. قم بعمل نسخة احتياطية من قاعدة البيانات قبل التشغيل
-- 4. اختبر السكريبت في بيئة تطوير أولاً
