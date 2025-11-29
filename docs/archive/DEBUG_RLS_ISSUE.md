# 🔍 تشخيص مشكلة RLS

## الخطأ المستمر
```
Update returned no data. Member ID might not exist or RLS blocked the update.
```

---

## ✅ الخطوة 1: تحقق من Policies الحالية

### شغّل هذا في Supabase SQL Editor:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'members'
ORDER BY policyname;
```

### النتيجة المتوقعة:
يجب أن ترى Policies. إذا لم ترَ أي شيء، معناه **لم يتم تشغيل SQL!**

---

## ✅ الخطوة 2: تحقق من RLS مفعّل

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'members';
```

### النتيجة المتوقعة:
```
rowsecurity: true
```

إذا كانت `false`، شغّل:
```sql
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
```

---

## ✅ الخطوة 3: تحقق من وجود الصف

```sql
SELECT 
  id,
  full_name,
  email,
  user_id,
  account_status
FROM members 
WHERE id = '14fbf5ab-fe41-493c-8a20-019531fecf9c';
```

### النتيجة المتوقعة:
يجب أن ترى الصف مع:
- `user_id`: NULL
- `account_status`: pending

**إذا لم ترَ الصف**: المشكلة ليست في RLS، بل `member_id` خاطئ!

---

## ✅ الخطوة 4: اختبار التحديث يدوياً

### 4.1 احصل على user_id الحالي:
```sql
SELECT auth.uid();
```

### 4.2 جرب التحديث:
```sql
UPDATE members 
SET 
  user_id = 'a2276b0d-413a-4161-8b5e-7cf39245d164',
  account_status = 'active'
WHERE id = '14fbf5ab-fe41-493c-8a20-019531fecf9c'
RETURNING *;
```

### النتائج المحتملة:

#### ✅ إذا نجح:
```
UPDATE 1
[يظهر الصف المحدث]
```
**المشكلة**: RLS Policies غير صحيحة في الكود

#### ❌ إذا فشل:
```
UPDATE 0
```
**المشكلة**: RLS يمنع التحديث

---

## ✅ الخطوة 5: الحل البسيط

### شغّل `SIMPLE_RLS_FIX.sql`:

```sql
-- حذف كل Policies
DROP POLICY IF EXISTS "Members can read own data" ON members;
DROP POLICY IF EXISTS "Members can update own data" ON members;
DROP POLICY IF EXISTS "Allow activation update" ON members;
DROP POLICY IF EXISTS "Admins can read all members" ON members;
DROP POLICY IF EXISTS "Admins can insert members" ON members;
DROP POLICY IF EXISTS "Admins can manage all members" ON members;

-- تفعيل RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policy بسيطة للقراءة
CREATE POLICY "Members can read own data"
ON members FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy بسيطة للتحديث (تسمح بـ NULL)
CREATE POLICY "Members can update own data"
ON members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy للإداريين
CREATE POLICY "Admins full access"
ON members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);
```

---

## ✅ الخطوة 6: تحقق من النتيجة

```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'members';
```

يجب أن ترى:
```
Admins full access          | ALL
Members can read own data   | SELECT
Members can update own data | UPDATE
```

---

## 🔍 تشخيص إضافي

### إذا استمر الخطأ، افحص:

#### 1. Session صحيحة؟
في Console المتصفح:
```javascript
const { data: { session } } = await sb.auth.getSession();
console.log('Session:', session);
console.log('User ID:', session?.user?.id);
```

#### 2. member_id صحيح؟
```javascript
console.log('Member ID from invitation:', invitationData.member_id);
```

#### 3. الاستعلام صحيح؟
في `activate.js`، تأكد من:
```javascript
.eq('id', invitationData.member_id)  // ✅ صحيح
// وليس
.eq('user_id', invitationData.member_id)  // ❌ خطأ
```

---

## 🚨 حل الطوارئ

إذا لم يعمل أي شيء، **عطّل RLS مؤقتاً** للاختبار:

```sql
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
```

⚠️ **تحذير**: لا تترك RLS معطلاً في الإنتاج!

جرب التفعيل. إذا نجح:
- المشكلة 100% في RLS Policies
- أعد تفعيل RLS وشغّل `SIMPLE_RLS_FIX.sql`

```sql
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
```

---

## 📋 ملخص الخطوات

1. ✅ تحقق من Policies الحالية
2. ✅ تحقق من RLS مفعّل
3. ✅ تحقق من وجود الصف
4. ✅ اختبر التحديث يدوياً
5. ✅ شغّل `SIMPLE_RLS_FIX.sql`
6. ✅ تحقق من النتيجة
7. ✅ جرب التفعيل مرة أخرى

---

**ابدأ بالخطوة 1 وأخبرني بالنتائج!**
