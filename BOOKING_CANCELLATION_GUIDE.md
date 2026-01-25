# دليل تحسين نظام الحجز: إلغاء وإعادة الحجز

## 📋 نظرة عامة

تم تطوير نظام حجز مواعيد المقابلات لدعم الميزات التالية:

✅ **عرض الحجز الحالي** - عند إدخال رقم جوال محجوز مسبقاً، يتم عرض تفاصيل الحجز بدلاً من رفض الطلب  
✅ **حذف الحجز** - إمكانية حذف الموعد المحجوز من قاعدة البيانات  
✅ **إعادة الحجز** - السماح بحجز موعد جديد بعد حذف الحجز القديم  
✅ **منع الحجوزات المتعددة** - التأكد من عدم وجود أكثر من حجز نشط لنفس رقم الجوال

---

## 🔄 سير العمل الجديد

### **السيناريو 1: مستخدم جديد (لا يوجد حجز مسبق)**

```
1. المستخدم يدخل رقم الجوال ✅
   ↓
2. النظام يتحقق من الرقم ✅
   ↓
3. لا يوجد حجز مسبق ✅
   ↓
4. عرض صفحة اختيار الموعد ✅
   ↓
5. المستخدم يحجز موعد ✅
```

### **السيناريو 2: مستخدم لديه حجز مسبق**

```
1. المستخدم يدخل رقم الجوال ✅
   ↓
2. النظام يتحقق من الرقم ✅
   ↓
3. يوجد حجز مسبق! ⚠️
   ↓
4. عرض صفحة الحجز الحالي مع التفاصيل ✅
   ↓
5. خيارات المستخدم:
   
   أ) حذف الموعد:
      - تأكيد الحذف
      - حذف من قاعدة البيانات
      - حذف المقابلة المرتبطة
      - الانتقال لاختيار موعد جديد ✅
   
   ب) الرجوع:
      - العودة لصفحة إدخال الرقم
```

---

## 🗄️ التغييرات في قاعدة البيانات

### **1. تعديل دالة `validate_phone_for_booking`**

#### **قبل التحديث:**

```sql
RETURNS TABLE (
    is_valid BOOLEAN,
    application_id UUID,
    full_name TEXT,
    email TEXT,
    preferred_committee TEXT,
    error_message TEXT
)
```

**المشكلة:** ترجع فقط رسالة خطأ عند وجود حجز مسبق، بدون تفاصيل الحجز.

#### **بعد التحديث:**

```sql
RETURNS TABLE (
    is_valid BOOLEAN,
    application_id UUID,
    full_name TEXT,
    email TEXT,
    preferred_committee TEXT,
    error_message TEXT,
    has_existing_booking BOOLEAN,      -- ← جديد
    existing_slot_id UUID,             -- ← جديد
    existing_slot_time TIMESTAMPTZ,    -- ← جديد
    existing_slot_end_time TIMESTAMPTZ,-- ← جديد
    existing_interview_id UUID         -- ← جديد
)
```

**الفائدة:** الآن ترجع جميع تفاصيل الحجز الحالي إن وجد.

---

### **2. دالة جديدة: `cancel_booking`**

```sql
CREATE OR REPLACE FUNCTION cancel_booking(
    p_slot_id UUID,
    p_application_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
```

**الوظيفة:**
1. التحقق من وجود الفترة
2. التحقق من أن الفترة محجوزة
3. التحقق من أن المستخدم هو من حجزها
4. إلغاء الحجز (تحديث `interview_slots`)
5. حذف المقابلة المرتبطة من `membership_interviews`

**الأمان:**
- تستخدم `SECURITY DEFINER` لتجاوز RLS
- تتحقق من صلاحية المستخدم قبل الحذف
- تمنع حذف حجوزات الآخرين

---

## 💻 التغييرات في الواجهة الأمامية

### **1. تعديلات في `booking.js`**

#### **أ) متغيرات جديدة:**

```javascript
let existingBookingData = null;  // لتخزين بيانات الحجز الحالي
```

#### **ب) عناصر DOM جديدة:**

```javascript
const elements = {
    // ... العناصر الموجودة
    
    // Existing Booking Step
    existingBookingStep: document.getElementById('existingBookingStep'),
    existingBookingName: document.getElementById('existingBookingName'),
    existingBookingDate: document.getElementById('existingBookingDate'),
    existingBookingTime: document.getElementById('existingBookingTime'),
    existingBookingMeetingLink: document.getElementById('existingBookingMeetingLink'),
    existingMeetingLinkCard: document.getElementById('existingMeetingLinkCard'),
    existingBookingLocation: document.getElementById('existingBookingLocation'),
    existingLocationCard: document.getElementById('existingLocationCard'),
    cancelBookingBtn: document.getElementById('cancelBookingBtn'),
    backToPhoneFromExisting: document.getElementById('backToPhoneFromExisting')
};
```

