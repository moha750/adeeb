# إصلاح مشاكل اللجان والبرزخ

## المشاكل المكتشفة

### 1. خطأ POST عند تحميل اللجان
**الخطأ:**
```
POST https://nnlhkfeybyhvlinbqqfa.supabase.co/rest/v1/membership_interviews?select=* 400 (Bad Request)
```

**السبب:**
- سياسات RLS في جدول `membership_interviews` تستخدم دالة `check_permission()` 
- هذه الدالة قد تسبب مشاكل في الأداء أو أخطاء 400
- الخطأ يحدث عند تحميل أي قسم يحاول الوصول للجدول

**الحل:**
تطبيق Migration: `supabase/migrations/048_fix_interviews_rls_policies.sql`

### 2. خطأ عمود notes غير موجود
**الخطأ:**
```
Could not find the 'notes' column of 'membership_interviews' in the schema cache
```

**السبب:**
- الكود يحاول إضافة بيانات لعمود `notes` غير موجود في الجدول
- العمود مطلوب لحفظ أسباب الرفض

**الحل:**
تطبيق Migration: `supabase/migrations/047_add_notes_to_interviews.sql`

---

## خطوات التطبيق السريع

### عبر Supabase Dashboard

1. افتح [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **SQL Editor**
4. انسخ والصق الكود التالي وشغله:

```sql
-- ==========================================
-- الخطوة 1: إضافة عمود notes
-- ==========================================
ALTER TABLE membership_interviews 
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN membership_interviews.notes IS 'ملاحظات إدارية وأسباب الرفض أو القبول';

UPDATE membership_interviews 
SET notes = result_notes 
WHERE notes IS NULL AND result_notes IS NOT NULL;

-- ==========================================
-- الخطوة 2: إصلاح سياسات RLS
-- ==========================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "allow_admin_select_interviews" ON membership_interviews;
DROP POLICY IF EXISTS "allow_admin_insert_interviews" ON membership_interviews;
DROP POLICY IF EXISTS "allow_admin_update_interviews" ON membership_interviews;
DROP POLICY IF EXISTS "allow_superadmin_delete_interviews" ON membership_interviews;

-- إنشاء سياسات جديدة

-- القراءة - مستوى 7+
CREATE POLICY "allow_admin_select_interviews"
ON membership_interviews
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
);

-- الإدراج - مستوى 8+
CREATE POLICY "allow_admin_insert_interviews"
ON membership_interviews
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 8
    )
);

-- التحديث - مستوى 8+
CREATE POLICY "allow_admin_update_interviews"
ON membership_interviews
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 8
    )
);

-- الحذف - مستوى 10
CREATE POLICY "allow_superadmin_delete_interviews"
ON membership_interviews
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 10
    )
);
```

5. اضغط **Run** أو **F5**
6. تأكد من ظهور رسالة نجاح

---

## التحقق من النجاح

بعد تطبيق الإصلاحات:

### ✅ اختبار تحميل اللجان
1. اذهب إلى **إدارة اللجان**
2. يجب أن يتم التحميل بسرعة بدون أخطاء في Console
3. يجب ظهور اللجان مع عدد الأعضاء والمشاريع

### ✅ اختبار رفض من البرزخ
1. اذهب إلى قسم **البرزخ**
2. اختر متقدم واضغط **حذف/رفض**
3. اختر أحد الخيارات:
   - منسحب من المقابلة
   - لا يرد على التواصل
   - سبب آخر (مع كتابة السبب)
4. اضغط **تأكيد الرفض**
5. يجب أن يعمل بدون أخطاء
6. يجب نقل المتقدم لقائمة المرفوضين في **نتائج العضوية**

---

## الملفات المعدلة

### ملفات JavaScript
- ✅ `admin/dashboard.js` - إصلاح تحميل اللجان
- ✅ `admin/js/membership-manager.js` - إضافة ميزة الرفض من البرزخ

### ملفات Migration
- 📄 `supabase/migrations/047_add_notes_to_interviews.sql`
- 📄 `supabase/migrations/048_fix_interviews_rls_policies.sql`

---

## ملاحظات مهمة

⚠️ **يجب تطبيق الـ Migrations على قاعدة البيانات**
- الكود الجديد لن يعمل بدون تطبيق الـ SQL أعلاه
- يمكن تطبيقه عبر Dashboard أو CLI

⚠️ **بعد التطبيق**
- قد تحتاج لتحديث الصفحة (F5)
- تأكد من تسجيل الدخول بحساب مستوى 8+

✅ **الميزات الجديدة**
- زر حذف/رفض في البرزخ
- نافذة منبثقة احترافية مع 3 خيارات
- حفظ السبب في قاعدة البيانات
- نقل تلقائي للمرفوضين
