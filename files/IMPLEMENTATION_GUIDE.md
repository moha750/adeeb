# 📘 دليل التنفيذ - نظام التفعيل الجديد
## نادي أديب - جامعة الملك فيصل

---

## 📋 نظرة عامة

هذا الدليل يشرح خطوات تنفيذ نظام التفعيل الجديد المنفصل للأعضاء والإداريين.

**الملفات التي تم إنشاؤها:**
- ✅ `files/NEW_ACTIVATION_SYSTEM_DESIGN.md` - التصميم الشامل
- ✅ `database/01_create_admin_invitations.sql` - جدول دعوات الإداريين
- ✅ `database/02_update_admins_table.sql` - تحديثات جدول admins
- ✅ `supabase/functions/verify-member-invitation/index.ts` - التحقق من دعوة عضو
- ✅ `supabase/functions/verify-admin-invitation/index.ts` - التحقق من دعوة إداري
- ✅ `supabase/functions/activate-admin-account/index.ts` - تفعيل حساب إداري
- ✅ `admin/activate.html` - واجهة تفعيل الإداري
- ✅ `admin/activate.js` - منطق تفعيل الإداري

---

## 🚀 خطوات التنفيذ

### المرحلة 1️⃣: تحديث قاعدة البيانات

#### الخطوة 1: تنفيذ SQL Scripts

**في Supabase Dashboard → SQL Editor:**

```sql
-- 1. إنشاء جدول admin_invitations
-- انسخ محتوى: database/01_create_admin_invitations.sql
-- ثم نفذه
```

```sql
-- 2. تحديث جدول admins
-- انسخ محتوى: database/02_update_admins_table.sql
-- ثم نفذه
```

#### الخطوة 2: التحقق من الجداول

```sql
-- تحقق من إنشاء الجدول الجديد
SELECT * FROM admin_invitations LIMIT 1;

-- تحقق من الأعمدة الجديدة في admins
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admins';
```

#### الخطوة 3: اختبار RLS Policies

```sql
-- تحقق من السياسات
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('admin_invitations', 'admins')
ORDER BY tablename, policyname;
```

---

### المرحلة 2️⃣: نشر Edge Functions

#### الخطوة 1: تثبيت Supabase CLI (إذا لم يكن مثبتاً)

```bash
# Windows (PowerShell)
scoop install supabase

# أو باستخدام npm
npm install -g supabase
```

#### الخطوة 2: تسجيل الدخول

```bash
supabase login
```

#### الخطوة 3: ربط المشروع

```bash
# في مجلد المشروع
cd "e:\moham\Downloads\adeeb web"

# ربط المشروع (استبدل project-ref بمعرف مشروعك)
supabase link --project-ref your-project-ref
```

#### الخطوة 4: نشر Edge Functions

```bash
# نشر activate-member-account (مهم - يحل مشكلة RLS)
supabase functions deploy activate-member-account

# نشر verify-member-invitation
supabase functions deploy verify-member-invitation

# نشر verify-admin-invitation
supabase functions deploy verify-admin-invitation

# نشر activate-admin-account
supabase functions deploy activate-admin-account
```

#### الخطوة 5: التحقق من النشر

في **Supabase Dashboard → Edge Functions**:
- ✅ activate-member-account (جديد - لتفعيل الأعضاء)
- ✅ verify-member-invitation
- ✅ verify-admin-invitation
- ✅ activate-admin-account

---

### المرحلة 3️⃣: اختبار النظام

#### اختبار 1: دعوة إداري جديد

**الطريقة اليدوية (للاختبار):**