#### **ج) تعديل معالج التحقق من رقم الهاتف:**

```javascript
// قبل
if (!result.is_valid) {
    showPhoneError(result.error_message);
    return;
}

// بعد
// التحقق من وجود حجز مسبق
if (result.has_existing_booking) {
    existingBookingData = {
        slotId: result.existing_slot_id,
        slotTime: result.existing_slot_time,
        slotEndTime: result.existing_slot_end_time,
        interviewId: result.existing_interview_id
    };
    showExistingBookingStep();
    return;
}

if (!result.is_valid) {
    showPhoneError(result.error_message);
    return;
}
```

#### **د) دالة جديدة: `showExistingBookingStep()`**

```javascript
function showExistingBookingStep() {
    hideAllSteps();
    elements.existingBookingStep.style.display = 'block';

    // عرض معلومات المتقدم
    elements.existingBookingName.textContent = applicantData.name;

    // تنسيق التاريخ والوقت
    const slotTime = new Date(existingBookingData.slotTime);
    const slotEndTime = new Date(existingBookingData.slotEndTime);

    elements.existingBookingDate.textContent = slotTime.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const timeStr = slotTime.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
    }) + ' - ' + slotEndTime.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
    });
    elements.existingBookingTime.textContent = timeStr;

    // رابط المقابلة أو الموقع
    if (sessionData.interview_type === 'online' && sessionData.meeting_link) {
        elements.existingMeetingLinkCard.style.display = 'flex';
        elements.existingBookingMeetingLink.href = sessionData.meeting_link;
    } else if (sessionData.location) {
        elements.existingLocationCard.style.display = 'flex';
        elements.existingBookingLocation.textContent = sessionData.location;
    }
}
```

#### **هـ) معالج زر حذف الحجز:**

```javascript
elements.cancelBookingBtn.addEventListener('click', async () => {
    const confirmed = confirm('هل أنت متأكد من حذف هذا الموعد؟');
    if (!confirmed) return;

    elements.cancelBookingBtn.disabled = true;
    elements.cancelBookingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحذف...';

    try {
        const { data, error } = await window.sbClient
            .rpc('cancel_booking', {
                p_slot_id: existingBookingData.slotId,
                p_application_id: applicantData.id
            });

        if (error) throw error;

        const result = data[0];

        if (!result.success) {
            alert('خطأ: ' + result.message);
            elements.cancelBookingBtn.disabled = false;
            elements.cancelBookingBtn.innerHTML = '<i class="fas fa-trash"></i> حذف الموعد';
            return;
        }

        existingBookingData = null;
        alert('تم حذف الموعد بنجاح. يمكنك الآن حجز موعد جديد.');
        
        elements.cancelBookingBtn.disabled = false;
        elements.cancelBookingBtn.innerHTML = '<i class="fas fa-trash"></i> حذف الموعد';
        
        await showSlotStep();

    } catch (error) {
        console.error('خطأ في حذف الحجز:', error);
        alert('حدث خطأ أثناء حذف الحجز. يرجى المحاولة مرة أخرى');
        elements.cancelBookingBtn.disabled = false;
        elements.cancelBookingBtn.innerHTML = '<i class="fas fa-trash"></i> حذف الموعد';
    }
});
```

---

### **2. واجهة HTML موجودة مسبقاً في `booking.html`**

صفحة `existingBookingStep` موجودة بالفعل في `booking.html` (السطور 94-171):

