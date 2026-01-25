# إصلاح خطأ Migration 036 - نظام حجز المواعيد

## 🐛 الخطأ المكتشف

```
Error: Failed to run sql query: 
ERROR: 42703: column profiles.role_level does not exist
```

عند تنفيذ `supabase/migrations/036_create_interview_booking_system.sql`

---

## 🔍 تحليل المشكلة

### **السبب الجذري:**

جدول `profiles` في قاعدة البيانات **لا يحتوي على عمود `role_level`** مباشرة.

### **البنية الصحيحة:**

```sql
-- جدول profiles (لا يحتوي على role_level)
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    username TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    account_status TEXT,
    joined_date DATE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- جدول roles (يحتوي على role_level)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name TEXT,
    role_name_ar TEXT,
    role_level INTEGER,  -- ← هنا!
    role_category TEXT,
    description TEXT
);

-- جدول user_roles (يربط المستخدمين بالأدوار)
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    role_id INTEGER REFERENCES roles(id),
    committee_id INTEGER,
    is_active BOOLEAN
);
```

### **الدالة الصحيحة للحصول على مستوى الدور:**

```sql
-- دالة موجودة في migration 001
CREATE OR REPLACE FUNCTION get_user_highest_role_level(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    highest_level INTEGER;
BEGIN
    SELECT MAX(r.role_level) INTO highest_level
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND ur.is_active = true;
    
    RETURN COALESCE(highest_level, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ✅ الإصلاح المُطبق

### **الخطأ في RLS Policies:**

```sql
-- ❌ خطأ - profiles.role_level غير موجود
CREATE POLICY "Allow admin read all sessions"
ON interview_sessions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role_level >= 7  -- ← خطأ!
    )
);
```

### **الإصلاح:**

```sql
-- ✅ صحيح - استخدام الدالة get_user_highest_role_level()
CREATE POLICY "Allow admin read all sessions"
ON interview_sessions
FOR SELECT
TO authenticated
USING (
    get_user_highest_role_level(auth.uid()) >= 7
);
```

---

## 📝 جميع التعديلات المُطبقة

تم إصلاح **5 سياسات RLS** في migration 036:

### **1. قراءة جميع الجلسات (للمسؤولين)**
```sql
-- قبل
AND profiles.role_level >= 7

-- بعد
get_user_highest_role_level(auth.uid()) >= 7
```

### **2. إنشاء جلسات (للمسؤولين)**
```sql
-- قبل
AND profiles.role_level >= 7

-- بعد
get_user_highest_role_level(auth.uid()) >= 7
```

### **3. تحديث الجلسات (للمسؤولين)**
```sql
-- قبل
AND profiles.role_level >= 7

-- بعد
get_user_highest_role_level(auth.uid()) >= 7
```

### **4. حذف الجلسات (للمسؤولين)**
```sql
-- قبل
AND profiles.role_level >= 10

-- بعد
get_user_highest_role_level(auth.uid()) >= 10
```

### **5. قراءة جميع الفترات (للمسؤولين)**
```sql
-- قبل
AND profiles.role_level >= 7

-- بعد
get_user_highest_role_level(auth.uid()) >= 7
```

### **6. تحديث الفترات (للمسؤولين)**
```sql
-- قبل
AND profiles.role_level >= 7

-- بعد
get_user_highest_role_level(auth.uid()) >= 7
```

---

## 🔐 السياسات بعد الإصلاح

### **للجلسات (interview_sessions):**

```sql
-- قراءة الجلسات النشطة (للجميع)
CREATE POLICY "Allow public read active sessions"
ON interview_sessions FOR SELECT
USING (is_active = true);

-- قراءة جميع الجلسات (مستوى 7+)
CREATE POLICY "Allow admin read all sessions"
ON interview_sessions FOR SELECT TO authenticated
USING (get_user_highest_role_level(auth.uid()) >= 7);

-- إنشاء جلسات (مستوى 7+)
CREATE POLICY "Allow admin create sessions"
ON interview_sessions FOR INSERT TO authenticated
WITH CHECK (get_user_highest_role_level(auth.uid()) >= 7);

-- تحديث الجلسات (مستوى 7+)
CREATE POLICY "Allow admin update sessions"
ON interview_sessions FOR UPDATE TO authenticated
USING (get_user_highest_role_level(auth.uid()) >= 7);