```sql
-- 1. إنشاء دعوة إداري يدوياً
INSERT INTO admin_invitations (
  email,
  full_name,
  phone,
  position,
  admin_level,
  admin_type,
  permissions,
  invitation_token,
  expires_at,
  invited_by_name
) VALUES (
  'test-admin@example.com',
  'أحمد محمد',
  '0501234567',
  'قائد لجنة الإعلام',
  3,
  'committee_leader',
  '{"members": true, "stats": true, "works": true}'::jsonb,
  gen_random_uuid()::text,
  now() + interval '7 days',
  'رئيس النادي'
);

-- 2. احصل على التوكن
SELECT invitation_token, email, full_name, position
FROM admin_invitations
WHERE email = 'test-admin@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

**اختبار التفعيل:**

1. افتح الرابط:
   ```
   https://www.adeeb.club/admin/activate.html?token=YOUR_TOKEN_HERE
   ```

2. تحقق من:
   - ✅ عرض معلومات الإداري بشكل صحيح
   - ✅ عرض المسمى الوظيفي والمستوى
   - ✅ عرض الصلاحيات الممنوحة
   - ✅ عرض من أرسل الدعوة

3. أدخل كلمة مرور قوية واضغط "تفعيل"

4. تحقق من:
   - ✅ إنشاء حساب في auth.users
   - ✅ إنشاء سجل في admins
   - ✅ تحديث حالة الدعوة إلى 'accepted'
   - ✅ تسجيل الدخول التلقائي
   - ✅ التوجيه إلى /admin/admin.html

#### اختبار 2: دعوة عضو عادي

**التحقق من أن النظام الحالي يعمل:**

```sql
-- 1. تحقق من وجود دعوة معلقة
SELECT * FROM member_invitations
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 1;
```

2. افتح رابط التفعيل:
   ```
   https://www.adeeb.club/members/activate.html?token=YOUR_TOKEN_HERE
   ```

3. تحقق من أن كل شيء يعمل كما هو متوقع

---

### المرحلة 4️⃣: تحديث واجهة الإدارة

#### إضافة تبويب "إدارة الإداريين" في admin.html

**الموقع المقترح:** بعد تبويب "الأعضاء"

```javascript
// في admin.js - إضافة التبويب الجديد
const tabs = {
  // ... التبويبات الموجودة
  'admins-management': {
    title: 'إدارة الإداريين',
    icon: 'fa-user-shield',
    permission: 'admins', // فقط رئيس النادي
    render: renderAdminsManagement
  }
};

// دالة عرض إدارة الإداريين
async function renderAdminsManagement() {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="admins-management-container">
      <div class="page-header">
        <h1><i class="fas fa-user-shield"></i> إدارة الإداريين</h1>
        <button class="btn btn-primary" onclick="showInviteAdminModal()">
          <i class="fas fa-plus"></i> دعوة إداري جديد
        </button>
      </div>
      
      <div class="admins-list" id="adminsList">
        <!-- سيتم ملؤها ديناميكياً -->
      </div>
      
      <div class="pending-invitations">
        <h2><i class="fas fa-clock"></i> الدعوات المعلقة</h2>
        <div id="pendingInvitationsList">
          <!-- سيتم ملؤها ديناميكياً -->
        </div>
      </div>
    </div>
  `;
  
  await loadAdminsList();
  await loadPendingInvitations();
}

// جلب قائمة الإداريين
async function loadAdminsList() {
  try {
    // استدعاء Edge Function: list-admins (موجودة بالفعل)
    const response = await fetch(`${supabaseUrl}/functions/v1/list-admins`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseKey
      }
    });
    
    const admins = await response.json();
    
    // عرض القائمة
    const listContainer = document.getElementById('adminsList');
    listContainer.innerHTML = admins.map(admin => `
      <div class="admin-card">
        <div class="admin-info">
          <h3>${admin.email}</h3>
          <p>${admin.position || 'غير محدد'}</p>
          <span class="admin-level-badge">المستوى ${admin.admin_level}</span>
        </div>
        <div class="admin-actions">
          <button onclick="editAdminPermissions('${admin.user_id}')">
            <i class="fas fa-key"></i> الصلاحيات
          </button>
          <button onclick="editAdminLevel('${admin.user_id}')">
            <i class="fas fa-layer-group"></i> المستوى
          </button>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading admins:', error);
  }
}

