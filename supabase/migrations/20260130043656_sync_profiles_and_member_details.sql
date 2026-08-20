-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130043656   الاسم: sync_profiles_and_member_details

-- إضافة تعليقات توضيحية للجداول
COMMENT ON TABLE profiles IS 'جدول البيانات الأساسية لجميع المستخدمين (أعضاء وغير أعضاء). يُنشأ عند إنشاء الحساب.';
COMMENT ON TABLE member_details IS 'جدول البيانات التفصيلية للأعضاء المقبولين فقط. يُنشأ عند قبول العضوية وإكمال التسجيل.';

-- إضافة تعليقات للأعمدة المشتركة
COMMENT ON COLUMN profiles.full_name IS 'الاسم الكامل (بيانات أساسية) - يتم مزامنته مع member_details.full_name_triple';
COMMENT ON COLUMN profiles.email IS 'البريد الإلكتروني (بيانات أساسية) - يتم مزامنته مع member_details.email';
COMMENT ON COLUMN profiles.phone IS 'رقم الجوال (بيانات أساسية) - يتم مزامنته مع member_details.phone';

COMMENT ON COLUMN member_details.full_name_triple IS 'الاسم الثلاثي الكامل (نسخة محدثة من profiles.full_name)';
COMMENT ON COLUMN member_details.email IS 'البريد الإلكتروني (نسخة محدثة من profiles.email)';
COMMENT ON COLUMN member_details.phone IS 'رقم الجوال (نسخة محدثة من profiles.phone)';

-- دالة لمزامنة البيانات من member_details إلى profiles
CREATE OR REPLACE FUNCTION sync_member_details_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    -- عند تحديث member_details، نحدث profiles
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

-- Trigger لتنفيذ المزامنة عند التحديث
DROP TRIGGER IF EXISTS trigger_sync_member_details_to_profiles ON member_details;
CREATE TRIGGER trigger_sync_member_details_to_profiles
    AFTER INSERT OR UPDATE OF full_name_triple, email, phone
    ON member_details
    FOR EACH ROW
    EXECUTE FUNCTION sync_member_details_to_profiles();

-- دالة لمزامنة البيانات من profiles إلى member_details (إذا كان العضو موجود)
CREATE OR REPLACE FUNCTION sync_profiles_to_member_details()
RETURNS TRIGGER AS $$
BEGIN
    -- فقط إذا كان المستخدم لديه سجل في member_details
    UPDATE member_details
    SET 
        full_name_triple = NEW.full_name,
        email = NEW.email,
        phone = NEW.phone,
        updated_at = NOW()
    WHERE user_id = NEW.id
    AND EXISTS (SELECT 1 FROM member_details WHERE user_id = NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger لتنفيذ المزامنة عند التحديث
DROP TRIGGER IF EXISTS trigger_sync_profiles_to_member_details ON profiles;
CREATE TRIGGER trigger_sync_profiles_to_member_details
    AFTER UPDATE OF full_name, email, phone
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profiles_to_member_details();
