# دليل استعادة نظام حجز مواعيد المقابلات

## 🚨 المشكلة

إذا عبثت بالخطأ بجداول أو سياسات أو triggers نظام الحجوزات، ستواجه مشاكل مثل:
- أخطاء عند إنشاء جلسات
- أخطاء عند حجز مواعيد
- سياسات RLS غير صحيحة
- triggers لا تعمل

---

## ✅ الحل: إعادة التعيين الكاملة

### **الخطوات:**

#### **1. حذف كل شيء متعلق بنظام الحجوزات**

افتح **Supabase SQL Editor** ونفذ:

```sql
-- حذف الـ triggers
DROP TRIGGER IF EXISTS auto_create_interview ON interview_slots;
DROP TRIGGER IF EXISTS auto_generate_slots ON interview_sessions;
DROP TRIGGER IF EXISTS auto_generate_token ON interview_sessions;
DROP TRIGGER IF EXISTS update_interview_sessions_updated_at ON interview_sessions;

-- حذف الدوال
DROP FUNCTION IF EXISTS trigger_create_interview_on_booking() CASCADE;
DROP FUNCTION IF EXISTS trigger_generate_slots() CASCADE;
DROP FUNCTION IF EXISTS trigger_generate_token() CASCADE;
DROP FUNCTION IF EXISTS generate_interview_slots(UUID, DATE, TIME, TIME, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS generate_session_token() CASCADE;
DROP FUNCTION IF EXISTS get_session_statistics(UUID) CASCADE;
DROP FUNCTION IF EXISTS validate_phone_for_booking(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS book_interview_slot(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS cancel_interview_slot(UUID, TEXT) CASCADE;

-- حذف الجداول (CASCADE سيحذف كل السياسات والفهارس)
DROP TABLE IF EXISTS interview_slots CASCADE;
DROP TABLE IF EXISTS interview_sessions CASCADE;
```

**أو استخدم الملف الجاهز:**

```bash
# في Supabase SQL Editor
# افتح ملف: supabase/migrations/036_reset_interview_booking_system.sql
# ونفذه
```

---

#### **2. إعادة تطبيق migration 036**

##### **الطريقة 1: عبر Supabase CLI (الأفضل)**

```bash
cd supabase

# إعادة تطبيق migration 036 فقط
supabase db reset --db-only

# أو تطبيق جميع migrations من جديد
supabase db push
```

##### **الطريقة 2: يدوياً عبر SQL Editor**

1. افتح ملف `supabase/migrations/036_create_interview_booking_system.sql`
2. انسخ المحتوى بالكامل
3. افتح **Supabase SQL Editor**
4. الصق المحتوى
5. اضغط **Run**

---

#### **3. التحقق من نجاح الاستعادة**

نفذ في **SQL Editor**:

```sql
-- 1. التحقق من الجداول
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('interview_sessions', 'interview_slots');

-- يجب أن يعرض:
-- interview_sessions
-- interview_slots

-- 2. التحقق من الدوال
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%interview%' 
AND routine_schema = 'public';

-- يجب أن يعرض:
-- generate_session_token
-- generate_interview_slots
-- trigger_generate_slots
-- trigger_generate_token
-- trigger_create_interview_on_booking
-- get_session_statistics
-- validate_phone_for_booking
-- book_interview_slot
-- cancel_interview_slot

-- 3. التحقق من RLS Policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('interview_sessions', 'interview_slots');

-- يجب أن يعرض 7 سياسات:
-- للجلسات: 5 سياسات
-- للفترات: 5 سياسات

-- 4. التحقق من الـ Triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table IN ('interview_sessions', 'interview_slots');

-- يجب أن يعرض:
-- auto_generate_slots (على interview_sessions)
-- auto_generate_token (على interview_sessions)
-- auto_create_interview (على interview_slots)
-- update_interview_sessions_updated_at (على interview_sessions)
```

---

## 🧪 اختبار النظام بعد الاستعادة

### **1. اختبار إنشاء جلسة:**

```sql
INSERT INTO interview_sessions (
    session_name,
    session_date,
    start_time,
    end_time,
    slot_duration,
    interview_type,
    is_active
) VALUES (
    'اختبار الاستعادة',
    CURRENT_DATE + 1,
    '09:00:00',
    '10:00:00',
    10,
    'online',
    true
);

-- التحقق من توليد الفترات تلقائياً
SELECT COUNT(*) FROM interview_slots 
WHERE session_id = (
    SELECT id FROM interview_sessions 
    WHERE session_name = 'اختبار الاستعادة'
);

-- يجب أن يعرض: 6 (ساعة واحدة × 6 فترات)
```

### **2. اختبار حجز موعد:**

