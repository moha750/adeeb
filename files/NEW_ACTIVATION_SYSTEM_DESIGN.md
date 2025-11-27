# 🔐 نظام التفعيل الجديد - نادي أديب
## تصميم شامل ومنفصل للأعضاء والإداريين

---

## 📊 المشكلة الحالية

### ❌ العيوب في النظام الحالي:
1. **عدم الفصل**: نفس آلية التفعيل للأعضاء والإداريين
2. **التوجيه الموحد**: الجميع يذهب لنفس لوحة التحكم
3. **عدم وضوح الأدوار**: لا يوجد تمييز واضح بين الأدوار أثناء التفعيل
4. **جدول واحد للدعوات**: `member_invitations` يستخدم للجميع
5. **Edge Function واحدة**: `activate-member-account` تخدم الجميع

---

## ✅ الحل المقترح: نظام منفصل بالكامل

### 🎯 المبادئ الأساسية:
1. **فصل تام** بين مسارات الأعضاء والإداريين
2. **جداول منفصلة** لكل نوع من الدعوات
3. **Edge Functions منفصلة** لكل نوع
4. **واجهات تفعيل منفصلة** مع تجربة مستخدم مخصصة
5. **صلاحيات واضحة** منذ لحظة التفعيل

---

## 🗄️ هيكل قاعدة البيانات الجديد

### 1️⃣ جدول `members` (موجود - تحديثات بسيطة)
```sql
-- الأعمدة الموجودة + تأكيد وجود:
- id (uuid, PK)
- user_id (uuid, FK → auth.users, nullable)
- full_name (text)
- email (text, unique)
- phone (text)
- committee (text)
- college, major, degree (text)
- role (text) -- 'member' أو 'admin'
- account_status (text) -- 'pending', 'active', 'suspended'
- account_activated_at (timestamptz)
- created_at, updated_at (timestamptz)
```

### 2️⃣ جدول `admins` (موجود - تحديثات)
```sql
-- الأعمدة الموجودة:
- user_id (uuid, PK, FK → auth.users)
- is_admin (boolean, default false)
- position (text) -- المسمى الوظيفي بالعربي
- admin_type (text) -- 'president', 'vice', 'manager', 'committee_leader'
- phone (text)
- member_id (uuid, FK → members, nullable)
- created_at (timestamptz)

-- أعمدة جديدة مقترحة:
ALTER TABLE admins ADD COLUMN IF NOT EXISTS admin_level integer;
-- 1 = رئيس النادي
-- 2 = نائب الرئيس
-- 3 = قائد لجنة
-- 4 = مسؤول إداري
-- 5 = رئيس تنفيذي

ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb;
-- صلاحيات مخصصة لكل إداري
```

### 3️⃣ جدول `member_invitations` (موجود - للأعضاء العاديين فقط)
```sql
-- يبقى كما هو لكن للأعضاء العاديين فقط
CREATE TABLE IF NOT EXISTS member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  email text NOT NULL,
  invitation_token text UNIQUE NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'cancelled'
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_invitations_token ON member_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_member_invitations_status ON member_invitations(status);
```

### 4️⃣ جدول جديد: `admin_invitations` (للإداريين فقط)
```sql
CREATE TABLE IF NOT EXISTS admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invitation_token text UNIQUE NOT NULL,
  
  -- معلومات الإداري المدعو
  full_name text NOT NULL,
  phone text,
  position text NOT NULL, -- المسمى الوظيفي
  admin_level integer NOT NULL DEFAULT 4, -- المستوى الإداري
  admin_type text NOT NULL DEFAULT 'admin_officer',
  permissions jsonb DEFAULT '{}'::jsonb,
  
  -- حالة الدعوة
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'cancelled'
  expires_at timestamptz NOT NULL,
  
  -- من أرسل الدعوة
  invited_by uuid REFERENCES auth.users(id),
  invited_by_name text,
  
  -- تواريخ
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  -- ملاحظات
  notes text
);

CREATE INDEX idx_admin_invitations_token ON admin_invitations(invitation_token);
CREATE INDEX idx_admin_invitations_status ON admin_invitations(status);
CREATE INDEX idx_admin_invitations_email ON admin_invitations(email);

-- RLS Policies
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- الإداريون فقط يمكنهم قراءة الدعوات
CREATE POLICY "Admins can read admin invitations"
  ON admin_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.is_admin = true
    )
  );

-- لا أحد يمكنه الكتابة مباشرة (فقط عبر Edge Functions)
CREATE POLICY "No direct writes to admin invitations"
  ON admin_invitations FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
```

---

## 🔧 Edge Functions الجديدة

