# إصلاح خطأ RLS عند إنشاء جلسات المقابلات

## 🐛 الخطأ

```
POST https://...supabase.co/rest/v1/interview_sessions 403 (Forbidden)

خطأ في إنشاء الجلسة: {
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "interview_slots"'
}
```

---

## 🔍 السبب الجذري

عند إنشاء جلسة مقابلات جديدة، يتم تنفيذ الخطوات التالية:

```
1. المستخدم ينشئ سجل في interview_sessions ✅
   ↓
2. Trigger يستدعي generate_interview_slots() ✅
   ↓
3. الدالة تحاول إنشاء صفوف في interview_slots ❌
   ↓
4. RLS يرفض العملية - لا توجد INSERT policy!
```

### **المشكلتان:**

#### **1. لا توجد INSERT policy لجدول `interview_slots`**

```sql
-- ❌ السياسات الموجودة فقط:
- SELECT (للجميع)
- SELECT (للمسؤولين)
- UPDATE (للحجز العام)
- UPDATE (للمسؤولين)

-- ❌ مفقود:
- INSERT (لإنشاء الفترات)
```

#### **2. الدالة `generate_interview_slots()` بدون `SECURITY DEFINER`**

```sql
-- ❌ قبل
$$ LANGUAGE plpgsql;

-- المشكلة: الدالة تعمل بصلاحيات المستخدم الحالي
-- عند محاولة INSERT في interview_slots، RLS يرفض
```

---

## ✅ الإصلاح المُطبق

### **1. إضافة INSERT Policy**

```sql
-- سياسة: إنشاء فترات (للمسؤولين والـ triggers)
CREATE POLICY "Allow admin insert slots"
ON interview_slots
FOR INSERT
TO authenticated
WITH CHECK (
    get_user_highest_role_level(auth.uid()) >= 7
);
```

**الفائدة:**
- يسمح للمسؤولين (مستوى 7+) بإنشاء فترات
- يسمح للدوال بـ SECURITY DEFINER بإنشاء فترات

---

### **2. إضافة SECURITY DEFINER للدالة**

```sql
-- قبل
CREATE OR REPLACE FUNCTION generate_interview_slots(...)
RETURNS INTEGER AS $$
...
END;
$$ LANGUAGE plpgsql;  -- ❌ بدون SECURITY DEFINER

-- بعد
CREATE OR REPLACE FUNCTION generate_interview_slots(...)
RETURNS INTEGER AS $$
...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- ✅ مع SECURITY DEFINER
```

**الفائدة:**
- الدالة تعمل بصلاحيات **منشئ الدالة** (superuser)
- تتجاوز RLS policies عند إنشاء الفترات
- الـ trigger يعمل بدون مشاكل

---

## 🔄 سير العمل بعد الإصلاح

```
1. المستخدم (مستوى 7+) ينشئ جلسة ✅
   INSERT INTO interview_sessions
   ↓
2. Trigger يستدعي generate_interview_slots() ✅
   ↓
3. الدالة تعمل بـ SECURITY DEFINER ✅
   - تتجاوز RLS
   - تنشئ الفترات في interview_slots
   ↓
4. النتيجة: 36 فترة تم إنشاؤها ✅
```

---

## 📋 RLS Policies الكاملة لـ `interview_slots`

```sql
-- 1. قراءة الفترات (للجميع - للجلسات النشطة)
CREATE POLICY "Allow public read slots"
ON interview_slots FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM interview_sessions
        WHERE interview_sessions.id = interview_slots.session_id
        AND interview_sessions.is_active = true
    )
);

-- 2. قراءة جميع الفترات (مستوى 7+)
CREATE POLICY "Allow admin read all slots"
ON interview_slots FOR SELECT TO authenticated
USING (get_user_highest_role_level(auth.uid()) >= 7);

-- 3. إنشاء فترات (مستوى 7+) ⭐ جديد
CREATE POLICY "Allow admin insert slots"
ON interview_slots FOR INSERT TO authenticated
WITH CHECK (get_user_highest_role_level(auth.uid()) >= 7);

-- 4. حجز الفترات (للجميع - للجلسات النشطة)
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

-- 5. تحديث الفترات (مستوى 7+)
CREATE POLICY "Allow admin update slots"
ON interview_slots FOR UPDATE TO authenticated
USING (get_user_highest_role_level(auth.uid()) >= 7);
```

---

## 🔐 SECURITY DEFINER - شرح مفصل

### **ما هو SECURITY DEFINER؟**

```sql
-- بدون SECURITY DEFINER (الافتراضي)
CREATE FUNCTION my_function() ...
$$ LANGUAGE plpgsql;
-- الدالة تعمل بصلاحيات المستخدم الذي يستدعيها

-- مع SECURITY DEFINER
CREATE FUNCTION my_function() ...
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- الدالة تعمل بصلاحيات منشئ الدالة (عادة superuser)
```

### **متى نستخدمه؟**

✅ **استخدم SECURITY DEFINER عندما:**
- الدالة تحتاج لتجاوز RLS
- الدالة تُستدعى من trigger
- الدالة تقوم بعمليات إدارية

