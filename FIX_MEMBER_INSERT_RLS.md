# حل مشكلة إضافة عضو جديد - RLS Policy

## المشكلة
عند إضافة عضو جديد من لوحة الإدارة، يظهر الخطأ:
```
فشل الحفظ: new row violates row-level security policy for table "members"
```

## السبب
السياسة `"Admins can manage all members"` كانت تستخدم `FOR ALL` مع `USING` فقط، لكن عملية `INSERT` تتطلب `WITH CHECK` وليس `USING`.

في PostgreSQL RLS:
- **USING**: يُستخدم للتحقق من الصفوف الموجودة (SELECT, UPDATE, DELETE)
- **WITH CHECK**: يُستخدم للتحقق من الصفوف الجديدة (INSERT, UPDATE)

عند إضافة صف جديد، لا توجد صفوف موجودة للتحقق منها باستخدام `USING`، لذلك يجب استخدام `WITH CHECK`.

## الحل

### 1. تشغيل السكريبت المحدث
افتح **Supabase SQL Editor** وقم بتشغيل الملف:
```
FIX_RLS_POLICIES.sql
```

### 2. التغييرات المطبقة
تم إنشاء سياسة منفصلة للإداريين لإضافة الأعضاء:

```sql
-- سياسة جديدة للإضافة فقط
CREATE POLICY "Admins can insert members"
ON members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- السياسة الشاملة للعمليات الأخرى
CREATE POLICY "Admins can manage all members"
ON members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);
```

## التحقق من الحل
بعد تشغيل السكريبت، يمكنك التحقق من السياسات:

```sql
SELECT 
  policyname,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'members'
AND policyname LIKE 'Admins%';
```

يجب أن ترى:
- `Admins can insert members` → cmd: INSERT, has_with_check: true
- `Admins can manage all members` → cmd: ALL, has_using: true, has_with_check: true

## الاختبار
1. سجل الدخول كمسؤول
2. اذهب إلى لوحة الإدارة
3. حاول إضافة عضو جديد
4. يجب أن تتم العملية بنجاح ✅

## ملاحظات
- تم تحديث كل من `FIX_RLS_POLICIES.sql` و `member_accounts_setup.sql`
- السياسات الآن تدعم جميع العمليات للإداريين بشكل صحيح
- الأعضاء العاديون لا يزالون محدودين بقراءة وتحديث بياناتهم فقط