### 1️⃣ `invite-member` (للأعضاء العاديين)
**المسار**: `/functions/invite-member/index.ts`

```typescript
// وظيفة: إرسال دعوة تفعيل لعضو عادي
// المدخلات:
{
  member_id: "uuid",
  email: "member@example.com"
}

// المخرجات:
{
  success: true,
  invitation_id: "uuid",
  activation_url: "https://adeeb.club/members/activate.html?token=xxx"
}

// الصلاحيات: إداري فقط
// البريد: يرسل عبر Resend مع تصميم خاص بالأعضاء
```

### 2️⃣ `invite-admin` (للإداريين) - موجودة لكن تحتاج تحديث
**المسار**: `/functions/invite-admin/index.ts`

```typescript
// وظيفة: إرسال دعوة لإداري جديد
// المدخلات:
{
  email: "admin@example.com",
  full_name: "أحمد محمد",
  phone: "0501234567",
  position: "قائد لجنة الإعلام",
  admin_level: 3,
  admin_type: "committee_leader",
  permissions: {
    members: true,
    stats: true,
    works: true
  }
}

// المخرجات:
{
  success: true,
  invitation_id: "uuid",
  activation_url: "https://adeeb.club/admin/activate.html?token=xxx"
}

// الصلاحيات: رئيس النادي أو نائبه فقط
// البريد: يرسل عبر Resend مع تصميم خاص بالإداريين
```

### 3️⃣ `verify-member-invitation` (جديدة)
**المسار**: `/functions/verify-member-invitation/index.ts`

```typescript
// وظيفة: التحقق من صلاحية دعوة عضو
// المدخلات:
{
  token: "invitation-token"
}

// المخرجات:
{
  valid: true,
  member: {
    id: "uuid",
    full_name: "محمد أحمد",
    email: "member@example.com",
    committee: "الإعلام",
    college: "الآداب"
  },
  invitation: {
    expires_at: "2024-12-31T23:59:59Z"
  }
}

// الصلاحيات: عامة (لا تحتاج مصادقة)
```

### 4️⃣ `verify-admin-invitation` (جديدة)
**المسار**: `/functions/verify-admin-invitation/index.ts`

```typescript
// وظيفة: التحقق من صلاحية دعوة إداري
// المدخلات:
{
  token: "invitation-token"
}

// المخرجات:
{
  valid: true,
  admin: {
    full_name: "أحمد محمد",
    email: "admin@example.com",
    position: "قائد لجنة الإعلام",
    admin_level: 3,
    permissions: {...}
  },
  invitation: {
    expires_at: "2024-12-31T23:59:59Z",
    invited_by_name: "رئيس النادي"
  }
}

// الصلاحيات: عامة (لا تحتاج مصادقة)
```

### 5️⃣ `activate-member-account` (جديدة - تستبدل الحالية)
**المسار**: `/functions/activate-member-account/index.ts`

```typescript
// وظيفة: تفعيل حساب عضو عادي
// المدخلات:
{
  token: "invitation-token",
  password: "SecurePass123!"
}

// الخطوات:
1. التحقق من صلاحية التوكن
2. إنشاء حساب في auth.users مع role: 'member'
3. ربط user_id في جدول members
4. تحديث حالة الدعوة إلى 'accepted'
5. تسجيل دخول تلقائي
6. إرجاع session

// المخرجات:
{
  success: true,
  user: {...},
  session: {...},
  redirect_to: "/members/dashboard.html"
}
```

### 6️⃣ `activate-admin-account` (جديدة)
**المسار**: `/functions/activate-admin-account/index.ts`

```typescript
// وظيفة: تفعيل حساب إداري
// المدخلات:
{
  token: "invitation-token",
  password: "SecurePass123!"
}

// الخطوات:
1. التحقق من صلاحية التوكن
2. إنشاء حساب في auth.users مع role: 'admin'
3. إنشاء صف في جدول admins
4. تعيين الصلاحيات والمستوى الإداري
5. تحديث حالة الدعوة إلى 'accepted'
6. تسجيل دخول تلقائي
7. إرجاع session

// المخرجات:
{
  success: true,
  user: {...},
  session: {...},
  admin_info: {
    position: "...",
    admin_level: 3,
    permissions: {...}
  },
  redirect_to: "/admin/admin.html"
}
```

---

## 🎨 واجهات التفعيل

### 1️⃣ تفعيل الأعضاء: `/members/activate.html`
**المميزات**:
- تصميم بسيط وودود
- عرض معلومات العضو (الاسم، البريد، اللجنة، الكلية)
- نموذج إنشاء كلمة مرور
- مؤشر قوة كلمة المرور
- رسائل واضحة للأخطاء
- توجيه تلقائي لـ `/members/dashboard.html` بعد النجاح

