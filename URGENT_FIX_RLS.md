# 🚨 إصلاح عاجل: خطأ RLS 406

## المشكلة
```
GET /rest/v1/members?select=*&user_id=eq.xxx 406 (Not Acceptable)
```

## السبب
**RLS Policies غير مطبقة بشكل صحيح** في Supabase Cloud!

---

## ✅ الحل (خطوات بسيطة)

### الخطوة 1: افتح Supabase Dashboard
1. اذهب إلى: https://supabase.com/dashboard
2. افتح مشروعك
3. اذهب إلى: **SQL Editor**

### الخطوة 2: نفذ هذا SQL

انسخ والصق الكود التالي:

```sql
-- حذف Policies القديمة
DROP POLICY IF EXISTS "Members can read own data" ON members;
DROP POLICY IF EXISTS "Members can update own data" ON members;
DROP POLICY IF EXISTS "Admins can read all members" ON members;
DROP POLICY IF EXISTS "Admins can manage all members" ON members;

-- تفعيل RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- إنشاء Policy للأعضاء - القراءة
CREATE POLICY "Members can read own data"
ON members FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- إنشاء Policy للأعضاء - التحديث
CREATE POLICY "Members can update own data"
ON members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- السماح بتحديث user_id أثناء التفعيل
CREATE POLICY "Allow activation update"
ON members FOR UPDATE
TO authenticated
USING (user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- إنشاء Policy للإداريين - القراءة
CREATE POLICY "Admins can read all members"
ON members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- إنشاء Policy للإداريين - كل العمليات
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

### الخطوة 3: اضغط RUN

انتظر حتى ترى: **Success. No rows returned**

### الخطوة 4: تحقق من Policies

```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'members';
```

يجب أن ترى:
- ✅ Members can read own data (SELECT)
- ✅ Members can update own data (UPDATE)
- ✅ Admins can read all members (SELECT)
- ✅ Admins can manage all members (ALL)

---

## 🧪 اختبار الحل

1. افتح رابط تفعيل جديد
2. أدخل كلمة مرور
3. اضغط "تفعيل الحساب"
4. يجب أن يعمل بدون خطأ 406 ✨

---

## 📋 ملف SQL الكامل

📄 `FIX_RLS_POLICIES.sql` - يحتوي على الكود الكامل مع التعليقات

---

## ❓ إذا استمر الخطأ

### تحقق من RLS في Dashboard:

1. **Database** → **Tables** → **members**
2. اضغط على **RLS** (Row Level Security)
3. تأكد من:
   - ✅ RLS enabled
   - ✅ 4 Policies موجودة

### تحقق من Session:

افتح Console في المتصفح:
```javascript
const { data: { session } } = await sb.auth.getSession();
console.log('User ID:', session?.user?.id);
```

يجب أن يكون `session` **ليس NULL**

---

## 🎯 الخلاصة

المشكلة: **RLS Policies غير صحيحة**
الحل: **تشغيل SQL في Supabase Dashboard**
الوقت: **دقيقتان فقط** ⚡
