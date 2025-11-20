# 📧 إعداد نظام إرسال الدعوات عبر البريد الإلكتروني

## ✅ التحديثات المطبقة

تم تعديل نظام الدعوات ليرسل رسائل البريد الإلكتروني **تلقائياً** مع خيار عرض الرابط يدوياً.

---

## 🎯 ما الجديد؟

### قبل التحديث ❌
- إنشاء الدعوة في قاعدة البيانات فقط
- عرض الرابط للإداري لنسخه يدوياً
- الإداري يرسل الرابط للعضو عبر واتساب/بريد

### بعد التحديث ✅
- **إرسال بريد إلكتروني تلقائي** للعضو
- رسالة بريد احترافية بتصميم جميل
- خيار اختياري لعرض الرابط للإداري
- تتبع حالة الإرسال (نجح/فشل)

---

## 📋 متطلبات الإعداد

### 1. حساب Resend (مجاني)

**Resend** هو خدمة إرسال البريد الإلكتروني الموصى بها من Supabase.

#### التسجيل:
1. اذهب إلى: https://resend.com/signup
2. سجل حساب جديد (مجاني - 100 بريد/يوم)
3. فعّل البريد الإلكتروني

#### الحصول على API Key:
1. اذهب إلى: https://resend.com/api-keys
2. اضغط **"Create API Key"**
3. اختر اسم مثل: `adeeb-invitations`
4. اختر الصلاحيات: **Sending access**
5. انسخ المفتاح (يبدأ بـ `re_...`)

⚠️ **مهم**: احفظ المفتاح في مكان آمن - لن تتمكن من رؤيته مرة أخرى!

---

### 2. إعداد النطاق (Domain)

لإرسال رسائل من `noreply@adeeb.club`:

#### في Resend:
1. اذهب إلى: https://resend.com/domains
2. اضغط **"Add Domain"**
3. أدخل: `adeeb.club`
4. اتبع التعليمات لإضافة سجلات DNS

#### في مزود النطاق (مثل Namecheap):
أضف السجلات التالية في DNS:

```
Type: TXT
Host: @
Value: [القيمة من Resend]

Type: MX
Host: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10

Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none;

Type: TXT  
Host: resend._domainkey
Value: [القيمة من Resend]
```

⏱️ **ملاحظة**: قد يستغرق التفعيل من 15 دقيقة إلى 48 ساعة.

---

## 🚀 نشر Edge Function

### الطريقة 1: عبر Supabase CLI (موصى بها)

#### تثبيت Supabase CLI:

**Windows (PowerShell):**
```powershell
scoop install supabase
```

**أو عبر npm:**
```bash
npm install -g supabase
```

#### تسجيل الدخول:
```bash
supabase login
```

#### ربط المشروع:
```bash
cd "e:\moham\Downloads\adeeb web"
supabase link --project-ref YOUR_PROJECT_REF
```

للحصول على `PROJECT_REF`:
1. افتح: https://supabase.com/dashboard/project/_/settings/general
2. انسخ **Reference ID**

#### نشر Edge Function:
```bash
supabase functions deploy send-member-invitation
```

#### إضافة API Key كـ Secret:
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

---

### الطريقة 2: عبر Supabase Dashboard

#### رفع الملفات:
1. افتح: https://supabase.com/dashboard/project/_/functions
2. اضغط **"Create a new function"**
3. اسم الدالة: `send-member-invitation`
4. انسخ محتوى `supabase/functions/send-member-invitation/index.ts`
5. الصقه في المحرر
6. اضغط **"Deploy"**

#### إضافة Secrets:
1. اذهب إلى: https://supabase.com/dashboard/project/_/settings/functions
2. في قسم **"Secrets"**:
   - اضغط **"Add secret"**
   - الاسم: `RESEND_API_KEY`
   - القيمة: `re_your_api_key_here`
3. احفظ

---

## 🧪 اختبار النظام

### 1. اختبار إرسال دعوة واحدة

```javascript
// في Console المتصفح (F12)
const testMember = {
  id: 'test-member-id',
  email: 'your-email@example.com',
  full_name: 'اسم تجريبي',
  committee: 'لجنة التأليف'
};

// استدعاء الدالة
sendMemberInvitation(testMember.id);
```

### 2. التحقق من الإرسال

#### في Resend Dashboard:
1. اذهب إلى: https://resend.com/emails
2. ستجد قائمة الرسائل المرسلة
3. تحقق من الحالة: **Delivered** ✅

#### في البريد الإلكتروني:
1. افتح صندوق الوارد
2. ابحث عن رسالة من: `نادي أديب <noreply@adeeb.club>`
3. تحقق من التصميم والرابط

---

## 🎨 تخصيص رسالة البريد

يمكنك تعديل تصميم البريد في:
```
supabase/functions/send-member-invitation/index.ts
```

### تغيير الألوان:
```typescript
// ابحث عن:
background:linear-gradient(135deg, #274060 0%, #3d8fd6 100%)

// غيّر إلى ألوانك:
background:linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%)
```