```html
<!-- Step 1.5: Existing Booking -->
<div id="existingBookingStep" class="booking-card" style="display: none;">
    <div class="warning-icon">
        <i class="fas fa-calendar-check"></i>
    </div>
    <h2>لديك موعد محجوز مسبقاً</h2>
    <p>يوجد لديك موعد محجوز في هذه الجلسة</p>

    <div class="confirmation-details">
        <!-- بطاقة الاسم -->
        <div class="detail-card">
            <div class="detail-icon">
                <i class="fas fa-user"></i>
            </div>
            <div class="detail-content">
                <span class="detail-label">الاسم</span>
                <span class="detail-value" id="existingBookingName"></span>
            </div>
        </div>

        <!-- بطاقة التاريخ -->
        <div class="detail-card">
            <div class="detail-icon">
                <i class="fas fa-calendar-alt"></i>
            </div>
            <div class="detail-content">
                <span class="detail-label">التاريخ</span>
                <span class="detail-value" id="existingBookingDate"></span>
            </div>
        </div>

        <!-- بطاقة الوقت -->
        <div class="detail-card">
            <div class="detail-icon">
                <i class="fas fa-clock"></i>
            </div>
            <div class="detail-content">
                <span class="detail-label">الوقت</span>
                <span class="detail-value" id="existingBookingTime"></span>
            </div>
        </div>

        <!-- رابط المقابلة (للمقابلات الأونلاين) -->
        <div class="detail-card" id="existingMeetingLinkCard" style="display: none;">
            <div class="detail-icon">
                <i class="fas fa-video"></i>
            </div>
            <div class="detail-content">
                <span class="detail-label">رابط المقابلة</span>
                <a href="#" id="existingBookingMeetingLink" target="_blank" class="detail-value link">
                    انقر هنا للانضمام
                </a>
            </div>
        </div>

        <!-- الموقع (للمقابلات الحضورية) -->
        <div class="detail-card" id="existingLocationCard" style="display: none;">
            <div class="detail-icon">
                <i class="fas fa-map-marker-alt"></i>
            </div>
            <div class="detail-content">
                <span class="detail-label">الموقع</span>
                <span class="detail-value" id="existingBookingLocation"></span>
            </div>
        </div>
    </div>

    <div class="alert alert-warning">
        <i class="fas fa-info-circle"></i>
        <p>إذا كنت تريد حجز موعد آخر، يجب عليك حذف الموعد الحالي أولاً</p>
    </div>

    <div class="confirmation-actions">
        <button id="cancelBookingBtn" class="btn btn-danger">
            <i class="fas fa-trash"></i>
            حذف الموعد
        </button>
        <button id="backToPhoneFromExisting" class="btn btn-secondary">
            <i class="fas fa-arrow-right"></i>
            رجوع
        </button>
    </div>
</div>
```

---

## 🚀 التطبيق

### **الخطوة 1: تطبيق Migration 037**

```bash
cd supabase
supabase db push
```

**أو يدوياً في Supabase SQL Editor:**

```sql
-- نفذ محتوى ملف:
-- supabase/migrations/037_enhance_booking_cancellation.sql
```

---

### **الخطوة 2: التحقق من التطبيق**

```sql
-- 1. التحقق من تحديث validate_phone_for_booking
SELECT 
    routine_name,
    data_type
FROM information_schema.routines
WHERE routine_name = 'validate_phone_for_booking';

-- 2. التحقق من إنشاء cancel_booking
SELECT 
    routine_name,
    data_type
FROM information_schema.routines
WHERE routine_name = 'cancel_booking';

-- يجب أن يعرض الدالتين
```

---

## 🧪 اختبار النظام

### **اختبار 1: مستخدم جديد (بدون حجز مسبق)**

```
1. افتح رابط الحجز
2. أدخل رقم جوال جديد (05xxxxxxxx)
3. ✅ يجب أن ينتقل لصفحة اختيار الموعد
4. احجز موعد
5. ✅ يجب أن تظهر صفحة التأكيد
```

---

### **اختبار 2: مستخدم لديه حجز مسبق**

```
1. افتح رابط الحجز
2. أدخل رقم جوال محجوز مسبقاً
3. ✅ يجب أن تظهر صفحة "لديك موعد محجوز مسبقاً"
4. تحقق من عرض:
   - الاسم ✅
   - التاريخ ✅
   - الوقت ✅
   - رابط المقابلة أو الموقع ✅
```

---

### **اختبار 3: حذف الحجز**

```
1. من صفحة الحجز الحالي
2. اضغط "حذف الموعد"
3. ✅ يجب أن تظهر رسالة تأكيد
4. أكد الحذف
5. ✅ يجب أن يتم الحذف بنجاح
6. ✅ يجب الانتقال لصفحة اختيار موعد جديد
```

---

### **اختبار 4: إعادة الحجز بعد الحذف**

```
1. بعد حذف الحجز القديم
2. اختر موعد جديد
3. ✅ يجب أن يتم الحجز بنجاح
4. ✅ يجب أن تظهر صفحة التأكيد
```

---

### **اختبار 5: منع الحجوزات المتعددة**

