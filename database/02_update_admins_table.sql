-- ============================================
-- تحديث جدول admins
-- ============================================
-- إضافة أعمدة جديدة لتحسين إدارة الصلاحيات

-- إضافة عمود المستوى الإداري (إذا لم يكن موجوداً)
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS admin_level integer DEFAULT 4;

-- إضافة عمود الصلاحيات (إذا لم يكن موجوداً)
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb;

-- إضافة عمود البريد الإلكتروني (إذا لم يكن موجوداً)
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS email text;

-- إضافة عمود الاسم الكامل (إذا لم يكن موجوداً)
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS full_name text;

-- إضافة عمود تاريخ التحديث (إذا لم يكن موجوداً)
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ============================================
-- Constraints
-- ============================================

-- التأكد من أن admin_level ضمن النطاق المسموح
ALTER TABLE admins 
ADD CONSTRAINT IF NOT EXISTS check_admin_level 
CHECK (admin_level BETWEEN 1 AND 5);

-- التأكد من أن admin_type صحيح
ALTER TABLE admins 
ADD CONSTRAINT IF NOT EXISTS check_admin_type 
CHECK (admin_type IN ('president', 'vice', 'committee_leader', 'admin_officer', 'executive_president'));

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_admins_admin_level 
  ON admins(admin_level);

CREATE INDEX IF NOT EXISTS idx_admins_admin_type 
  ON admins(admin_type);

CREATE INDEX IF NOT EXISTS idx_admins_is_admin 
  ON admins(is_admin) WHERE is_admin = true;

-- ============================================
-- Trigger لتحديث updated_at تلقائياً
-- ============================================

CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_admins_updated_at ON admins;

CREATE TRIGGER trigger_update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_admins_updated_at();

-- ============================================
-- Function: تحديث المستوى الإداري من المسمى الوظيفي
-- ============================================

CREATE OR REPLACE FUNCTION sync_admin_level_from_position()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا كان المسمى يحتوي على "رئيس النادي" أو "رئيس أديب"
  IF NEW.position ~* 'رئيس.*(النادي|أديب)' AND NEW.position !~* 'نائب' THEN
    NEW.admin_level := 1;
    NEW.admin_type := 'president';
  
  -- إذا كان المسمى يحتوي على "نائب الرئيس"
  ELSIF NEW.position ~* 'نائب.*الرئيس' THEN
    NEW.admin_level := 2;
    NEW.admin_type := 'vice';
  
  -- إذا كان المسمى يحتوي على "قائد لجنة" أو "رئيس لجنة"
  ELSIF NEW.position ~* '(قائد|رئيس).*لجنة' THEN
    NEW.admin_level := 3;
    NEW.admin_type := 'committee_leader';
  
  -- إذا كان المسمى يحتوي على "رئيس تنفيذي"
  ELSIF NEW.position ~* 'رئيس.*تنفيذ' THEN
    NEW.admin_level := 5;
    NEW.admin_type := 'executive_president';
  
  -- افتراضياً: مسؤول إداري
  ELSE
    IF NEW.admin_level IS NULL THEN
      NEW.admin_level := 4;
    END IF;
    IF NEW.admin_type IS NULL THEN
      NEW.admin_type := 'admin_officer';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_admin_level ON admins;

CREATE TRIGGER trigger_sync_admin_level
  BEFORE INSERT OR UPDATE OF position ON admins
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_level_from_position();

-- ============================================
-- Function: تعيين صلاحيات افتراضية حسب المستوى
-- ============================================