### 2️⃣ تفعيل الإداريين: `/admin/activate.html` (جديدة)
**المميزات**:
- تصميم احترافي يعكس الدور الإداري
- عرض معلومات الإداري (الاسم، البريد، المسمى الوظيفي، المستوى)
- عرض الصلاحيات الممنوحة
- عرض اسم من أرسل الدعوة
- نموذج إنشاء كلمة مرور قوية
- شروط أمان إضافية
- توجيه تلقائي لـ `/admin/admin.html` بعد النجاح

---

## 🔐 سياسات الأمان (RLS)

### جدول `members`
```sql
-- الأعضاء يقرأون بياناتهم فقط
CREATE POLICY "Members read own data"
  ON members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- الأعضاء يحدثون بياناتهم فقط (ما عدا role و account_status)
CREATE POLICY "Members update own data"
  ON members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- الإداريون يقرأون كل البيانات
CREATE POLICY "Admins read all members"
  ON members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.is_admin = true
    )
  );

-- الإداريون يحدثون كل البيانات
CREATE POLICY "Admins update all members"
  ON members FOR UPDATE
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

-- السماح بالتفعيل (ربط user_id) للحسابات غير المفعلة
CREATE POLICY "Allow account activation"
  ON members FOR UPDATE
  TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (true);
```

### جدول `admins`
```sql
-- الإداري يقرأ بياناته فقط
CREATE POLICY "Admins read own data"
  ON admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- لا أحد يكتب مباشرة (فقط عبر Edge Functions)
CREATE POLICY "No direct writes to admins"
  ON admins FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
```

---

## 📧 قوالب البريد الإلكتروني

### 1️⃣ دعوة عضو عادي
**الموضوع**: 🎉 دعوة تفعيل حسابك في نادي أديب

**المحتوى**:
```
مرحباً [الاسم]،

يسعدنا انضمامك لعائلة نادي أديب! 🎊

تم إنشاء حساب خاص بك في منصة النادي.

📋 معلوماتك:
• الاسم: [الاسم الكامل]
• البريد: [البريد الإلكتروني]
• اللجنة: [اسم اللجنة]
• الكلية: [اسم الكلية]

لتفعيل حسابك وإنشاء كلمة مرور، اضغط على الزر أدناه:

[زر: تفعيل الحساب الآن]

⏰ هذا الرابط صالح لمدة 7 أيام فقط

بعد التفعيل، ستتمكن من:
✓ الوصول إلى لوحة التحكم الخاصة بك
✓ تحديث بياناتك الشخصية
✓ متابعة أنشطة النادي
✓ التواصل مع أعضاء اللجنة

نادي أديب - جامعة الملك فيصل
```

### 2️⃣ دعوة إداري
**الموضوع**: 🎖️ دعوة انضمام للفريق الإداري - نادي أديب

**المحتوى**:
```
مرحباً [الاسم]،

تم ترشيحك للانضمام للفريق الإداري في نادي أديب! 🌟

📋 معلومات الحساب الإداري:
• الاسم: [الاسم الكامل]
• البريد: [البريد الإلكتروني]
• المسمى الوظيفي: [المسمى]
• المستوى الإداري: [المستوى]
• تمت الدعوة بواسطة: [اسم المدعو]

🔐 الصلاحيات الممنوحة:
[قائمة الصلاحيات]

لتفعيل حسابك الإداري وإنشاء كلمة مرور آمنة، اضغط على الزر أدناه:

[زر: تفعيل الحساب الإداري]

⏰ هذا الرابط صالح لمدة 7 أيام فقط
🔒 يرجى عدم مشاركة هذا الرابط مع أحد

بعد التفعيل، ستتمكن من:
✓ الوصول إلى لوحة التحكم الإدارية
✓ إدارة الأعضاء والأنشطة حسب صلاحياتك
✓ متابعة إحصائيات النادي
✓ التواصل مع الفريق الإداري

نادي أديب - جامعة الملك فيصل
الفريق الإداري
```

---

## 🔄 سير العمل (Workflow)