```sql
-- في SQL Editor
-- محاولة حجز نفس الجوال مرتين

-- الحجز الأول
SELECT * FROM book_interview_slot(
    '<slot_id_1>'::UUID,
    '<application_id>'::UUID
);
-- ✅ يجب أن ينجح

-- محاولة الحجز مرة أخرى
SELECT * FROM validate_phone_for_booking(
    '0501234567',
    '<session_id>'::UUID
);
-- ✅ يجب أن يرجع has_existing_booking = true
```

---

## 📊 ملخص التغييرات

| المكون | التغيير | الحالة |
|--------|---------|--------|
| **قاعدة البيانات** |
| `validate_phone_for_booking` | إضافة 5 أعمدة جديدة لبيانات الحجز | ✅ |
| `cancel_booking` | دالة جديدة لحذف الحجز | ✅ |
| **الواجهة الأمامية** |
| `booking.js` | إضافة معالج للحجز الحالي | ✅ |
| `booking.js` | إضافة دالة `showExistingBookingStep()` | ✅ |
| `booking.js` | إضافة معالج لزر الحذف | ✅ |
| `booking.js` | تحديث `hideAllSteps()` | ✅ |
| `booking.html` | واجهة موجودة مسبقاً | ✅ |

---

## 🔒 الأمان

### **1. منع حذف حجوزات الآخرين:**

```sql
-- في cancel_booking
IF slot_record.booked_by != p_application_id THEN
    RETURN QUERY SELECT false, 'غير مصرح لك بحذف هذا الحجز'::TEXT;
    RETURN;
END IF;
```

### **2. استخدام SECURITY DEFINER:**

```sql
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**الفائدة:** تعمل الدالة بصلاحيات النظام لحذف المقابلة المرتبطة.

### **3. التحقق من الحالة:**

```sql
-- التحقق من أن الفترة محجوزة
IF slot_record.is_booked = false THEN
    RETURN QUERY SELECT false, 'الفترة غير محجوزة'::TEXT;
    RETURN;
END IF;

-- التحقق من عدم الإلغاء المسبق
IF slot_record.cancelled_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'الحجز ملغى مسبقاً'::TEXT;
    RETURN;
END IF;
```

---

## 📁 الملفات المُعدّلة والجديدة

### **جديد:**
- ✅ `supabase/migrations/037_enhance_booking_cancellation.sql`
- ✅ `BOOKING_CANCELLATION_GUIDE.md` (هذا الملف)

### **مُعدّل:**
- ✅ `booking.js`

### **بدون تغيير:**
- `booking.html` (الواجهة موجودة مسبقاً)
- `booking.css` (لا حاجة لتعديل)

---

## 🎯 الميزات المُحققة

✅ **عرض الحجز الحالي** - يتم عرض تفاصيل الحجز بدلاً من رفض الطلب  
✅ **حذف الحجز** - إمكانية حذف الموعد من قاعدة البيانات  
✅ **حذف المقابلة المرتبطة** - يتم حذف المقابلة تلقائياً عند حذف الحجز  
✅ **إعادة الحجز** - السماح بحجز موعد جديد بعد الحذف  
✅ **منع الحجوزات المتعددة** - لا يمكن وجود أكثر من حجز نشط لنفس الجوال  
✅ **الأمان** - التحقق من الصلاحيات قبل الحذف  
✅ **تجربة مستخدم محسّنة** - واجهة واضحة وسهلة الاستخدام

---

## 🐛 استكشاف الأخطاء

### **خطأ: "function cancel_booking does not exist"**

```sql
-- الحل: تأكد من تطبيق migration 037
-- في SQL Editor
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'cancel_booking';

-- إذا لم يظهر شيء، أعد تطبيق migration 037
```

---

### **خطأ: "has_existing_booking is undefined"**

```javascript
// الحل: تأكد من تطبيق migration 037
// الدالة المُحدثة ترجع has_existing_booking
```

---

### **خطأ: "elements.existingBookingStep is null"**

```javascript
// الحل: تأكد من وجود العنصر في booking.html
// ابحث عن: <div id="existingBookingStep">
```

---

## ✨ الخلاصة

تم تطوير نظام الحجز بنجاح لدعم:

1. ✅ عرض الحجز الحالي للمستخدمين الذين لديهم حجز مسبق
2. ✅ إمكانية حذف الحجز القديم
3. ✅ السماح بإعادة الحجز بعد الحذف
4. ✅ منع الحجوزات المتعددة لنفس الجوال
5. ✅ حذف المقابلة المرتبطة تلقائياً
6. ✅ الأمان والتحقق من الصلاحيات

**النظام جاهز للاستخدام!** 🎉
