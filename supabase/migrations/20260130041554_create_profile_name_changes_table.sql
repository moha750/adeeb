-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130041554   الاسم: create_profile_name_changes_table

-- جدول لتتبع تغييرات الأسماء (مرة واحدة شهريًا)
CREATE TABLE IF NOT EXISTS profile_name_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    old_name TEXT NOT NULL,
    new_name TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT,
    approved BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- إنشاء فهرس لتسريع البحث
CREATE INDEX IF NOT EXISTS idx_profile_name_changes_user_id ON profile_name_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_name_changes_changed_at ON profile_name_changes(changed_at);

-- تفعيل RLS
ALTER TABLE profile_name_changes ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة: المستخدم يمكنه قراءة سجلاته فقط
CREATE POLICY "Users can view their own name changes"
    ON profile_name_changes
    FOR SELECT
    USING (auth.uid() = user_id);

-- سياسة للإدراج: المستخدم يمكنه إضافة سجل جديد
CREATE POLICY "Users can insert their own name changes"
    ON profile_name_changes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- دالة للتحقق من إمكانية تغيير الاسم (مرة واحدة شهريًا)
CREATE OR REPLACE FUNCTION can_change_name(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    last_change_date TIMESTAMPTZ;
BEGIN
    SELECT changed_at INTO last_change_date
    FROM profile_name_changes
    WHERE user_id = p_user_id
    ORDER BY changed_at DESC
    LIMIT 1;
    
    -- إذا لم يكن هناك تغيير سابق، يمكن التغيير
    IF last_change_date IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- التحقق من مرور 30 يومًا على الأقل
    RETURN (NOW() - last_change_date) >= INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
