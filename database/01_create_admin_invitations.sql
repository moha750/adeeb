-- ============================================
-- جدول دعوات الإداريين
-- ============================================
-- هذا الجدول منفصل تماماً عن member_invitations
-- ويستخدم فقط لدعوة الإداريين الجدد

CREATE TABLE IF NOT EXISTS admin_invitations (
  -- المعرف الفريد
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- معلومات الإداري المدعو
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  
  -- المسمى الوظيفي والمستوى
  position text NOT NULL, -- مثل: "قائد لجنة الإعلام", "نائب رئيس النادي"
  admin_level integer NOT NULL DEFAULT 4, -- 1=رئيس، 2=نائب، 3=قائد لجنة، 4=مسؤول، 5=رئيس تنفيذي
  admin_type text NOT NULL DEFAULT 'admin_officer', -- president, vice, committee_leader, admin_officer, executive_president
  
  -- الصلاحيات الممنوحة (JSON)
  permissions jsonb DEFAULT '{}'::jsonb,
  
  -- رمز التفعيل
  invitation_token text UNIQUE NOT NULL,
  
  -- حالة الدعوة
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  
  -- من أرسل الدعوة
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by_name text,
  invited_by_position text,
  
  -- ملاحظات إضافية
  notes text,
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- Indexes للأداء
-- ============================================

CREATE INDEX IF NOT EXISTS idx_admin_invitations_token 
  ON admin_invitations(invitation_token);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_status 
  ON admin_invitations(status);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_email 
  ON admin_invitations(email);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_invited_by 
  ON admin_invitations(invited_by);

-- ============================================
-- Trigger لتحديث updated_at تلقائياً
-- ============================================

CREATE OR REPLACE FUNCTION update_admin_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_invitations_updated_at
  BEFORE UPDATE ON admin_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_invitations_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- الإداريون فقط يمكنهم قراءة الدعوات
CREATE POLICY "Admins can read admin invitations"
  ON admin_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.is_admin = true
    )
  );

-- لا أحد يمكنه الكتابة مباشرة (فقط عبر Edge Functions)
CREATE POLICY "No direct writes to admin invitations"
  ON admin_invitations FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No direct updates to admin invitations"
  ON admin_invitations FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct deletes to admin invitations"
  ON admin_invitations FOR DELETE
  TO authenticated
  USING (false);

-- ============================================
-- Comments للتوثيق
-- ============================================

COMMENT ON TABLE admin_invitations IS 'جدول دعوات الإداريين - منفصل تماماً عن دعوات الأعضاء العاديين';
COMMENT ON COLUMN admin_invitations.admin_level IS '1=رئيس النادي، 2=نائب الرئيس، 3=قائد لجنة، 4=مسؤول إداري، 5=رئيس تنفيذي';
COMMENT ON COLUMN admin_invitations.permissions IS 'صلاحيات الإداري بصيغة JSON مثل: {"members": true, "stats": true, "works": false}';
COMMENT ON COLUMN admin_invitations.invitation_token IS 'رمز التفعيل الفريد المرسل في البريد الإلكتروني';
