# دليل نظام حسابات الأعضاء - نادي أديب

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [المتطلبات الأساسية](#المتطلبات-الأساسية)
3. [التثبيت والإعداد](#التثبيت-والإعداد)
4. [إدارة حسابات الأعضاء](#إدارة-حسابات-الأعضاء)
5. [دليل الاستخدام للإداريين](#دليل-الاستخدام-للإداريين)
6. [دليل الاستخدام للأعضاء](#دليل-الاستخدام-للأعضاء)
7. [استكشاف الأخطاء وحلها](#استكشاف-الأخطاء-وحلها)
8. [الأسئلة الشائعة](#الأسئلة-الشائعة)

---

## 🎯 نظرة عامة

نظام حسابات الأعضاء هو نظام متكامل يسمح لأعضاء نادي أديب بإنشاء حسابات شخصية وتسجيل الدخول والوصول إلى لوحة تحكم خاصة بهم، مع الحفاظ على التفريق الواضح بين الأعضاء العاديين والأعضاء الإداريين.

### ✨ الميزات الرئيسية

- ✅ نظام دعوات آمن لتفعيل الحسابات
- ✅ لوحة تحكم مخصصة للأعضاء
- ✅ إدارة الملف الشخصي
- ✅ تتبع النشاط والإحصائيات
- ✅ صلاحيات محكمة (RLS)
- ✅ تفريق واضح بين الإداريين والأعضاء

---

## 📦 المتطلبات الأساسية

### البنية التقنية

- **قاعدة البيانات**: Supabase PostgreSQL
- **المصادقة**: Supabase Auth
- **الواجهة الأمامية**: HTML, CSS, JavaScript
- **المكتبات**: 
  - `@supabase/supabase-js` v2
  - `sweetalert2` v11
  - Font Awesome v6.7.2

### الصلاحيات المطلوبة

- صلاحيات إدارية على قاعدة بيانات Supabase
- القدرة على تشغيل SQL scripts
- صلاحيات إنشاء Edge Functions (اختياري)

---

## 🚀 التثبيت والإعداد

### الخطوة 1: إعداد قاعدة البيانات

1. افتح لوحة تحكم Supabase
2. انتقل إلى **SQL Editor**
3. افتح الملف `sql/member_accounts_setup.sql`
4. انسخ محتوى الملف والصقه في محرر SQL
5. اضغط على **Run** لتنفيذ السكريبت

```sql
-- سيتم تنفيذ:
-- ✓ إضافة أعمدة جديدة لجدول members
-- ✓ إنشاء جدول member_invitations
-- ✓ إنشاء جدول member_activity_log
-- ✓ إنشاء جدول member_statistics
-- ✓ إعداد Row Level Security (RLS)
-- ✓ إنشاء دوال مساعدة
```

### الخطوة 2: التحقق من التثبيت

تحقق من أن الجداول تم إنشاؤها بنجاح:

```sql
-- التحقق من الجداول
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('members', 'member_invitations', 'member_activity_log', 'member_statistics');

-- التحقق من الأعمدة الجديدة في جدول members
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name IN ('user_id', 'account_status', 'last_login', 'account_activated_at');
```

### الخطوة 3: رفع الملفات

تأكد من رفع الملفات التالية إلى الخادم:

```
adeeb web/
├── members/
│   ├── activate.html       ✓ صفحة تفعيل الحساب
│   ├── activate.js         ✓ منطق التفعيل
│   ├── dashboard.html      ✓ لوحة تحكم الأعضاء
│   ├── dashboard.css       ✓ تصميم لوحة التحكم
│   └── dashboard.js        ✓ منطق لوحة التحكم
├── sql/
│   └── member_accounts_setup.sql  ✓ سكريبت قاعدة البيانات
└── auth/
    └── login.html          ✓ (محدّث) صفحة تسجيل الدخول
```

---

## 👥 إدارة حسابات الأعضاء

### إضافة عضو جديد

#### الطريقة 1: من لوحة الإدارة

1. سجل دخول كإداري
2. انتقل إلى **أعضاء النادي**
3. اضغط على **إضافة عضو**
4. املأ البيانات المطلوبة:
   - الاسم الكامل ✓
   - البريد الإلكتروني ✓
   - رقم الجوال
   - اللجنة
   - الكلية والتخصص
   - وغيرها...
5. اضغط **حفظ**

#### الطريقة 2: استيراد من طلبات العضوية

1. انتقل إلى **طلبات العضوية**
2. اختر الطلب المراد قبوله
3. اضغط **تصدير إلى أعضاء النادي**
4. سيتم نقل البيانات تلقائياً

### إرسال دعوة تفعيل الحساب

#### لعضو واحد

1. في قسم **أعضاء النادي**
2. ابحث عن العضو المطلوب
3. اضغط على أيقونة **⋮** (المزيد)
4. اختر **إرسال دعوة تفعيل**
5. سيتم إنشاء رابط دعوة وإرساله للعضو

**ملاحظة**: حالياً يتم عرض رابط الدعوة للنسخ. في المستقبل سيتم إرساله تلقائياً عبر البريد الإلكتروني.

#### لعدة أعضاء (إرسال جماعي)

1. في قسم **أعضاء النادي**
2. استخدم الفلاتر لاختيار الأعضاء:
   - حسب اللجنة
   - حسب حالة الحساب (غير مفعل)
3. اضغط **إرسال دعوات جماعية**
4. أكد العملية

### حالات الحساب

| الحالة | الوصف | الإجراءات المتاحة |
|--------|-------|-------------------|
| `pending` | قيد الانتظار - لم يفعل الحساب بعد | إرسال/إعادة إرسال دعوة |
| `active` | نشط - يمكنه تسجيل الدخول | تعليق، تعديل البيانات |
| `suspended` | معلق - لا يمكنه تسجيل الدخول | تفعيل، حذف |
| `inactive` | غير نشط | تفعيل، حذف |

### تغيير حالة الحساب

```sql
-- تفعيل حساب
UPDATE members 
SET account_status = 'active' 
WHERE id = 'MEMBER_ID';

-- تعليق حساب
UPDATE members 
SET account_status = 'suspended' 
WHERE id = 'MEMBER_ID';
```

---

## 🔧 دليل الاستخدام للإداريين

### 1. إرسال دعوة تفعيل يدوياً

إذا لم تتوفر واجهة الإرسال بعد، يمكنك إنشاء دعوة يدوياً:

```sql
-- إنشاء دعوة تفعيل
INSERT INTO member_invitations (
  member_id,
  email,
  invitation_token,
  expires_at,
  created_by
) VALUES (
  'MEMBER_ID',                    -- معرف العضو
  'member@example.com',           -- بريد العضو
  gen_random_uuid()::text,        -- توكن عشوائي
  NOW() + INTERVAL '7 days',      -- صالح لمدة 7 أيام
  auth.uid()                      -- معرف الإداري
);

-- الحصول على رابط الدعوة
SELECT 
  'https://www.adeeb.club/members/activate.html?token=' || invitation_token as invitation_url,
  expires_at
FROM member_invitations
WHERE member_id = 'MEMBER_ID'
AND status = 'pending'
ORDER BY created_at DESC
LIMIT 1;
```

### 2. مراقبة الدعوات

```sql
-- عرض جميع الدعوات المعلقة
SELECT 
  mi.id,
  m.full_name,
  mi.email,
  mi.created_at,
  mi.expires_at,
  CASE 
    WHEN mi.expires_at < NOW() THEN 'منتهية'
    ELSE 'صالحة'
  END as status
FROM member_invitations mi
JOIN members m ON m.id = mi.member_id
WHERE mi.status = 'pending'
ORDER BY mi.created_at DESC;
```

### 3. إلغاء دعوة

```sql
UPDATE member_invitations
SET status = 'cancelled'
WHERE id = 'INVITATION_ID';
```

### 4. عرض إحصائيات الأعضاء

```sql
-- إحصائيات عامة
SELECT 
  COUNT(*) as total_members,
  COUNT(*) FILTER (WHERE account_status = 'active') as active_accounts,
  COUNT(*) FILTER (WHERE account_status = 'pending') as pending_accounts,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as accounts_with_login
FROM members;

-- إحصائيات حسب اللجنة
SELECT 
  committee,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE account_status = 'active') as active
FROM members
WHERE committee IS NOT NULL
GROUP BY committee
ORDER BY total DESC;
```

### 5. عرض نشاط الأعضاء

```sql
-- آخر 20 نشاط
SELECT 
  m.full_name,
  mal.activity_type,
  mal.created_at
FROM member_activity_log mal
JOIN members m ON m.id = mal.member_id
ORDER BY mal.created_at DESC
LIMIT 20;

-- عدد تسجيلات الدخول لكل عضو
SELECT 
  m.full_name,
  COUNT(*) as login_count,
  MAX(mal.created_at) as last_login
FROM member_activity_log mal
JOIN members m ON m.id = mal.member_id
WHERE mal.activity_type = 'login'
GROUP BY m.id, m.full_name
ORDER BY login_count DESC;
```

---

## 👤 دليل الاستخدام للأعضاء

### تفعيل الحساب

1. **استلام الدعوة**
   - ستصلك رسالة تحتوي على رابط التفعيل
   - الرابط صالح لمدة 7 أيام

2. **فتح رابط التفعيل**
   - اضغط على الرابط في الرسالة
   - سيتم فتح صفحة تفعيل الحساب

3. **إنشاء كلمة المرور**
   - أدخل كلمة مرور قوية تحتوي على:
     - 8 خانات على الأقل ✓
     - حرف كبير واحد على الأقل ✓
     - حرف صغير واحد على الأقل ✓
     - رقم واحد على الأقل ✓
     - رمز خاص واحد على الأقل ✓
   - أعد إدخال كلمة المرور للتأكيد

4. **إكمال التفعيل**
   - اضغط **تفعيل الحساب**
   - سيتم توجيهك تلقائياً للوحة التحكم

### تسجيل الدخول

1. افتح صفحة تسجيل الدخول: `https://www.adeeb.club/auth/login.html`
2. أدخل بريدك الإلكتروني
3. أدخل كلمة المرور
4. اضغط **تسجيل الدخول**
5. سيتم توجيهك للوحة التحكم الخاصة بك

### استخدام لوحة التحكم

#### الصفحة الرئيسية

- **الإحصائيات**: عرض عدد الفعاليات والشهادات
- **الملف الشخصي**: معلوماتك الكاملة
- **النشاط الأخير**: سجل نشاطك في النظام
- **اكتمال الملف**: نسبة اكتمال ملفك الشخصي

#### تعديل الملف الشخصي

1. اضغط **تعديل** في بطاقة الملف الشخصي
2. عدّل المعلومات المسموح تعديلها:
   - رقم الجوال ✓
   - الكلية والتخصص ✓
   - تاريخ الميلاد ✓
   - الرقم الأكاديمي ✓
   - حسابات التواصل الاجتماعي ✓
3. اضغط **حفظ التغييرات**

**ملاحظة**: لا يمكن تعديل الاسم والبريد الإلكتروني. للتعديل، تواصل مع الإدارة.

#### تغيير الصورة الشخصية

1. اضغط على أيقونة الكاميرا على الصورة الشخصية
2. اختر صورة جديدة
3. سيتم رفعها وتحديثها تلقائياً

### تسجيل الخروج

1. اضغط على اسمك في الشريط العلوي
2. اختر **تسجيل الخروج**

---

## 🔍 استكشاف الأخطاء وحلها

### المشكلة: رابط التفعيل لا يعمل

**الأسباب المحتملة:**
- انتهت صلاحية الرابط (أكثر من 7 أيام)
- تم استخدام الرابط مسبقاً
- خطأ في نسخ الرابط

**الحل:**
1. تحقق من تاريخ انتهاء الدعوة:
```sql
SELECT expires_at, status 
FROM member_invitations 
WHERE invitation_token = 'TOKEN';
```
2. إذا انتهت الصلاحية، أرسل دعوة جديدة
3. تأكد من نسخ الرابط كاملاً

### المشكلة: لا يمكن تسجيل الدخول

**الأسباب المحتملة:**
- كلمة المرور خاطئة
- الحساب غير مفعل
- الحساب معلق

**الحل:**
1. تحقق من حالة الحساب:
```sql
SELECT account_status, user_id 
FROM members 
WHERE email = 'MEMBER_EMAIL';
```
2. إذا كان `user_id` فارغاً، الحساب غير مفعل
3. إذا كان `account_status` ليس `active`, تواصل مع الإدارة

### المشكلة: خطأ "حسابك غير مسجل في النظام"

**السبب:**
- البريد المستخدم غير موجود في جدول `members`

**الحل:**
1. تحقق من وجود العضو:
```sql
SELECT * FROM members WHERE email = 'MEMBER_EMAIL';
```
2. إذا لم يكن موجوداً، أضفه من لوحة الإدارة

### المشكلة: خطأ في صلاحيات RLS

**السبب:**
- سياسات RLS تمنع الوصول

**الحل:**
```sql
-- التحقق من السياسات
SELECT * FROM pg_policies WHERE tablename = 'members';

-- إعادة تطبيق السياسات
-- قم بتشغيل الجزء الخاص بـ RLS من سكريبت الإعداد
```

### المشكلة: بطء في تحميل لوحة التحكم

**الأسباب المحتملة:**
- عدد كبير من السجلات في جدول النشاط
- عدم وجود فهارس

**الحل:**
```sql
-- إنشاء فهارس إضافية
CREATE INDEX IF NOT EXISTS idx_activity_member_created 
ON member_activity_log(member_id, created_at DESC);

-- حذف السجلات القديمة (اختياري)
DELETE FROM member_activity_log 
WHERE created_at < NOW() - INTERVAL '6 months';
```

---

## ❓ الأسئلة الشائعة

### س: كم مدة صلاحية رابط التفعيل؟

**ج:** 7 أيام من تاريخ الإنشاء. بعدها يجب إرسال دعوة جديدة.

### س: هل يمكن للعضو تغيير بريده الإلكتروني؟

**ج:** لا، يجب التواصل مع الإدارة لتغيير البريد الإلكتروني.

### س: ماذا يحدث عند حذف عضو؟

**ج:** عند حذف عضو من جدول `members`:
- يتم حذف حساب المصادقة تلقائياً (`ON DELETE CASCADE`)
- يتم حذف جميع الدعوات المرتبطة
- يتم حذف سجل النشاط
- يتم حذف الإحصائيات

### س: هل يمكن للعضو الوصول للوحة الإدارية؟

**ج:** لا، نظام المصادقة يفرق بين الإداريين والأعضاء. الأعضاء العاديون يتم توجيههم تلقائياً للوحة الأعضاء.

### س: كيف أعرف من فعّل حسابه ومن لم يفعل؟

**ج:** استخدم هذا الاستعلام:
```sql
SELECT 
  full_name,
  email,
  CASE 
    WHEN user_id IS NOT NULL THEN 'مفعّل'
    ELSE 'غير مفعّل'
  END as activation_status,
  account_status
FROM members
ORDER BY created_at DESC;
```

### س: هل يمكن إرسال دعوة لعضو فعّل حسابه مسبقاً؟

**ج:** لا، النظام يمنع إنشاء دعوات للأعضاء الذين لديهم `user_id` بالفعل.

### س: كيف أستعيد كلمة المرور؟

**ج:** حالياً، يجب التواصل مع الإدارة. في المستقبل سيتم إضافة ميزة "نسيت كلمة المرور".

---

## 📊 الإحصائيات والتقارير

### تقرير شامل عن الأعضاء

```sql
SELECT 
  COUNT(*) as total_members,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as activated_accounts,
  COUNT(*) FILTER (WHERE account_status = 'active') as active_accounts,
  COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '30 days') as active_last_month,
  ROUND(AVG(
    CASE 
      WHEN user_id IS NOT NULL THEN 
        (SELECT profile_completion_percentage FROM member_statistics WHERE member_id = members.id)
      ELSE 0
    END
  ), 2) as avg_profile_completion
FROM members;
```

### الأعضاء الأكثر نشاطاً

```sql
SELECT 
  m.full_name,
  m.committee,
  COUNT(mal.id) as activity_count,
  MAX(mal.created_at) as last_activity
FROM members m
LEFT JOIN member_activity_log mal ON mal.member_id = m.id
WHERE m.account_status = 'active'
GROUP BY m.id, m.full_name, m.committee
ORDER BY activity_count DESC
LIMIT 10;
```

---

## 🔐 الأمان وأفضل الممارسات

### للإداريين

1. ✅ لا تشارك روابط الدعوات علناً
2. ✅ راجع الدعوات المعلقة بانتظام
3. ✅ احذف الدعوات المنتهية
4. ✅ راقب النشاط المشبوه
5. ✅ احتفظ بنسخة احتياطية من قاعدة البيانات

### للأعضاء

1. ✅ استخدم كلمة مرور قوية وفريدة
2. ✅ لا تشارك كلمة المرور مع أحد
3. ✅ سجل خروج بعد الانتهاء من الاستخدام
4. ✅ حدّث معلوماتك الشخصية بانتظام
5. ✅ أبلغ الإدارة عن أي نشاط مشبوه

---

## 📞 الدعم والمساعدة

### للحصول على المساعدة

- **البريد الإلكتروني**: adeab.kfu@gmail.com
- **الهاتف**: +966 54 383 7775 (واتساب فقط)
- **تويتر**: [@AB_KFU](https://x.com/AB_KFU)

### الإبلاغ عن مشكلة

عند الإبلاغ عن مشكلة، يرجى تضمين:
- وصف المشكلة
- الخطوات لإعادة إنتاج المشكلة
- لقطات شاشة (إن أمكن)
- رسائل الخطأ

---

## 📝 ملاحظات ختامية

### الميزات المستقبلية

- [ ] إرسال الدعوات تلقائياً عبر البريد الإلكتروني
- [ ] نظام "نسيت كلمة المرور"
- [ ] إشعارات فورية للأعضاء
- [ ] نظام الشهادات الرقمية
- [ ] تطبيق جوال

### التحديثات

- **الإصدار 1.0** (نوفمبر 2024): الإطلاق الأولي
  - نظام الدعوات
  - لوحة تحكم الأعضاء
  - تسجيل الدخول والخروج
  - إدارة الملف الشخصي

---

**تم إعداد هذا الدليل بواسطة فريق نادي أديب - جامعة الملك فيصل**

*آخر تحديث: نوفمبر 2024*
