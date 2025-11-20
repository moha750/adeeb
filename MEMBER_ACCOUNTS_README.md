# 🚀 البدء السريع - نظام حسابات الأعضاء

## ✅ تم التنفيذ

تم تطبيق نظام حسابات الأعضاء بنجاح! الملفات التالية جاهزة للاستخدام:

### 📁 الملفات المنشأة

```
✓ sql/member_accounts_setup.sql         - سكريبت قاعدة البيانات
✓ members/activate.html                 - صفحة تفعيل الحساب
✓ members/activate.js                   - منطق التفعيل
✓ members/dashboard.html                - لوحة تحكم الأعضاء
✓ members/dashboard.css                 - تصميم لوحة التحكم
✓ members/dashboard.js                  - منطق لوحة التحكم
✓ auth/login.html (محدّث)              - نظام تسجيل دخول محسّن
✓ MEMBER_ACCOUNTS_GUIDE.md              - دليل شامل
```

## 🎯 الخطوات التالية

### 1. تشغيل سكريبت قاعدة البيانات ⚡

```sql
-- افتح Supabase SQL Editor وشغّل:
-- sql/member_accounts_setup.sql
```

هذا السكريبت سينشئ:
- ✅ أعمدة جديدة في جدول `members`
- ✅ جدول `member_invitations` للدعوات
- ✅ جدول `member_activity_log` لتتبع النشاط
- ✅ جدول `member_statistics` للإحصائيات
- ✅ صلاحيات RLS محكمة
- ✅ دوال مساعدة

### 2. اختبار النظام 🧪

#### أ) إنشاء دعوة تفعيل يدوياً

```sql
-- أضف عضو جديد أو استخدم عضو موجود
INSERT INTO members (full_name, email, committee) 
VALUES ('اسم تجريبي', 'test@example.com', 'لجنة التأليف');

-- أنشئ دعوة تفعيل
INSERT INTO member_invitations (
  member_id,
  email,
  invitation_token,
  expires_at
) 
SELECT 
  id,
  email,
  gen_random_uuid()::text,
  NOW() + INTERVAL '7 days'
FROM members 
WHERE email = 'test@example.com';

-- احصل على رابط التفعيل
SELECT 
  'http://localhost:5500/members/activate.html?token=' || invitation_token as url
FROM member_invitations
WHERE email = 'test@example.com'
AND status = 'pending'
ORDER BY created_at DESC
LIMIT 1;
```

#### ب) اختبر التفعيل

1. افتح الرابط الناتج
2. أنشئ كلمة مرور قوية
3. فعّل الحساب
4. سيتم توجيهك للوحة التحكم

#### ج) اختبر تسجيل الدخول

1. افتح `auth/login.html`
2. سجل دخول بالبريد وكلمة المرور
3. تحقق من التوجيه الصحيح:
   - إداري → `admin/admin.html`
   - عضو → `members/dashboard.html`

## 🔄 الميزات المتبقية (اختيارية)

### 1. إضافة زر إرسال الدعوات في لوحة الإدارة

في `admin/admin.js`، أضف في قسم الأعضاء:

```javascript
// زر إرسال دعوة لعضو واحد
async function sendMemberInvitation(memberId) {
  const member = members.find(m => m.id === memberId);
  
  if (!member || !member.email) {
    alert('البريد الإلكتروني مطلوب');
    return;
  }
  
  if (member.user_id) {
    alert('هذا العضو فعّل حسابه مسبقاً');
    return;
  }
  
  try {
    // إنشاء توكن
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // حفظ الدعوة
    const { error } = await sb.from('member_invitations').insert({
      member_id: memberId,
      email: member.email,
      invitation_token: token,
      expires_at: expiresAt.toISOString(),
      created_by: (await sb.auth.getUser()).data.user.id
    });
    
    if (error) throw error;
    
    // عرض الرابط
    const invitationUrl = `${window.location.origin}/members/activate.html?token=${token}`;
    
    Swal.fire({
      title: 'تم إنشاء الدعوة',
      html: `
        <p>انسخ هذا الرابط وأرسله للعضو:</p>
        <input type="text" value="${invitationUrl}" 
               style="width:100%;padding:10px;margin:10px 0;border:1px solid #ddd;border-radius:5px;"
               onclick="this.select()" readonly>
        <p style="color:#666;font-size:12px;">صالح لمدة 7 أيام</p>
      `,
      icon: 'success',
      confirmButtonText: 'نسخ الرابط',
      showCancelButton: true,
      cancelButtonText: 'إغلاق'
    }).then((result) => {
      if (result.isConfirmed) {
        navigator.clipboard.writeText(invitationUrl);
        Swal.fire('تم النسخ!', 'تم نسخ الرابط للحافظة', 'success');
      }
    });
    
  } catch (err) {
    console.error(err);
    alert('فشل إنشاء الدعوة: ' + err.message);
  }
}
```

