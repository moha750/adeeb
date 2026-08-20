-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130044528   الاسم: clarify_profiles_for_members_only

-- توضيح أن جدول profiles مخصص للأعضاء فقط وليس لمستخدمين عاديين
COMMENT ON TABLE profiles IS 'جدول البيانات الأساسية لأعضاء نادي أدِيب (الهيكل الإداري والأعضاء). يُنشأ عند قبول العضو وإنشاء حسابه.';

COMMENT ON TABLE member_details IS 'جدول البيانات التفصيلية الإلزامية لأعضاء النادي. يُنشأ بعد قبول العضوية وإكمال نموذج التسجيل.';

-- تحديث التعليقات للأعمدة
COMMENT ON COLUMN profiles.full_name IS 'الاسم الكامل للعضو (بيانات أساسية)';
COMMENT ON COLUMN profiles.email IS 'البريد الإلكتروني للعضو';
COMMENT ON COLUMN profiles.phone IS 'رقم الجوال للعضو';
COMMENT ON COLUMN profiles.account_status IS 'حالة حساب العضو: active (نشط), inactive (غير نشط), suspended (موقوف)';

COMMENT ON COLUMN member_details.full_name_triple IS 'الاسم الثلاثي الكامل للعضو (مطلوب للبيانات الرسمية)';
COMMENT ON COLUMN member_details.national_id IS 'رقم الهوية الوطنية (مطلوب)';
COMMENT ON COLUMN member_details.birth_date IS 'تاريخ الميلاد (مطلوب)';
COMMENT ON COLUMN member_details.academic_record_number IS 'رقم السجل الأكاديمي (مطلوب)';
COMMENT ON COLUMN member_details.committee_id IS 'اللجنة التي ينتمي إليها العضو';

-- ملاحظة: النظام مصمم لأعضاء النادي فقط
-- جدول profiles: بيانات أساسية لجميع الأعضاء (من رئيس النادي إلى عضو اللجنة)
-- جدول member_details: بيانات تفصيلية إضافية للأعضاء
-- العلاقة: كل عضو له سجل في profiles (إلزامي) وقد يكون له سجل في member_details (بعد إكمال التسجيل)