### تغيير الشعار:
```typescript
// أضف في الـ Header:
<img src="https://www.adeeb.club/logo.png" alt="شعار أديب" style="max-width:150px;">
```

### إضافة روابط التواصل:
```typescript
// في الـ Footer، عدّل:
<a href="https://twitter.com/AB_KFU" ...>🐦 تويتر</a>
<a href="https://instagram.com/adeeb_kfu" ...>📷 انستقرام</a>
```

---

## 📊 مراقبة الأداء

### في Supabase Dashboard:

#### عرض Logs:
```bash
supabase functions logs send-member-invitation
```

أو في Dashboard:
1. https://supabase.com/dashboard/project/_/functions/send-member-invitation/logs

#### إحصائيات الاستخدام:
1. https://supabase.com/dashboard/project/_/functions
2. اضغط على `send-member-invitation`
3. شاهد: Invocations, Errors, Duration

### في Resend Dashboard:

1. https://resend.com/emails
2. فلتر حسب: Status, Date, Domain
3. شاهد: Delivered, Bounced, Complained

---

## 🐛 استكشاف الأخطاء

### المشكلة: "Failed to send email"

**الأسباب المحتملة:**
1. ❌ `RESEND_API_KEY` غير مضبوط
2. ❌ النطاق غير مفعّل في Resend
3. ❌ البريد الإلكتروني غير صحيح

**الحل:**
```bash
# تحقق من Secrets
supabase secrets list

# أعد ضبط API Key
supabase secrets set RESEND_API_KEY=re_your_new_key
```

---

### المشكلة: "Unauthorized"

**السبب:**
- المستخدم ليس إداري

**الحل:**
تحقق من جدول `admins`:
```sql
SELECT * FROM admins WHERE user_id = 'YOUR_USER_ID';
```

---

### المشكلة: البريد يذهب إلى Spam

**الحلول:**
1. ✅ فعّل النطاق في Resend بالكامل
2. ✅ أضف سجلات SPF, DKIM, DMARC
3. ✅ استخدم نطاق مخصص (ليس Gmail/Outlook)
4. ✅ أضف رابط "إلغاء الاشتراك" (اختياري)

---

### المشكلة: Edge Function لا تعمل

**التحقق:**
```bash
# اختبر محلياً
supabase functions serve send-member-invitation

# في نافذة أخرى
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-member-invitation' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"member_id":"test","email":"test@example.com","full_name":"Test"}'
```

---

## 💰 التكاليف

### Resend - الخطة المجانية:
- ✅ **100 بريد/يوم**
- ✅ **3,000 بريد/شهر**
- ✅ نطاق مخصص واحد
- ✅ API غير محدود

### Resend - الخطة المدفوعة ($20/شهر):
- ✅ **50,000 بريد/شهر**
- ✅ نطاقات غير محدودة
- ✅ دعم فني
- ✅ تحليلات متقدمة

### Supabase Edge Functions:
- ✅ **2 مليون طلب/شهر** (مجاناً)
- ✅ بعد ذلك: $2 لكل مليون طلب

**للنادي الطلابي**: الخطة المجانية كافية تماماً! 🎉

---

## 🔒 الأمان

### حماية API Key:
- ✅ لا تضع المفتاح في الكود
- ✅ استخدم Supabase Secrets فقط
- ✅ لا تشارك المفتاح مع أحد
- ✅ غيّر المفتاح إذا تسرب

### حماية Edge Function:
- ✅ التحقق من المصادقة (Authentication)
- ✅ التحقق من الصلاحيات (Admin only)
- ✅ التحقق من صحة البريد الإلكتروني
- ✅ Rate limiting (500ms بين كل طلب)

---

## 📝 ملخص خطوات الإعداد

```bash
# 1. إنشاء حساب Resend
https://resend.com/signup

# 2. الحصول على API Key
https://resend.com/api-keys

# 3. إضافة النطاق (اختياري للبداية)
https://resend.com/domains

# 4. تسجيل الدخول لـ Supabase CLI
supabase login

# 5. ربط المشروع
cd "e:\moham\Downloads\adeeb web"
supabase link --project-ref YOUR_PROJECT_REF

# 6. نشر Edge Function
supabase functions deploy send-member-invitation

# 7. إضافة API Key
supabase secrets set RESEND_API_KEY=re_your_api_key_here

# 8. اختبار!
# افتح لوحة الإدارة وأرسل دعوة تجريبية
```

---

## 🎉 الخلاصة

الآن نظام الدعوات:
- ✅ يرسل البريد الإلكتروني **تلقائياً**
- ✅ تصميم احترافي وجميل
- ✅ خيار عرض الرابط **اختياري**
- ✅ تتبع حالة الإرسال
- ✅ معالجة الأخطاء

**جاهز للاستخدام! 🚀**

---

## 📚 مراجع مفيدة

- [Resend Documentation](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Email Best Practices](https://resend.com/docs/knowledge-base/best-practices)

---

**نادي أديب - جامعة الملك فيصل**  
*نوفمبر 2024*
