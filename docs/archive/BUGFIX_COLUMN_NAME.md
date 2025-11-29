# 🐛 تصحيح: Could not find the 'activated_at' column

## المشكلة
```
Could not find the 'activated_at' column of 'members' in the schema cache
```

عند محاولة تفعيل حساب عضو، ظهر خطأ 500 من Edge Function.

## السبب
Edge Function `activate-member-account` كانت تحاول تحديث أعمدة غير موجودة:
- ❌ `activated_at` (غير موجود)
- ❌ `is_active` (غير موجود)

**الأعمدة الصحيحة في جدول `members`:**
- ✅ `account_activated_at`
- ✅ `account_status`

## الحل ✅

### تم تصحيح Edge Function

**قبل:**
```typescript
.update({
  user_id: userId,
  is_active: true,
  activated_at: new Date().toISOString()  // ❌ خطأ
})
```

**بعد:**
```typescript
.update({
  user_id: userId,
  account_status: 'active',                    // ✅ صحيح
  account_activated_at: new Date().toISOString() // ✅ صحيح
})
```

## خطوات التنفيذ

### 1. إعادة نشر Edge Function
```bash
cd "e:\moham\Downloads\adeeb web"
supabase functions deploy activate-member-account
```

### 2. اختبار التفعيل
1. أعد تحميل صفحة التفعيل (F5)
2. أدخل كلمة مرور
3. اضغط "تفعيل الحساب"
4. يجب أن يعمل بنجاح الآن! ✅

### 3. التحقق من النجاح
```sql
-- تحقق من تحديث العضو
SELECT 
  id, 
  user_id, 
  account_status, 
  account_activated_at 
FROM members 
WHERE email = 'test@example.com';
```

يجب أن ترى:
- ✅ `user_id` ليس null
- ✅ `account_status` = 'active'
- ✅ `account_activated_at` يحتوي على تاريخ ووقت

## الملفات المُعدلة
- ✅ `supabase/functions/activate-member-account/index.ts` (السطر 140-142)

## ملاحظة مهمة
عند العمل مع قاعدة بيانات موجودة، تأكد دائماً من:
1. ✅ التحقق من أسماء الأعمدة الفعلية
2. ✅ التحقق من أنواع البيانات
3. ✅ مراجعة `Table's.md` للحصول على الهيكل الصحيح

## أسماء الأعمدة الصحيحة في `members`

| الاستخدام | الاسم الصحيح | النوع |
|-----------|--------------|-------|
| معرف المستخدم | `user_id` | uuid |
| حالة الحساب | `account_status` | text |
| تاريخ التفعيل | `account_activated_at` | timestamptz |
| البريد | `email` | text |
| الاسم الكامل | `full_name` | text |

---

**تاريخ التصحيح**: 28 نوفمبر 2024  
**الحالة**: ✅ تم الحل - يتطلب إعادة نشر Edge Function
