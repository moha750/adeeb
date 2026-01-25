# 🚨 تطبيق Migration على قاعدة البيانات - خطوات بسيطة

## ⚠️ المشكلة الحالية

الكود تم تحديثه على Git ✅  
لكن قاعدة البيانات **لم تُحدث بعد** ❌

**النتيجة**: الدالة القديمة لا تزال تعمل في قاعدة البيانات

---

## 📋 الحل - 3 خطوات بسيطة

### الخطوة 1️⃣: افتح Supabase Dashboard

1. اذهب إلى: https://supabase.com/dashboard
2. سجل الدخول
3. اختر مشروع **adeeb** (nnlhkfeybyhvlinbqqfa)

### الخطوة 2️⃣: افتح SQL Editor

1. من القائمة الجانبية اختر **SQL Editor**
2. اضغط **New Query**

### الخطوة 3️⃣: نسخ ولصق وتشغيل

انسخ الكود التالي **بالكامل** والصقه في SQL Editor:

```sql
-- ============================================================================
-- إصلاح مشكلة التحقق من رقم الهاتف - تطبيق فوري
-- ============================================================================

-- 1. إنشاء دالة توحيد الأرقام
CREATE OR REPLACE FUNCTION normalize_phone(p_phone TEXT)
RETURNS TEXT AS $$
BEGIN
    IF p_phone IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- إزالة جميع المسافات والرموز والأحرف غير الرقمية
    p_phone := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');
    
    -- إزالة الأصفار البادئة الزائدة
    p_phone := LTRIM(p_phone, '0');
    
    -- إذا كان الرقم يبدأ بـ 966 (كود السعودية)، نزيله
    IF p_phone LIKE '966%' THEN
        p_phone := SUBSTRING(p_phone FROM 4);
    END IF;
    
    -- إضافة 0 في البداية إذا لم يكن موجوداً
    IF NOT p_phone LIKE '0%' THEN
        p_phone := '0' || p_phone;
    END IF;
    
    -- التأكد من أن الرقم يبدأ بـ 05
    IF NOT p_phone LIKE '05%' THEN
        RETURN NULL;
    END IF;
    
    -- التأكد من أن الطول 10 أرقام
    IF LENGTH(p_phone) != 10 THEN
        RETURN NULL;
    END IF;
    
    RETURN p_phone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. تحديث دالة validate_phone_for_booking
CREATE OR REPLACE FUNCTION validate_phone_for_booking(
    p_phone TEXT,
    p_session_id UUID
)
RETURNS TABLE (
    is_valid BOOLEAN,
    application_id UUID,
    full_name TEXT,
    email TEXT,
    preferred_committee TEXT,
    error_message TEXT,
    has_existing_booking BOOLEAN,
    existing_slot_id UUID,
    existing_slot_time TIMESTAMPTZ,
    existing_slot_end_time TIMESTAMPTZ,
    existing_interview_id UUID
) AS $$
DECLARE
    app_record RECORD;
    existing_booking RECORD;
    normalized_phone TEXT;
BEGIN
    -- توحيد صيغة رقم الهاتف المدخل
    normalized_phone := normalize_phone(p_phone);
    
    -- التحقق من صحة الرقم بعد التوحيد
    IF normalized_phone IS NULL THEN
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            'رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'::TEXT,
            false,
            NULL::UUID,
            NULL::TIMESTAMPTZ,
            NULL::TIMESTAMPTZ,
            NULL::UUID;
        RETURN;
    END IF;
    
    -- البحث عن الطلب بناءً على رقم الهاتف الموحد
    SELECT * INTO app_record
    FROM membership_applications
    WHERE normalize_phone(phone) = normalized_phone
    AND status = 'approved_for_interview'
    LIMIT 1;
    
    -- إذا لم يتم العثور على الطلب
    IF app_record IS NULL THEN
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            'رقم الهاتف غير مسجل أو الطلب غير مقبول للمقابلة'::TEXT,
            false,
            NULL::UUID,
            NULL::TIMESTAMPTZ,
            NULL::TIMESTAMPTZ,
            NULL::UUID;
        RETURN;
    END IF;
    
    -- التحقق من وجود حجز مسبق في نفس الجلسة
    SELECT 
        interview_slots.id,
        interview_slots.slot_time,
        interview_slots.slot_end_time,
        interview_slots.interview_id
    INTO existing_booking
    FROM interview_slots
    WHERE session_id = p_session_id
    AND booked_by = app_record.id
    AND is_booked = true
    AND cancelled_at IS NULL
    LIMIT 1;
    
    -- إذا كان هناك حجز موجود
    IF existing_booking IS NOT NULL THEN
        RETURN QUERY SELECT 
            false,
            app_record.id,
            app_record.full_name,
            app_record.email,
            app_record.preferred_committee,
            'لديك موعد محجوز مسبقاً في هذه الجلسة'::TEXT,
            true,
            existing_booking.id,
            existing_booking.slot_time,
            existing_booking.slot_end_time,
            existing_booking.interview_id;
        RETURN;
    END IF;
    
    -- الطلب صالح للحجز
    RETURN QUERY SELECT 
        true,
        app_record.id,
        app_record.full_name,
        app_record.email,
        app_record.preferred_committee,
        NULL::TEXT,
        false,
        NULL::UUID,
        NULL::TIMESTAMPTZ,
        NULL::TIMESTAMPTZ,
        NULL::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. إنشاء Index للأداء
CREATE INDEX IF NOT EXISTS idx_membership_applications_normalized_phone 
ON membership_applications (normalize_phone(phone))
WHERE status = 'approved_for_interview';

-- 4. رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE '✅ تم تطبيق الإصلاح بنجاح!';
    RAISE NOTICE '📌 الآن يمكن التحقق من الأرقام بجميع الصيغ';
END $$;
```

ثم اضغط **Run** أو **F5**

---

## ✅ التحقق من النجاح

بعد التشغيل، يجب أن ترى:

```
✅ تم تطبيق الإصلاح بنجاح!
📌 الآن يمكن التحقق من الأرقام بجميع الصيغ
```

---

## 🧪 اختبار الدالة

في نفس SQL Editor، شغّل هذا الاختبار:

```sql
-- اختبار دالة التوحيد
SELECT 
    '0551234567' as original,
    normalize_phone('0551234567') as normalized;

-- اختبار دالة التحقق
SELECT * FROM validate_phone_for_booking(
    '0551234567',  -- استبدل برقمك
    'YOUR_SESSION_ID'  -- استبدل بـ session_id من جدول interview_sessions
);
```

يجب أن ترى `is_valid: true` ✅

---

## 🎯 بعد التطبيق

1. ✅ ارجع لصفحة الحجز
2. ✅ جرب إدخال الرقم مرة أخرى
3. ✅ يجب أن يعمل الآن على جميع المتصفحات!

---

## ❓ إذا ظهر خطأ

### خطأ: "permission denied"
**الحل**: تأكد أنك مسجل دخول كـ Owner في المشروع

### خطأ: "function already exists"
**الحل**: هذا طبيعي، الدالة تم تحديثها بنجاح ✅

### خطأ آخر
**الحل**: انسخ رسالة الخطأ وأرسلها لي

---

## 📞 الدعم

إذا واجهت أي مشكلة:
1. التقط Screenshot للخطأ
2. انسخ رسالة الخطأ كاملة
3. أرسلها لي

---

## ✨ النتيجة المتوقعة

بعد التطبيق:
- ✅ يعمل على جميع المتصفحات
- ✅ يقبل جميع صيغ الأرقام
- ✅ لا توجد مشاكل في التحقق

**جرب الآن! 🚀**
