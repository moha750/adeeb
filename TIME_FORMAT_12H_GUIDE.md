# دليل تحويل نظام الوقت إلى 12 ساعة

## 📋 نظرة عامة

تم تحويل جميع أماكن عرض الوقت في النظام من نظام 24 ساعة إلى نظام 12 ساعة (AM/PM).

---

## 🔄 التغييرات المُطبقة

### **1. صفحة الحجز (`booking.js`)**

#### **أ. عرض المواعيد المتاحة (renderSlots)**

**قبل:**
```javascript
const timeStr = slotTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false  // نظام 24 ساعة
});
```

**بعد:**
```javascript
const timeStr = slotTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true  // نظام 12 ساعة
});
```

**النتيجة:**
- قبل: `09:00` → `14:00`
- بعد: `09:00 ص` → `02:00 م`

---

#### **ب. تأكيد اختيار الموعد (confirmSlotSelection)**

**قبل:**
```javascript
const timeStr = slotTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
    // hour12 غير محدد (افتراضياً false في بعض المتصفحات)
});
```

**بعد:**
```javascript
const timeStr = slotTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true  // نظام 12 ساعة صريح
});
```

---

#### **ج. صفحة التأكيد (showConfirmationStep)**

**قبل:**
```javascript
elements.confirmTime.textContent = slotTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
});
```

**بعد:**
```javascript
elements.confirmTime.textContent = slotTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
});
```

---

#### **د. صفحة الحجز الحالي (showExistingBookingStep)**

**قبل:**
```javascript
const timeStr = slotTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
}) + ' - ' + slotEndTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
});
```

**بعد:**
```javascript
const timeStr = slotTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) + ' - ' + slotEndTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
});
```

**النتيجة:**
- قبل: `09:00 - 09:10`
- بعد: `09:00 ص - 09:10 ص`

---

### **2. لوحة الإدارة (`interview-sessions-manager.js`)**

#### **أ. جدول الجلسات (renderSessions)**

**قبل:**
```javascript
<td>${session.start_time.substring(0, 5)} - ${session.end_time.substring(0, 5)}</td>
```

**المشكلة:** يعرض الوقت مباشرة من قاعدة البيانات بنظام 24 ساعة.

**بعد:**
```javascript
// تحويل الوقت إلى نظام 12 ساعة
const startTime = new Date(`2000-01-01 ${session.start_time}`).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
});
const endTime = new Date(`2000-01-01 ${session.end_time}`).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
});

<td>${startTime} - ${endTime}</td>
```

**النتيجة:**
- قبل: `09:00 - 17:00`
- بعد: `09:00 ص - 05:00 م`

---

#### **ب. عرض تفاصيل الجلسة (viewSession)**

**قبل:**
```javascript
const time = new Date(slot.slot_time).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
});
```

**بعد:**
```javascript
const time = new Date(slot.slot_time).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
});
```

---

#### **ج. نافذة معلومات الجلسة (Swal.fire)**

**قبل:**
```javascript
<p><strong>الوقت:</strong> ${session.start_time.substring(0, 5)} - ${session.end_time.substring(0, 5)}</p>
```

**بعد:**
```javascript
<p><strong>الوقت:</strong> ${new Date(`2000-01-01 ${session.start_time}`).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${new Date(`2000-01-01 ${session.end_time}`).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
```

---

## 🔍 التفاصيل التقنية

### **تحويل TIME إلى Date للتنسيق**

عند التعامل مع `TIME` من قاعدة البيانات (مثل `09:00:00`):

```javascript
// ❌ خطأ: لا يمكن استخدام toLocaleTimeString مباشرة
session.start_time.toLocaleTimeString('ar-SA', { hour12: true });

// ✅ صحيح: تحويل إلى Date أولاً
new Date(`2000-01-01 ${session.start_time}`).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
});
```

**الشرح:**
- `session.start_time` هو نص (string) مثل `"09:00:00"`
- نحتاج لتحويله إلى `Date` لاستخدام `toLocaleTimeString`
- نستخدم تاريخ وهمي `2000-01-01` لأننا نهتم بالوقت فقط

---

### **خيارات toLocaleTimeString**

```javascript
toLocaleTimeString('ar-SA', {
    hour: '2-digit',      // رقمين للساعة (01, 02, ..., 12)
    minute: '2-digit',    // رقمين للدقيقة (00, 01, ..., 59)
    hour12: true          // نظام 12 ساعة مع AM/PM
})
```

**النتائج بناءً على `hour12`:**

| hour12 | الوقت | النتيجة |
|--------|-------|---------|
| `false` | 09:00 | `09:00` |
| `false` | 14:00 | `14:00` |
| `true` | 09:00 | `09:00 ص` |
| `true` | 14:00 | `02:00 م` |

---

## 📊 ملخص الأماكن المُحدثة

