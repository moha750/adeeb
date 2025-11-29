# حل خطأ 406 Not Acceptable - RLS Policy

## الخطأ
```
GET /rest/v1/members?select=user_id,account_status&id=eq.xxx 406 (Not Acceptable)
Error: فشل ربط الحساب ببيانات العضوية
```

## السبب

### المشكلة الأساسية: ترتيب العمليات

```javascript
// الترتيب السابق (المعطل):
1. signUp() → إنشاء حساب ✅
2. update members → ربط user_id ✅
3. select from members → التحقق من الربط ❌ (هنا الخطأ!)
   // auth.uid() = NULL لأن المستخدم لم يسجل دخوله بعد
4. signInWithPassword() → تسجيل دخول
```

### RLS Policy تمنع القراءة

في `member_accounts_setup.sql`:
```sql
-- السماح للأعضاء بقراءة بياناتهم فقط
CREATE POLICY "Members can read own data"
ON members FOR SELECT
USING (auth.uid() = user_id);
```

**المشكلة**: 
- عند التحقق من الربط، `auth.uid()` = `NULL` (لم يسجل دخول بعد)
- RLS Policy ترفض الطلب → **406 Not Acceptable**

## الحل المطبق

### الترتيب الجديد (المحسّن):

```javascript
1. signUp() → إنشاء حساب ✅
2. update members → ربط user_id ✅
3. signInWithPassword() → تسجيل دخول ✅
   // الآن auth.uid() موجود
4. select from members → التحقق من الربط ✅
   // auth.uid() = user_id → RLS يسمح بالقراءة
```

## التغييرات في الكود

### قبل:
```javascript
// ربط user_id
await sb.from('members').update({ user_id }).eq('id', member_id);

// ❌ التحقق قبل تسجيل الدخول (خطأ!)
const { data } = await sb.from('members')
  .select('user_id')
  .eq('id', member_id)
  .single();

// تسجيل الدخول
await sb.auth.signInWithPassword({ email, password });
```

### بعد:
```javascript
// ربط user_id
await sb.from('members').update({ user_id }).eq('id', member_id);

// تسجيل الدخول أولاً
await sb.auth.signInWithPassword({ email, password });

// ✅ التحقق بعد تسجيل الدخول (صحيح!)
const { data } = await sb.from('members')
  .select('user_id')
  .eq('user_id', user_id) // استخدام user_id بدلاً من member_id
  .single();
```

## لماذا يعمل الآن؟

### تدفق المصادقة:

```
1. signUp() → إنشاء user في auth.users
   ↓
2. update members → حفظ user_id في جدول members
   ↓
3. signInWithPassword() → إنشاء session
   ↓
   auth.uid() = user_id ✅
   ↓
4. select from members WHERE user_id = auth.uid()
   ↓
   RLS: auth.uid() = user_id ✅ → السماح بالقراءة
```

## فهم RLS Policies

### Policy للأعضاء:
```sql
-- يسمح للعضو بقراءة بياناته فقط
USING (auth.uid() = user_id)
```

**متى تعمل؟**
- ✅ بعد `signInWithPassword()` → auth.uid() موجود
- ❌ قبل تسجيل الدخول → auth.uid() = NULL

### Policy للإداريين:
```sql
-- يسمح للإداريين بقراءة كل البيانات
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
)
```

### Policy العامة (للدعوات):
```sql
-- يسمح بقراءة الدعوة بالتوكن
CREATE POLICY "Public can read invitation by token"
ON member_invitations FOR SELECT
USING (true);
```

## الأخطاء الشائعة المتعلقة بـ RLS

### 1. القراءة قبل تسجيل الدخول
```javascript
// ❌ خطأ
await sb.from('members').select('*').eq('id', member_id);
// auth.uid() = NULL → 406 Error
```

### 2. استخدام member_id بدلاً من user_id
```javascript
// ❌ خطأ
await sb.from('members').select('*').eq('id', member_id);
// RLS يتحقق من: auth.uid() = user_id (ليس member_id)

// ✅ صحيح
await sb.from('members').select('*').eq('user_id', auth_user_id);
```

### 3. نسيان تسجيل الدخول
```javascript
// ❌ خطأ
await sb.auth.signUp({ email, password });
// لا يوجد session تلقائية!

// ✅ صحيح
await sb.auth.signUp({ email, password });
await sb.auth.signInWithPassword({ email, password });
// الآن session موجودة
```

## اختبار RLS Policies

### في SQL Editor:

```sql
-- اختبار كـ عضو
SET request.jwt.claims TO '{"sub": "user-uuid-here"}';

SELECT * FROM members WHERE user_id = 'user-uuid-here';
-- يجب أن يعمل ✅

SELECT * FROM members WHERE user_id != 'user-uuid-here';
-- يجب أن يفشل ❌
```

### في JavaScript:

```javascript
// بعد تسجيل الدخول
const { data: session } = await sb.auth.getSession();
console.log('User ID:', session.user.id);

// محاولة قراءة البيانات
const { data, error } = await sb
  .from('members')
  .select('*')
  .eq('user_id', session.user.id)
  .single();

if (error) {
  console.error('RLS blocked:', error);
} else {
  console.log('RLS allowed:', data);
}
```

## استكشاف أخطاء RLS

### خطأ 406 Not Acceptable
**السبب**: RLS يرفض الطلب
**الحل**: 
- تحقق من أن المستخدم مسجل دخوله
- تحقق من أن Policy تسمح بالعملية

### خطأ 401 Unauthorized
**السبب**: لا توجد session
**الحل**: 
- تأكد من تسجيل الدخول
- تحقق من صلاحية JWT

### لا توجد بيانات (data = null)
**السبب**: RLS يخفي البيانات
**الحل**:
- تحقق من أن `auth.uid()` يطابق `user_id`
- راجع Policies في Supabase Dashboard

## أدوات التشخيص

### 1. فحص Session
```javascript
const { data: { session } } = await sb.auth.getSession();
console.log('Session:', session);
console.log('User ID:', session?.user?.id);
```

### 2. فحص RLS في Dashboard
```
Supabase Dashboard → Database → Tables → members → RLS Policies
```

### 3. تعطيل RLS مؤقتاً (للاختبار فقط!)
```sql
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
-- اختبر الاستعلام
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
```

⚠️ **تحذير**: لا تعطل RLS في الإنتاج!

## الخلاصة

✅ **تم حل المشكلة** بتغيير ترتيب العمليات:
1. إنشاء الحساب
2. ربط user_id
3. **تسجيل الدخول** ← المفتاح
4. التحقق من الربط

✅ **الآن**: auth.uid() موجود عند التحقق، RLS يسمح بالقراءة

✅ **النتيجة**: لا أخطاء 406، التفعيل يعمل بسلاسة