```sql
-- الحصول على فترة متاحة
SELECT id FROM interview_slots 
WHERE is_booked = false 
LIMIT 1;

-- اختبار الحجز
SELECT * FROM book_interview_slot(
    '<slot_id>'::UUID,
    '<application_id>'::UUID
);

-- يجب أن يُرجع:
-- success: true
-- message: تم حجز الموعد بنجاح
-- interview_id: <uuid>
```

### **3. اختبار من لوحة التحكم:**

```
1. افتح لوحة التحكم
2. اذهب إلى "جلسات المقابلات"
3. اضغط "إنشاء جلسة جديدة"
4. املأ البيانات
5. ✅ يجب أن تنجح بدون أخطاء
```

### **4. اختبار من صفحة الحجز:**

```
1. افتح رابط حجز
2. أدخل رقم الهاتف
3. اختر فترة
4. احجز
5. ✅ يجب أن تظهر صفحة التأكيد
```

---

## 📋 قائمة التحقق الكاملة

بعد الاستعادة، تأكد من:

- [ ] الجداول موجودة (interview_sessions, interview_slots)
- [ ] الدوال موجودة (9 دوال)
- [ ] RLS Policies موجودة (10 سياسات)
- [ ] Triggers موجودة (4 triggers)
- [ ] الفهارس موجودة (6 فهارس)
- [ ] إنشاء جلسة يعمل
- [ ] توليد الفترات تلقائياً يعمل
- [ ] حجز موعد يعمل
- [ ] إنشاء مقابلة تلقائياً يعمل
- [ ] لوحة التحكم تعمل
- [ ] صفحة الحجز تعمل

---

## 🔧 استكشاف الأخطاء

### **خطأ: "relation does not exist"**

```sql
-- الحل: تأكد من تطبيق migration 036
-- أعد تطبيق الخطوة 2 أعلاه
```

### **خطأ: "function does not exist"**

```sql
-- الحل: الدوال لم يتم إنشاؤها
-- أعد تطبيق migration 036 بالكامل
```

### **خطأ: "permission denied for table"**

```sql
-- الحل: RLS Policies غير صحيحة
-- احذف الجداول وأعد تطبيق migration 036
```

### **خطأ: "trigger does not exist"**

```sql
-- الحل: Triggers لم يتم إنشاؤها
-- أعد تطبيق migration 036 بالكامل
```

---

## 🎯 نصائح لتجنب المشاكل مستقبلاً

### **1. لا تعدل مباشرة في قاعدة البيانات:**

```
❌ لا تفعل:
- تعديل الجداول يدوياً
- تعديل السياسات يدوياً
- حذف triggers يدوياً

✅ افعل:
- عدّل في ملفات migration
- أعد تطبيق migration
- استخدم version control
```

### **2. استخدم migrations دائماً:**

```bash
# إنشاء migration جديد
supabase migration new my_changes

# تعديل الملف
# ثم تطبيقه
supabase db push
```

### **3. احتفظ بنسخة احتياطية:**

```bash
# قبل أي تعديل كبير
supabase db dump > backup.sql

# للاستعادة
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

### **4. اختبر في بيئة تطوير أولاً:**

```
1. أنشئ مشروع Supabase تجريبي
2. اختبر التعديلات هناك
3. إذا نجحت، طبقها في الإنتاج
```

---

## 📁 الملفات المهمة

### **للاستعادة:**
- `supabase/migrations/036_reset_interview_booking_system.sql` - حذف كل شيء
- `supabase/migrations/036_create_interview_booking_system.sql` - إعادة الإنشاء

### **للتوثيق:**
- `BOOKING_SYSTEM_GUIDE.md` - دليل النظام الكامل
- `BUGFIX_036_MIGRATION.md` - إصلاح خطأ role_level
- `BUGFIX_RLS_INTERVIEW_SLOTS.md` - إصلاح خطأ RLS
- `BUGFIX_AMBIGUOUS_INTERVIEW_ID.md` - إصلاح خطأ الغموض
- `RECOVERY_GUIDE_INTERVIEW_BOOKING.md` - هذا الملف

---

## ✨ الخلاصة

**إذا عبثت بالجداول أو السياسات:**

1. ✅ نفذ `036_reset_interview_booking_system.sql` لحذف كل شيء
2. ✅ أعد تطبيق `036_create_interview_booking_system.sql`
3. ✅ تحقق من نجاح الاستعادة
4. ✅ اختبر النظام

**النظام سيعود للعمل بشكل طبيعي!** 🎉

---

## 🆘 إذا واجهت مشاكل

إذا لم تنجح الاستعادة:

1. تأكد من تنفيذ جميع أوامر الحذف
2. تأكد من عدم وجود أخطاء في migration 036
3. تحقق من logs في Supabase Dashboard
4. جرّب في مشروع جديد للتأكد من صحة migration

**في حالة الطوارئ:** أنشئ مشروع Supabase جديد وطبق جميع migrations من الصفر.