| الملف | الدالة/المكان | التغيير |
|------|---------------|---------|
| **booking.js** |
| | `renderSlots()` | إضافة `hour12: true` لعرض المواعيد |
| | `confirmSlotSelection()` | إضافة `hour12: true` للتأكيد |
| | `showConfirmationStep()` | إضافة `hour12: true` لصفحة التأكيد |
| | `showExistingBookingStep()` | إضافة `hour12: true` للحجز الحالي |
| **interview-sessions-manager.js** |
| | `renderSessions()` | تحويل TIME إلى Date + `hour12: true` |
| | `viewSession()` | إضافة `hour12: true` لعرض الفترات |
| | نافذة معلومات الجلسة | تحويل TIME إلى Date + `hour12: true` |

---

## 🧪 الاختبار

### **اختبار 1: صفحة الحجز**

```
1. افتح رابط حجز موعد
2. تحقق من عرض المواعيد:
   ✅ يجب أن تظهر بنظام 12 ساعة (09:00 ص، 02:00 م)
   ❌ وليس بنظام 24 ساعة (09:00، 14:00)
3. اختر موعد
4. تحقق من نافذة التأكيد:
   ✅ الوقت بنظام 12 ساعة
5. أكمل الحجز
6. تحقق من صفحة التأكيد النهائية:
   ✅ الوقت بنظام 12 ساعة
```

---

### **اختبار 2: لوحة الإدارة**

```
1. افتح لوحة الإدارة → جلسات المقابلات
2. تحقق من جدول الجلسات:
   ✅ عمود "الوقت" يعرض بنظام 12 ساعة
   مثال: "09:00 ص - 05:00 م"
3. اضغط على "عرض التفاصيل" لأي جلسة
4. تحقق من النافذة المنبثقة:
   ✅ الوقت في القسم العلوي بنظام 12 ساعة
   ✅ أوقات الفترات في الجدول بنظام 12 ساعة
```

---

### **اختبار 3: الحجز الموجود**

```
1. افتح رابط حجز لمتقدم لديه حجز مسبق
2. أدخل رقم الهاتف
3. تحقق من صفحة الحجز الحالي:
   ✅ الوقت معروض بنظام 12 ساعة
   مثال: "09:00 ص - 09:10 ص"
```

---

## 🌍 التوافق مع اللغات

### **اللغة العربية (`ar-SA`)**

```javascript
toLocaleTimeString('ar-SA', { hour12: true })
```

**النتيجة:**
- `09:00 ص` (صباحاً)
- `02:00 م` (مساءً)

---

### **لغات أخرى (إذا احتجت)**

```javascript
// الإنجليزية
toLocaleTimeString('en-US', { hour12: true })
// النتيجة: 09:00 AM, 02:00 PM

// الفرنسية
toLocaleTimeString('fr-FR', { hour12: true })
// النتيجة: 09:00 AM, 02:00 PM
```

---

## 💡 نصائح

### **1. استخدم دائماً `hour12: true` صريحاً**

```javascript
// ❌ تجنب (قد يختلف حسب المتصفح)
toLocaleTimeString('ar-SA')

// ✅ استخدم
toLocaleTimeString('ar-SA', { hour12: true })
```

---

### **2. تحويل TIME من قاعدة البيانات**

```javascript
// ❌ خطأ
session.start_time.toLocaleTimeString('ar-SA', { hour12: true })

// ✅ صحيح
new Date(`2000-01-01 ${session.start_time}`).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
})
```

---

### **3. الاتساق في جميع الأماكن**

تأكد من استخدام نفس الخيارات في جميع أماكن عرض الوقت:
```javascript
{
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}
```

---

## 📁 الملفات المُعدّلة

### **مُعدّل:**
1. ✅ `booking.js`
   - `renderSlots()` - السطر 304-315
   - `confirmSlotSelection()` - السطر 394-398
   - `showConfirmationStep()` - السطر 464-468
   - `showExistingBookingStep()` - السطر 530-538

2. ✅ `interview-sessions-manager.js`
   - `renderSessions()` - السطر 116-135
   - `viewSession()` - السطر 382-386
   - نافذة معلومات الجلسة - السطر 406

### **جديد:**
3. ✅ `TIME_FORMAT_12H_GUIDE.md` (هذا الملف)

---

## 🔄 التراجع (إذا احتجت)

إذا أردت العودة لنظام 24 ساعة:

```javascript
// غيّر جميع
hour12: true

// إلى
hour12: false
```

---

## ✨ الخلاصة

تم تحويل نظام عرض الوقت بنجاح:

**قبل التحديث:**
- صفحة الحجز: `09:00 - 14:00` (24 ساعة)
- لوحة الإدارة: `09:00 - 17:00` (24 ساعة)

**بعد التحديث:**
- صفحة الحجز: `09:00 ص - 02:00 م` (12 ساعة) ✅
- لوحة الإدارة: `09:00 ص - 05:00 م` (12 ساعة) ✅

**الفوائد:**
- 📱 أسهل في القراءة للمستخدمين
- 🌍 متوافق مع العادات المحلية
- ✅ واضح ومفهوم (صباحاً/مساءً)

**النظام جاهز للاستخدام!** 🎉