### 2. Edge Function لإرسال البريد (اختياري)

إذا أردت إرسال الدعوات تلقائياً عبر البريد:

```typescript
// supabase/functions/send-member-invitation/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { memberId } = await req.json()
  
  // المنطق هنا...
  // استخدم Resend أو SendGrid لإرسال البريد
  
  return new Response(JSON.stringify({ success: true }))
})
```

### 3. تحديث الهيدر في الصفحة الرئيسية

في `script.js`، أضف في نهاية الملف:

```javascript
// تحديث زر تسجيل الدخول ليعرض معلومات المستخدم
async function updateHeaderAuth() {
  const loginBtn = document.getElementById('adminLoginBtn');
  if (!loginBtn || !sb) return;
  
  try {
    const { data: { session } } = await sb.auth.getSession();
    
    if (session) {
      const userId = session.user.id;
      
      // التحقق من نوع الحساب
      const { data: adminRow } = await sb
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      const { data: memberRow } = await sb
        .from('members')
        .select('full_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (adminRow) {
        loginBtn.innerHTML = '<i class="fa-solid fa-gauge"></i> لوحة الإدارة';
        loginBtn.href = 'admin/admin.html';
      } else if (memberRow) {
        loginBtn.innerHTML = '<i class="fa-solid fa-user"></i> لوحة التحكم';
        loginBtn.href = 'members/dashboard.html';
      }
    }
  } catch (err) {
    console.error('Error updating header auth:', err);
  }
}

// استدعاء عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', updateHeaderAuth);
```

## 📊 التحقق من التثبيت

### استعلامات مفيدة

```sql
-- 1. التحقق من الجداول
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'member%';

-- 2. عرض الأعضاء وحالة حساباتهم
SELECT 
  full_name,
  email,
  account_status,
  CASE WHEN user_id IS NOT NULL THEN 'مفعّل' ELSE 'غير مفعّل' END as activation
FROM members
ORDER BY created_at DESC;

-- 3. عرض الدعوات النشطة
SELECT 
  m.full_name,
  mi.email,
  mi.status,
  mi.expires_at
FROM member_invitations mi
JOIN members m ON m.id = mi.member_id
WHERE mi.status = 'pending'
ORDER BY mi.created_at DESC;

-- 4. إحصائيات سريعة
SELECT 
  COUNT(*) as total_members,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as activated,
  COUNT(*) FILTER (WHERE account_status = 'active') as active
FROM members;
```

## 🎨 التخصيص

### تغيير الألوان

في `members/dashboard.css`:

```css
:root {
  --primary-color: #667eea;      /* لونك الأساسي */
  --primary-dark: #764ba2;       /* لون أغمق */
  --success-color: #10b981;      /* لون النجاح */
  /* ... */
}
```

### تغيير مدة صلاحية الدعوة

في SQL:

```sql
-- غيّر من 7 أيام إلى 14 يوم مثلاً
NOW() + INTERVAL '14 days'
```

## 🔒 الأمان

### نقاط مهمة

1. ✅ **RLS مفعّل**: جميع الجداول محمية بـ Row Level Security
2. ✅ **كلمات مرور قوية**: النظام يفرض معايير قوية
3. ✅ **انتهاء الدعوات**: الروابط تنتهي بعد 7 أيام
4. ✅ **تتبع النشاط**: كل نشاط مسجل في `member_activity_log`

### توصيات إضافية

- 🔐 فعّل التحقق بخطوتين في Supabase
- 🔐 استخدم HTTPS دائماً
- 🔐 راجع سجل النشاط بانتظام
- 🔐 احتفظ بنسخ احتياطية

## 📚 المراجع

- **الدليل الشامل**: `MEMBER_ACCOUNTS_GUIDE.md`
- **Supabase Docs**: https://supabase.com/docs
- **دعم النادي**: adeab.kfu@gmail.com

## ✨ الخلاصة

تم تطبيق نظام حسابات الأعضاء بنجاح! الآن يمكنك:

✅ إضافة أعضاء جدد  
✅ إرسال دعوات تفعيل  
✅ السماح للأعضاء بتسجيل الدخول  
✅ إدارة الملفات الشخصية  
✅ تتبع النشاط والإحصائيات  

**الخطوة التالية**: شغّل سكريبت SQL واختبر النظام! 🚀

---

**نادي أديب - جامعة الملك فيصل**  
*نوفمبر 2024*
