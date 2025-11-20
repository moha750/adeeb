# 🔧 حل مشكلة 401 Unauthorized

## ❌ المشكلة

عند محاولة إرسال دعوة، يظهر الخطأ:
```
POST https://xxx.functions.supabase.co/send-member-invitation 401 (Unauthorized)
Error: HTTP 401
```

---

## ✅ الحل المطبق

تم إصلاح المشكلة بإضافة `apikey` header في دالة `callFunction`.

### التغييرات:

#### قبل:
```javascript
const headers = {
  'Authorization': `Bearer ${session.access_token}`,
  'Content-Type': 'application/json',
};
```

#### بعد:
```javascript
const headers = {
  'Authorization': `Bearer ${session.access_token}`,
  'apikey': window.SUPABASE_ANON_KEY || '',  // ✅ مضاف
  'Content-Type': 'application/json',
};
```

---

## 🎯 السبب

Edge Functions في Supabase تتطلب:
1. ✅ `Authorization: Bearer <access_token>` - للتحقق من المستخدم
2. ✅ `apikey: <anon_key>` - للتحقق من المشروع

كان ينقص الـ `apikey` header، لذا كانت الدالة ترفض الطلب.

---

## 🧪 التحقق من الحل

### 1. تحديث الصفحة
```
Ctrl + Shift + R  (تحديث كامل)
```

### 2. اختبار إرسال دعوة
```
1. افتح لوحة الإدارة
2. اذهب لقسم "أعضاء النادي"
3. اضغط زر "إرسال دعوة" لأي عضو
4. يجب أن يعمل الآن! ✅
```

### 3. فحص Console
افتح Console (F12) وتحقق من:
```javascript
// يجب أن ترى:
POST https://xxx.functions.supabase.co/send-member-invitation 200 (OK) ✅

// بدلاً من:
POST https://xxx.functions.supabase.co/send-member-invitation 401 (Unauthorized) ❌
```

---

## 🔍 أخطاء أخرى محتملة

### خطأ: "RESEND_API_KEY not configured"

**السبب**: لم يتم إضافة API Key في Supabase Secrets

**الحل**:
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

---

### خطأ: "Failed to send email"

**الأسباب المحتملة**:
1. ❌ API Key خاطئ
2. ❌ البريد الإلكتروني غير صحيح
3. ❌ تجاوز حد الإرسال (100/يوم)

**الحل**:
```bash
# تحقق من Secrets
supabase secrets list

# تحقق من Resend Dashboard
https://resend.com/emails
```

---

### خطأ: "Unauthorized: Admin access required"

**السبب**: المستخدم ليس إداري

**الحل**:
```sql
-- تحقق من جدول admins
SELECT * FROM admins WHERE user_id = 'YOUR_USER_ID';

-- إذا لم يكن موجود، أضفه:
INSERT INTO admins (user_id, is_admin, position)
VALUES ('YOUR_USER_ID', true, 'رئيس أديب');
```

---

### خطأ: "Member account is already activated"

**السبب**: العضو فعّل حسابه مسبقاً

**الحل**: هذا طبيعي! لا يمكن إرسال دعوة لعضو مفعّل.

---

## 📊 فحص الـ Headers

للتحقق من أن الـ headers صحيحة:

### في Console (F12):
```javascript
// افتح Network tab
// أرسل دعوة
// اضغط على الطلب
// شاهد Headers:

Request Headers:
  Authorization: Bearer eyJhbGc... ✅
  apikey: eyJhbGc...            ✅
  Content-Type: application/json ✅
```

---

## 🎉 الخلاصة

تم إصلاح المشكلة بإضافة `apikey` header. الآن النظام يعمل بشكل كامل!

**الخطوات التالية:**
1. ✅ حدّث الصفحة (Ctrl + Shift + R)
2. ✅ جرب إرسال دعوة
3. ✅ تحقق من البريد الإلكتروني

**إذا استمرت المشكلة:**
- راجع `EMAIL_INVITATIONS_SETUP.md` للتأكد من إعداد Resend
- تحقق من Supabase Logs
- تحقق من Console للأخطاء

---

**تم الحل! 🚀**