CREATE OR REPLACE FUNCTION set_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا لم تكن هناك صلاحيات محددة، نعين صلاحيات افتراضية
  IF NEW.permissions = '{}'::jsonb OR NEW.permissions IS NULL THEN
    CASE NEW.admin_level
      -- رئيس النادي: كل الصلاحيات
      WHEN 1 THEN
        NEW.permissions := '{
          "stats": true,
          "home": true,
          "members": true,
          "idea_board": true,
          "profile": true,
          "works": true,
          "sponsors": true,
          "achievements": true,
          "board": true,
          "faq": true,
          "schedule": true,
          "chat": true,
          "todos": true,
          "testimonials": true,
          "admins": true,
          "membership_apps": true,
          "appointments": true,
          "push": true,
          "join": true,
          "forms": true
        }'::jsonb;
      
      -- نائب الرئيس: معظم الصلاحيات
      WHEN 2 THEN
        NEW.permissions := '{
          "stats": true,
          "home": true,
          "members": true,
          "idea_board": true,
          "profile": true,
          "works": true,
          "sponsors": true,
          "achievements": true,
          "board": true,
          "faq": true,
          "schedule": true,
          "chat": true,
          "todos": true,
          "testimonials": true,
          "admins": false,
          "membership_apps": true,
          "appointments": true,
          "push": true,
          "join": true,
          "forms": true
        }'::jsonb;
      
      -- قائد لجنة: صلاحيات متوسطة
      WHEN 3 THEN
        NEW.permissions := '{
          "stats": true,
          "home": false,
          "members": true,
          "idea_board": true,
          "profile": true,
          "works": true,
          "sponsors": false,
          "achievements": true,
          "board": false,
          "faq": false,
          "schedule": true,
          "chat": true,
          "todos": true,
          "testimonials": false,
          "admins": false,
          "membership_apps": false,
          "appointments": false,
          "push": false,
          "join": false,
          "forms": false
        }'::jsonb;
      
      -- مسؤول إداري: صلاحيات محدودة
      WHEN 4 THEN
        NEW.permissions := '{
          "stats": true,
          "home": false,
          "members": false,
          "idea_board": true,
          "profile": true,
          "works": false,
          "sponsors": false,
          "achievements": false,
          "board": false,
          "faq": false,
          "schedule": true,
          "chat": true,
          "todos": true,
          "testimonials": false,
          "admins": false,
          "membership_apps": false,
          "appointments": false,
          "push": false,
          "join": false,
          "forms": false
        }'::jsonb;
      
      -- رئيس تنفيذي: صلاحيات واسعة
      WHEN 5 THEN
        NEW.permissions := '{
          "stats": true,
          "home": true,
          "members": true,
          "idea_board": true,
          "profile": true,
          "works": true,
          "sponsors": true,
          "achievements": true,
          "board": true,
          "faq": true,
          "schedule": true,
          "chat": true,
          "todos": true,
          "testimonials": true,
          "admins": false,
          "membership_apps": true,
          "appointments": true,
          "push": true,
          "join": true,
          "forms": true
        }'::jsonb;
      
      ELSE
        NEW.permissions := '{}'::jsonb;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_default_permissions ON admins;

CREATE TRIGGER trigger_set_default_permissions
  BEFORE INSERT OR UPDATE OF admin_level ON admins
  FOR EACH ROW
  EXECUTE FUNCTION set_default_permissions();

-- ============================================
-- Comments للتوثيق
-- ============================================

COMMENT ON COLUMN admins.admin_level IS '1=رئيس النادي، 2=نائب الرئيس، 3=قائد لجنة، 4=مسؤول إداري، 5=رئيس تنفيذي';
COMMENT ON COLUMN admins.permissions IS 'صلاحيات الإداري بصيغة JSON - يتم تعيينها تلقائياً حسب المستوى أو يدوياً';
COMMENT ON COLUMN admins.admin_type IS 'نوع الإداري: president, vice, committee_leader, admin_officer, executive_president';

-- ============================================
-- تحديث البيانات الموجودة
-- ============================================

-- تحديث المستويات الإدارية للإداريين الموجودين بناءً على المسمى الوظيفي
UPDATE admins 
SET admin_level = CASE
  WHEN position ~* 'رئيس.*(النادي|أديب)' AND position !~* 'نائب' THEN 1
  WHEN position ~* 'نائب.*الرئيس' THEN 2
  WHEN position ~* '(قائد|رئيس).*لجنة' THEN 3
  WHEN position ~* 'رئيس.*تنفيذ' THEN 5
  ELSE 4
END
WHERE admin_level IS NULL OR admin_level = 4;

-- تحديث admin_type للإداريين الموجودين
UPDATE admins 
SET admin_type = CASE
  WHEN admin_level = 1 THEN 'president'
  WHEN admin_level = 2 THEN 'vice'
  WHEN admin_level = 3 THEN 'committee_leader'
  WHEN admin_level = 5 THEN 'executive_president'
  ELSE 'admin_officer'
END
WHERE admin_type IS NULL;