// جلب الدعوات المعلقة
async function loadPendingInvitations() {
  try {
    const { data: invitations, error } = await supabase
      .from('admin_invitations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const listContainer = document.getElementById('pendingInvitationsList');
    
    if (!invitations || invitations.length === 0) {
      listContainer.innerHTML = '<p class="no-data">لا توجد دعوات معلقة</p>';
      return;
    }
    
    listContainer.innerHTML = invitations.map(inv => {
      const expiresAt = new Date(inv.expires_at);
      const now = new Date();
      const hoursRemaining = Math.floor((expiresAt - now) / 1000 / 60 / 60);
      
      return `
        <div class="invitation-card">
          <div class="invitation-info">
            <h4>${inv.full_name}</h4>
            <p>${inv.email}</p>
            <p>${inv.position}</p>
            <span class="time-remaining">
              ${hoursRemaining > 0 ? `${hoursRemaining} ساعة متبقية` : 'منتهية'}
            </span>
          </div>
          <div class="invitation-actions">
            <button onclick="copyInvitationLink('${inv.invitation_token}')">
              <i class="fas fa-copy"></i> نسخ الرابط
            </button>
            <button onclick="resendInvitation('${inv.id}')">
              <i class="fas fa-paper-plane"></i> إعادة إرسال
            </button>
            <button onclick="cancelInvitation('${inv.id}')" class="btn-danger">
              <i class="fas fa-times"></i> إلغاء
            </button>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading pending invitations:', error);
  }
}

// نموذج دعوة إداري جديد
function showInviteAdminModal() {
  // عرض نموذج modal لإدخال بيانات الإداري الجديد
  // يتضمن: البريد، الاسم، الجوال، المسمى، المستوى، الصلاحيات
  
  const modal = `
    <div class="modal" id="inviteAdminModal">
      <div class="modal-content">
        <h2>دعوة إداري جديد</h2>
        <form id="inviteAdminForm">
          <div class="form-group">
            <label>البريد الإلكتروني *</label>
            <input type="email" name="email" required>
          </div>
          
          <div class="form-group">
            <label>الاسم الكامل *</label>
            <input type="text" name="full_name" required>
          </div>
          
          <div class="form-group">
            <label>رقم الجوال</label>
            <input type="tel" name="phone">
          </div>
          
          <div class="form-group">
            <label>المسمى الوظيفي *</label>
            <input type="text" name="position" required 
                   placeholder="مثال: قائد لجنة الإعلام">
          </div>
          
          <div class="form-group">
            <label>المستوى الإداري *</label>
            <select name="admin_level" required>
              <option value="2">نائب الرئيس</option>
              <option value="3" selected>قائد لجنة</option>
              <option value="4">مسؤول إداري</option>
              <option value="5">رئيس تنفيذي</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>الصلاحيات</label>
            <div class="permissions-checkboxes">
              <!-- قائمة checkboxes للصلاحيات -->
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-paper-plane"></i> إرسال الدعوة
            </button>
            <button type="button" onclick="closeModal()">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modal);
  
  // معالج إرسال النموذج
  document.getElementById('inviteAdminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await sendAdminInvitation(new FormData(e.target));
  });
}

// إرسال دعوة إداري
async function sendAdminInvitation(formData) {
  try {
    // استدعاء Edge Function: invite-admin (موجودة بالفعل)
    const response = await fetch(`${supabaseUrl}/functions/v1/invite-admin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: formData.get('email'),
        full_name: formData.get('full_name'),
        phone: formData.get('phone'),
        position: formData.get('position'),
        admin_level: parseInt(formData.get('admin_level')),
        permissions: getSelectedPermissions(), // من checkboxes
        redirectTo: `${window.location.origin}/admin/activate.html`
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'فشل إرسال الدعوة');
    }
    
    alert('✅ تم إرسال الدعوة بنجاح!');
    closeModal();
    await loadPendingInvitations();
    
  } catch (error) {
    console.error('Error sending invitation:', error);
    alert('❌ ' + error.message);
  }
}

// نسخ رابط الدعوة
function copyInvitationLink(token) {
  const link = `${window.location.origin}/admin/activate.html?token=${token}`;
  navigator.clipboard.writeText(link);
  alert('✅ تم نسخ الرابط!');
}
```

---

### المرحلة 5️⃣: تحديث Edge Function: invite-admin

**الملف موجود بالفعل لكن يحتاج تحديث بسيط:**

```typescript
// في supabase/functions/invite-admin/index.ts
// تحديث لإنشاء سجل في admin_invitations بدلاً من إرسال دعوة Auth مباشرة

// بعد التحقق من الصلاحيات...

// إنشاء token فريد
const invitationToken = crypto.randomUUID();
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7); // صالح لمدة 7 أيام

// إنشاء سجل الدعوة
const { data: invitation, error: invError } = await adminClient
  .from('admin_invitations')
  .insert({
    email: email,
    full_name: full_name,
    phone: phone,
    position: position,
    admin_level: admin_level,
    admin_type: admin_type,
    permissions: permissions,
    invitation_token: invitationToken,
    expires_at: expiresAt.toISOString(),
    invited_by: caller.id,
    invited_by_name: caller.user_metadata?.full_name || caller.email,
    invited_by_position: caller.user_metadata?.position
  })
  .select()
  .single();

if (invError) {
  return new Response(JSON.stringify({ error: invError.message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}

// إرسال البريد الإلكتروني عبر Resend
const activationUrl = `${redirectTo}?token=${invitationToken}`;

// ... إرسال البريد ...

return new Response(JSON.stringify({
  ok: true,
  invitation_id: invitation.id,
  activation_url: activationUrl
}), {
  status: 200,
  headers: { 'Content-Type': 'application/json', ...cors }
});
```

---

## ✅ قائمة التحقق النهائية

### قاعدة البيانات
- [ ] تم إنشاء جدول `admin_invitations`
- [ ] تم تحديث جدول `admins` بالأعمدة الجديدة
- [ ] تم إنشاء RLS policies
- [ ] تم إنشاء Triggers
- [ ] تم إنشاء Indexes

### Edge Functions
- [ ] تم نشر `verify-member-invitation`
- [ ] تم نشر `verify-admin-invitation`
- [ ] تم نشر `activate-admin-account`
- [ ] تم تحديث `invite-admin`

### الواجهات
- [ ] تم إنشاء `/admin/activate.html`
- [ ] تم إنشاء `/admin/activate.js`
- [ ] تم تحديث `/admin/admin.html` (إضافة تبويب إدارة الإداريين)
- [ ] تم تحديث `/admin/admin.js` (إضافة الدوال المطلوبة)

### الاختبار
- [ ] اختبار دعوة إداري جديد
- [ ] اختبار تفعيل حساب إداري
- [ ] اختبار الصلاحيات
- [ ] اختبار انتهاء الصلاحية
- [ ] اختبار دعوة عضو عادي (للتأكد من عدم التأثير)

### البريد الإلكتروني
- [ ] تم إعداد قالب بريد دعوة الإداري
- [ ] تم اختبار إرسال البريد عبر Resend
- [ ] تم التحقق من استلام البريد

---

## 🐛 استكشاف الأخطاء

### خطأ: "401 Unauthorized" عند استدعاء Edge Functions

**السبب:**
- Edge Functions تتطلب `Authorization` header حتى للـ endpoints العامة

**الحل:**
تأكد من إضافة `Authorization` header في جميع استدعاءات Edge Functions:

```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/function-name`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,  // ← مهم!
    'apikey': supabaseKey
  },
  body: JSON.stringify({ ... })
});
```

**ملاحظة:** تم تصحيح هذا في `admin/activate.js` بالفعل.

---

### خطأ: "Invalid or expired invitation"

**السبب المحتمل:**
- التوكن غير صحيح
- الدعوة منتهية الصلاحية
- حالة الدعوة ليست 'pending'

**الحل:**
```sql
-- تحقق من الدعوة
SELECT * FROM admin_invitations
WHERE invitation_token = 'YOUR_TOKEN'
AND status = 'pending';

-- إعادة تعيين الصلاحية
UPDATE admin_invitations
SET expires_at = now() + interval '7 days',
    status = 'pending'
WHERE invitation_token = 'YOUR_TOKEN';
```

### خطأ: "Failed to create admin record"

**السبب المحتمل:**
- RLS policies تمنع الإدراج
- الأعمدة المطلوبة غير موجودة

**الحل:**
```sql
-- تحقق من RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'admins';

-- تعطيل RLS مؤقتاً للاختبار (لا تفعل هذا في الإنتاج!)
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;

-- بعد الاختبار، أعد تفعيله
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
```

### خطأ: "Email already registered"

**السبب:** البريد مسجل مسبقاً في auth.users

**الحل:**
```sql
-- حذف المستخدم من Auth (إذا كان اختبار)
-- في Supabase Dashboard → Authentication → Users
-- أو عبر SQL:
-- لا يمكن حذف users مباشرة، استخدم Dashboard
```

---

## 📞 الدعم

إذا واجهت أي مشاكل:

1. **تحقق من Logs:**
   - Supabase Dashboard → Logs → Edge Functions
   - Browser Console (F12)

2. **راجع التصميم:**
   - `files/NEW_ACTIVATION_SYSTEM_DESIGN.md`

3. **اختبر كل خطوة على حدة:**
   - قاعدة البيانات أولاً
   - ثم Edge Functions
   - ثم الواجهات

---

**تاريخ الإنشاء**: 27 نوفمبر 2024  
**الإصدار**: 1.0  
**الحالة**: جاهز للتنفيذ
