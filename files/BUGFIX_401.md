# 🐛 تصحيح: خطأ 401 Unauthorized

## المشكلة
عند محاولة تفعيل حساب إداري، ظهر الخطأ التالي:
```
POST https://xniaivonejocibhspfhu.supabase.co/functions/v1/verify-admin-invitation 401 (Unauthorized)
```

## السبب
Edge Functions في Supabase تتطلب **Authorization header** حتى للـ endpoints العامة (public).

الكود القديم كان يرسل فقط:
```javascript
headers: {
  'Content-Type': 'application/json',
  'apikey': sb.supabaseKey
}
```

## الحل ✅
إضافة `Authorization` header مع Bearer token:

```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${sb.supabaseKey}`,  // ← أضف هذا
  'apikey': sb.supabaseKey
}
```

## الملفات المُصححة

### ✅ admin/activate.js
تم تصحيح موضعين:

1. **دالة `verifyInvitation`** (السطر 90-96)
2. **دالة `activateAccount`** (السطر 325-331)

## الاختبار
بعد التصحيح، يجب أن تعمل الدعوة بشكل صحيح:

1. افتح رابط التفعيل: `https://www.adeeb.club/admin/activate.html?token=XXX`
2. يجب أن تظهر معلومات الإداري بدون خطأ 401
3. أدخل كلمة مرور وفعّل الحساب
4. يجب أن يتم التفعيل بنجاح

## ملاحظات مهمة

### لجميع Edge Functions
تأكد دائماً من إضافة `Authorization` header عند استدعاء أي Edge Function:

```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/any-function`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,
    'apikey': supabaseKey
  },
  body: JSON.stringify({ ... })
});
```

### Edge Functions الأخرى
تحقق من Edge Functions التالية إذا كنت تستخدمها:
- ✅ `verify-member-invitation` - تحقق من الكود
- ✅ `activate-member-account` - تحقق من الكود
- ✅ `invite-admin` - تحقق من الكود
- ✅ `invite-member` - تحقق من الكود

## التحديثات في التوثيق
تم تحديث `IMPLEMENTATION_GUIDE.md` بقسم جديد في "استكشاف الأخطاء" يشرح هذه المشكلة والحل.

---

**تاريخ التصحيح**: 28 نوفمبر 2024  
**الحالة**: ✅ تم الحل