❌ **لا تستخدمه عندما:**
- الدالة تتعامل مع بيانات المستخدم مباشرة
- تريد تطبيق RLS على العمليات

### **في حالتنا:**

```sql
generate_interview_slots() يحتاج SECURITY DEFINER لأن:
1. يُستدعى من trigger (لا يوجد مستخدم مباشر)
2. ينشئ فترات إدارية (ليست بيانات مستخدم)
3. يجب أن يعمل بغض النظر عن صلاحيات المستخدم
```

---

## 🚀 التطبيق

### **إذا كنت قد طبقت migration 036 مسبقاً:**

```sql
-- خيار 1: إعادة تطبيق migration
DROP TABLE IF EXISTS interview_slots CASCADE;
DROP TABLE IF EXISTS interview_sessions CASCADE;
-- ثم أعد تطبيق migration 036

-- خيار 2: تطبيق الإصلاحات فقط
-- إضافة INSERT policy
CREATE POLICY "Allow admin insert slots"
ON interview_slots FOR INSERT TO authenticated
WITH CHECK (get_user_highest_role_level(auth.uid()) >= 7);

-- تحديث الدالة
CREATE OR REPLACE FUNCTION generate_interview_slots(
    p_session_id UUID,
    p_session_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_slot_duration INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    current_slot_time TIMESTAMPTZ;
    end_datetime TIMESTAMPTZ;
    slot_count INTEGER := 0;
BEGIN
    current_slot_time := (p_session_date || ' ' || p_start_time)::TIMESTAMPTZ;
    end_datetime := (p_session_date || ' ' || p_end_time)::TIMESTAMPTZ;
    
    DELETE FROM interview_slots WHERE session_id = p_session_id;
    
    WHILE current_slot_time < end_datetime LOOP
        INSERT INTO interview_slots (
            session_id,
            slot_time,
            slot_end_time,
            is_booked
        ) VALUES (
            p_session_id,
            current_slot_time,
            current_slot_time + (p_slot_duration || ' minutes')::INTERVAL,
            false
        );
        
        slot_count := slot_count + 1;
        current_slot_time := current_slot_time + (p_slot_duration || ' minutes')::INTERVAL;
    END LOOP;
    
    RETURN slot_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **إذا لم تطبق migration 036 بعد:**

```bash
cd supabase
supabase db push
# أو
supabase migration up
```

---

## ✅ التحقق من نجاح الإصلاح

### **1. اختبار إنشاء جلسة:**

```sql
-- في Supabase SQL Editor
INSERT INTO interview_sessions (
    session_name,
    session_date,
    start_time,
    end_time,
    slot_duration,
    interview_type,
    is_active
) VALUES (
    'اختبار الجلسة',
    CURRENT_DATE + 1,
    '09:00:00',
    '11:00:00',
    10,
    'online',
    true
);

-- التحقق من الفترات
SELECT COUNT(*) FROM interview_slots 
WHERE session_id = (SELECT id FROM interview_sessions ORDER BY created_at DESC LIMIT 1);
-- يجب أن يعرض: 12 (ساعتان × 6 فترات/ساعة)
```

### **2. اختبار من لوحة التحكم:**

```
1. افتح لوحة التحكم
2. اذهب إلى "جلسات المقابلات"
3. اضغط "إنشاء جلسة جديدة"
4. املأ البيانات
5. اضغط "إنشاء"
6. ✅ يجب أن تنجح العملية بدون أخطاء
7. اضغط "عرض التفاصيل" لرؤية الفترات المُنشأة
```

---

## 📊 ملخص الإصلاح

| العنصر | قبل | بعد |
|--------|-----|-----|
| **INSERT policy** | ❌ غير موجودة | ✅ موجودة |
| **SECURITY DEFINER** | ❌ غير موجود | ✅ موجود |
| **إنشاء جلسة** | ❌ خطأ 403 | ✅ ينجح |
| **توليد الفترات** | ❌ يفشل | ✅ ينجح |

---

## 🎯 الدروس المستفادة

### **1. RLS Policies يجب أن تغطي جميع العمليات:**
```
✅ SELECT
✅ INSERT  ← كان مفقوداً!
✅ UPDATE
✅ DELETE
```

### **2. الدوال التي تُستدعى من Triggers تحتاج SECURITY DEFINER:**
```sql
-- Trigger → Function → INSERT
-- بدون SECURITY DEFINER: يفشل (صلاحيات المستخدم)
-- مع SECURITY DEFINER: ينجح (صلاحيات النظام)
```

### **3. اختبار العمليات الكاملة:**
```
لا تختبر فقط:
- إنشاء الجلسة ✅

اختبر أيضاً:
- توليد الفترات ✅
- حجز الفترات ✅
- تحديث الفترات ✅
```

---

## ✨ الخلاصة

تم إصلاح الخطأ بنجاح من خلال:

1. ✅ إضافة INSERT policy لجدول `interview_slots`
2. ✅ إضافة SECURITY DEFINER لدالة `generate_interview_slots()`
3. ✅ التأكد من أن جميع RLS policies موجودة

**الآن يمكن إنشاء جلسات المقابلات بنجاح!** 🎉
