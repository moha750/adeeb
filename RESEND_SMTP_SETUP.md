# ربط Resend SMTP مع Supabase Auth

## المشكلة الحالية
- **الدعوات**: تُرسل عبر Resend ✅ (3000 رسالة/شهر)
- **التفعيل**: يُرسل عبر Supabase الافتراضي ❌ (2 رسائل/ساعة)

## الحل
ربط Supabase Auth باستخدام Resend SMTP لجميع رسائل المصادقة.

---

## خطوات التطبيق

### 1. الحصول على بيانات SMTP من Resend

1. اذهب إلى [Resend Dashboard](https://resend.com/settings/smtp)
2. ستجد البيانات التالية:

```
Host: smtp.resend.com
Port: 587 (or 465 for SSL)
Username: resend
Password: [Your RESEND_API_KEY]
```

⚠️ **مهم**: استخدم نفس `RESEND_API_KEY` الموجود في Edge Function

---

### 2. إعداد SMTP في Supabase Dashboard

#### أ. افتح إعدادات المصادقة
1. اذهب إلى [Supabase Dashboard](https://app.supabase.com)
2. اختر مشروعك: `xniaivonejocibhspfhu`
3. من القائمة الجانبية: **Settings** → **Authentication**

#### ب. قم بالتمرير إلى SMTP Settings
ابحث عن قسم **"SMTP Settings"** أو **"Email Settings"**

#### ج. أدخل بيانات Resend

```
Enable Custom SMTP: ✅ (فعّل)

Host: smtp.resend.com
Port: 587
Username: resend
Password: [RESEND_API_KEY]

Sender Email: noreply@adeeb.club
Sender Name: نادي أديب
```

#### د. احفظ التغييرات
اضغط **Save** أو **Update**

---

### 3. اختبار الإعداد

#### أ. اختبار من Dashboard
في نفس صفحة SMTP Settings، ابحث عن زر **"Send Test Email"**

#### ب. اختبار من التطبيق
1. افتح صفحة التفعيل
2. أدخل البيانات
3. يجب أن يعمل بدون أخطاء rate limit

---

## التحقق من النجاح

### علامات النجاح ✅
- لا تظهر رسالة `rate limit exceeded`
- تصل رسائل التفعيل بسرعة
- المرسل يظهر: `نادي أديب <noreply@adeeb.club>`

### إذا لم يعمل ❌
تحقق من:
- [ ] هل `RESEND_API_KEY` صحيح؟
- [ ] هل النطاق `adeeb.club` مُفعّل في Resend؟
- [ ] هل فعّلت خيار "Enable Custom SMTP"؟
- [ ] راجع **Logs** في Supabase Dashboard

---

## الفوائد

| قبل | بعد |
|-----|-----|
| 2 رسائل/ساعة | 3000 رسائل/شهر |
| خادم Supabase الافتراضي | Resend SMTP |
| مرسلين مختلفين | مرسل واحد موحد |
| rate limit errors | لا أخطاء |

---

## ملاحظات إضافية

### نطاق البريد الإلكتروني
تأكد من أن `adeeb.club` مُفعّل في Resend:
1. اذهب إلى [Resend Domains](https://resend.com/domains)
2. تحقق من حالة النطاق: **Verified** ✅

### حدود Resend المجانية
- **3,000** رسالة/شهر
- **100** رسالة/يوم
- إذا تجاوزت الحد، ترقّ إلى خطة مدفوعة

### قوالب البريد الإلكتروني
يمكنك تخصيص قوالب Supabase Auth من:
**Settings** → **Authentication** → **Email Templates**

---

## استكشاف الأخطاء

### خطأ: "Invalid SMTP credentials"
- تحقق من `RESEND_API_KEY`
- تأكد من أنه يبدأ بـ `re_`

### خطأ: "Domain not verified"
- اذهب إلى Resend Domains
- أكمل التحقق من النطاق

### خطأ: "Port connection failed"
- جرب Port 465 بدلاً من 587
- تأكد من تفعيل SSL/TLS

---

## الخطوات التالية

1. ✅ طبّق الإعدادات أعلاه
2. ✅ اختبر التفعيل
3. ✅ راقب استخدام Resend
4. ✅ خصص قوالب البريد (اختياري)

---

## مراجع مفيدة

- [Resend SMTP Documentation](https://resend.com/docs/send-with-smtp)
- [Supabase Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend Dashboard](https://resend.com/overview)