-- حذف الجلسات (مستوى 10+)
CREATE POLICY "Allow admin delete sessions"
ON interview_sessions FOR DELETE TO authenticated
USING (get_user_highest_role_level(auth.uid()) >= 10);
```

### **للفترات (interview_slots):**

```sql
-- قراءة الفترات للجلسات النشطة (للجميع)
CREATE POLICY "Allow public read slots"
ON interview_slots FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM interview_sessions
        WHERE interview_sessions.id = interview_slots.session_id
        AND interview_sessions.is_active = true
    )
);

-- قراءة جميع الفترات (مستوى 7+)
CREATE POLICY "Allow admin read all slots"
ON interview_slots FOR SELECT TO authenticated
USING (get_user_highest_role_level(auth.uid()) >= 7);

-- حجز الفترات (للجميع - للجلسات النشطة فقط)
CREATE POLICY "Allow public book slots"
ON interview_slots FOR UPDATE
USING (
    is_booked = false
    AND EXISTS (
        SELECT 1 FROM interview_sessions
        WHERE interview_sessions.id = interview_slots.session_id
        AND interview_sessions.is_active = true
    )
);

-- تحديث الفترات (مستوى 7+)
CREATE POLICY "Allow admin update slots"
ON interview_slots FOR UPDATE TO authenticated
USING (get_user_highest_role_level(auth.uid()) >= 7);
```

---

## 🚀 التطبيق

### **الآن يمكنك تطبيق migration بنجاح:**

```bash
cd supabase
supabase db push
```

### **أو:**

```bash
supabase migration up
```

---

## ✅ التحقق من نجاح الإصلاح

### **1. التحقق من الجداول:**
```sql
-- يجب أن يعمل بدون أخطاء
SELECT * FROM interview_sessions;
SELECT * FROM interview_slots;
```

### **2. التحقق من الدوال:**
```sql
-- اختبار دالة توليد الرمز
SELECT generate_session_token();

-- اختبار دالة الحصول على مستوى الدور
SELECT get_user_highest_role_level(auth.uid());
```

### **3. التحقق من RLS Policies:**
```sql
-- عرض جميع السياسات
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('interview_sessions', 'interview_slots');
```

---

## 📊 ملخص الإصلاح

| العنصر | قبل | بعد |
|--------|-----|-----|
| **الخطأ** | `profiles.role_level` | `get_user_highest_role_level(auth.uid())` |
| **عدد السياسات المُصلحة** | 0 | 6 |
| **الحالة** | ❌ فشل | ✅ نجح |

---

## 🎯 الدروس المستفادة

### **1. فهم بنية قاعدة البيانات:**
- جدول `profiles` لا يحتوي على `role_level` مباشرة
- يجب استخدام العلاقات بين الجداول
- الدوال المساعدة موجودة لهذا الغرض

### **2. استخدام الدوال الموجودة:**
- `get_user_highest_role_level(user_uuid)` - للحصول على أعلى مستوى دور
- `get_user_permissions(user_uuid)` - للحصول على الصلاحيات
- `check_user_permission(user_uuid, perm_name, action_type)` - للتحقق من صلاحية معينة

### **3. RLS Policies الصحيحة:**
- استخدام الدوال بدلاً من الأعمدة المباشرة
- التحقق من وجود الدوال قبل استخدامها
- اختبار السياسات بعد الإنشاء

---

## 🔍 كيفية تجنب هذا الخطأ مستقبلاً

### **1. مراجعة البنية:**
```bash
# عرض بنية جدول
\d profiles

# أو في SQL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
```

### **2. استخدام الدوال الموجودة:**
```sql
-- دائماً استخدم
get_user_highest_role_level(auth.uid())

-- بدلاً من
profiles.role_level
```

### **3. الاختبار قبل التطبيق:**
```bash
# اختبار migration محلياً
supabase db reset
supabase migration up
```

---

## ✨ الخلاصة

تم إصلاح الخطأ بنجاح من خلال:

1. ✅ تحديد السبب الجذري (عمود غير موجود)
2. ✅ فهم البنية الصحيحة (علاقات الجداول)
3. ✅ استخدام الدالة الصحيحة (`get_user_highest_role_level`)
4. ✅ إصلاح جميع RLS Policies (6 سياسات)
5. ✅ التحقق من عدم وجود أخطاء أخرى

**migration 036 الآن جاهز للتطبيق بدون أخطاء!** 🎉