### مسار تفعيل عضو عادي:
```
1. الإداري يضيف عضو جديد في تبويب "الأعضاء"
   ↓
2. النظام يحفظ بيانات العضو في جدول members (بدون user_id)
   ↓
3. الإداري يضغط "إرسال دعوة تفعيل"
   ↓
4. Edge Function: invite-member
   - إنشاء سجل في member_invitations
   - توليد token فريد
   - إرسال بريد إلكتروني
   ↓
5. العضو يفتح البريد ويضغط على الرابط
   ↓
6. يفتح /members/activate.html?token=xxx
   ↓
7. الصفحة تستدعي verify-member-invitation
   - التحقق من صلاحية التوكن
   - عرض معلومات العضو
   ↓
8. العضو يدخل كلمة مرور ويضغط "تفعيل"
   ↓
9. Edge Function: activate-member-account
   - إنشاء حساب في auth.users
   - ربط user_id في members
   - تحديث حالة الدعوة
   - تسجيل دخول تلقائي
   ↓
10. توجيه تلقائي إلى /members/dashboard.html
```

### مسار تفعيل إداري:
```
1. رئيس النادي/نائبه يفتح تبويب "إدارة الإداريين"
   ↓
2. يضغط "دعوة إداري جديد"
   ↓
3. يملأ نموذج الدعوة:
   - البريد الإلكتروني
   - الاسم الكامل
   - رقم الجوال
   - المسمى الوظيفي
   - المستوى الإداري
   - الصلاحيات
   ↓
4. Edge Function: invite-admin
   - التحقق من صلاحيات المُدعي
   - إنشاء سجل في admin_invitations
   - توليد token فريد
   - إرسال بريد إلكتروني
   ↓
5. الإداري المدعو يفتح البريد ويضغط على الرابط
   ↓
6. يفتح /admin/activate.html?token=xxx
   ↓
7. الصفحة تستدعي verify-admin-invitation
   - التحقق من صلاحية التوكن
   - عرض معلومات الإداري والصلاحيات
   ↓
8. الإداري يدخل كلمة مرور قوية ويضغط "تفعيل"
   ↓
9. Edge Function: activate-admin-account
   - إنشاء حساب في auth.users
   - إنشاء سجل في admins
   - تعيين الصلاحيات
   - تحديث حالة الدعوة
   - تسجيل دخول تلقائي
   ↓
10. توجيه تلقائي إلى /admin/admin.html
```

---

## 📝 خطوات التنفيذ

### المرحلة 1: قاعدة البيانات
- [ ] إنشاء جدول `admin_invitations`
- [ ] تحديث جدول `admins` (إضافة admin_level و permissions)
- [ ] إنشاء/تحديث RLS policies
- [ ] إنشاء indexes للأداء

### المرحلة 2: Edge Functions
- [ ] إنشاء `invite-member`
- [ ] تحديث `invite-admin`
- [ ] إنشاء `verify-member-invitation`
- [ ] إنشاء `verify-admin-invitation`
- [ ] تحديث `activate-member-account`
- [ ] إنشاء `activate-admin-account`

### المرحلة 3: واجهات التفعيل
- [ ] تحديث `/members/activate.html`
- [ ] تحديث `/members/activate.js`
- [ ] إنشاء `/admin/activate.html`
- [ ] إنشاء `/admin/activate.js`

### المرحلة 4: قوالب البريد
- [ ] تصميم قالب دعوة الأعضاء
- [ ] تصميم قالب دعوة الإداريين
- [ ] إعداد Resend API

### المرحلة 5: واجهات الإدارة
- [ ] تحديث تبويب "الأعضاء" في admin.html
- [ ] إنشاء تبويب "إدارة الإداريين" في admin.html
- [ ] إضافة نماذج الدعوة
- [ ] إضافة قوائم الدعوات المعلقة

### المرحلة 6: الاختبار
- [ ] اختبار تفعيل عضو عادي
- [ ] اختبار تفعيل إداري
- [ ] اختبار الصلاحيات
- [ ] اختبار انتهاء الصلاحية
- [ ] اختبار الأخطاء

---

## 🎯 الفوائد المتوقعة

1. **وضوح تام** في التمييز بين الأعضاء والإداريين
2. **أمان أفضل** مع صلاحيات محددة منذ البداية
3. **تجربة مستخدم محسنة** لكل نوع
4. **سهولة الصيانة** مع كود منفصل ومنظم
5. **مرونة أكبر** في إدارة الصلاحيات
6. **قابلية التوسع** لإضافة أنواع جديدة من المستخدمين

---

## 📌 ملاحظات مهمة

1. **التوافقية**: النظام الجديد لن يؤثر على الحسابات المفعلة حالياً
2. **الترحيل**: يمكن ترحيل الدعوات المعلقة الحالية تدريجياً
3. **النسخ الاحتياطي**: يجب أخذ نسخة احتياطية قبل التنفيذ
4. **الاختبار**: يُفضل الاختبار في بيئة تطوير أولاً

---

**تاريخ الإنشاء**: 27 نوفمبر 2024  
**الحالة**: تصميم أولي - جاهز للتنفيذ  
**المطور**: Cascade AI
