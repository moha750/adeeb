-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260325021609   الاسم: add_profile_slug_to_member_details


-- إضافة حقل profile_slug لتخزين معرف فريد لكل عضو
ALTER TABLE member_details
ADD COLUMN IF NOT EXISTS profile_slug TEXT UNIQUE;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN member_details.profile_slug IS 'معرف فريد للملف الشخصي العام - يُستخدم في الروابط المشاركة (مثل: adeeb.club/profile/ahmed-ali)';

-- إنشاء دالة لتوليد slug فريد من الاسم
CREATE OR REPLACE FUNCTION generate_profile_slug(full_name TEXT, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- تحويل الاسم إلى slug (إزالة المسافات واستبدالها بـ -)
    base_slug := LOWER(TRIM(REGEXP_REPLACE(full_name, '\s+', '-', 'g')));
    
    -- إذا كان الـ slug فارغاً، استخدم جزء من user_id
    IF base_slug = '' OR base_slug IS NULL THEN
        base_slug := 'member-' || SUBSTRING(p_user_id::TEXT, 1, 8);
    END IF;
    
    final_slug := base_slug;
    
    -- التحقق من عدم وجود slug مكرر
    WHILE EXISTS (SELECT 1 FROM member_details WHERE profile_slug = final_slug AND user_id != p_user_id) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- تحديث السجلات الموجودة لتوليد slug لكل عضو
UPDATE member_details
SET profile_slug = generate_profile_slug(full_name_triple, user_id)
WHERE profile_slug IS NULL;

-- إنشاء trigger لتوليد slug تلقائياً عند الإدراج أو التحديث
CREATE OR REPLACE FUNCTION auto_generate_profile_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا لم يتم تحديد slug أو تم تغيير الاسم
    IF NEW.profile_slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.full_name_triple != NEW.full_name_triple AND NEW.profile_slug = OLD.profile_slug) THEN
        NEW.profile_slug := generate_profile_slug(NEW.full_name_triple, NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_profile_slug ON member_details;
CREATE TRIGGER trigger_auto_generate_profile_slug
    BEFORE INSERT OR UPDATE ON member_details
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_profile_slug();

-- إضافة index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_member_details_profile_slug ON member_details(profile_slug);

