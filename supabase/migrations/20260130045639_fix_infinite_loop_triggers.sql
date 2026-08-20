-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130045639   الاسم: fix_infinite_loop_triggers

-- حذف الـ triggers التي تسبب حلقة لا نهائية
DROP TRIGGER IF EXISTS trigger_sync_member_details_to_profiles ON member_details;
DROP TRIGGER IF EXISTS trigger_sync_profiles_to_member_details ON profiles;

DROP FUNCTION IF EXISTS sync_member_details_to_profiles();
DROP FUNCTION IF EXISTS sync_profiles_to_member_details();

-- إنشاء دالة محسنة بدون حلقة لا نهائية
CREATE OR REPLACE FUNCTION sync_member_details_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث profiles بدون تفعيل trigger آخر
    UPDATE profiles
    SET 
        full_name = NEW.full_name_triple,
        email = NEW.email,
        phone = NEW.phone,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger فقط من member_details إلى profiles (اتجاه واحد)
CREATE TRIGGER trigger_sync_member_details_to_profiles
    AFTER INSERT OR UPDATE OF full_name_triple, email, phone
    ON member_details
    FOR EACH ROW
    EXECUTE FUNCTION sync_member_details_to_profiles();
