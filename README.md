# نادي أديب - Adeeb Club

## نظرة عامة
موقع نادي أديب الثقافي - منصة شاملة لإدارة النادي وعرض الأنشطة والأخبار.

---

## 📁 هيكل المشروع

### الصفحات الرئيسية
- `index.html` - الصفحة الرئيسية
- `constitution.html` - الدستور
- `membership.html` - العضوية

### الأخبار
- `news/` - نظام إدارة الأخبار
  - `news.html` - صفحة الأخبار
  - `news-detail.html` - تفاصيل الخبر
  - `news.js` & `news.css` - المنطق والتنسيق

### لوحة التحكم الإدارية
- `admin/` - لوحة التحكم
  - `admin.html` - اللوحة الرئيسية
  - `activate.html` - تفعيل الإداريين
  - إدارة الأعضاء والإداريين
  - إدارة الأخبار
  - رسائل التواصل والنشرة البريدية

### لوحة الأعضاء
- `members/` - لوحة الأعضاء
  - `dashboard.html` - لوحة التحكم
  - `activate.html` - تفعيل الحساب

### المجلس الإداري
- `board/` - صفحة المجلس الإداري

### المواعيد
- `appointments/` - نظام المواعيد

### النماذج
- `forms/` - نظام النماذج الديناميكية

### المرافئ (المدونة)
- `marafi/` - نظام المدونة
  - `blog/` - صفحة المدونة
  - `blogger/` - لوحة الكاتب

---

## 🗄️ قاعدة البيانات

جميع ملفات SQL موجودة في مجلد `database/`

### الملفات الأساسية (بالترتيب):
1. `01_create_admin_invitations.sql`
2. `02_update_admins_table.sql`
3. `03_activate_member_function.sql`
4. `04_fix_trigger_for_activation.sql`
5. `05_rls_policies_complete.sql` ⭐
6. `06_add_order_column_to_board_members.sql`

### الميزات الإضافية:
- `contact_and_newsletter_tables.sql` - التواصل والنشرة
- `news_table.sql` - الأخبار
- `news_storage.sql` - تخزين صور الأخبار

**للمزيد**: راجع `database/README.md`

---

## 📚 التوثيق

### الأدلة
- `docs/guides/` - أدلة الاستخدام والإعداد
  - `MEMBER_ACCOUNTS_GUIDE.md`
  - `INVITATIONS_FEATURE.md`
  - `EMAIL_INVITATIONS_SETUP.md`
  - `RESEND_SMTP_SETUP.md`
  - `IMPLEMENTATION_SUMMARY.md`

### حل المشاكل
- `docs/troubleshooting/` - حل المشاكل الشائعة
  - `ACTIVATION_COMPLETE_GUIDE.md` ⭐ - دليل شامل لنظام التفعيل

### الأرشيف
- `docs/archive/` - ملفات قديمة للمرجع
  - ملفات إصلاحات RLS القديمة
  - ملفات troubleshooting السابقة

---

## 🚀 البدء السريع

### 1. إعداد Supabase
```bash
# شغّل ملفات SQL بالترتيب في Supabase SQL Editor
database/01_create_admin_invitations.sql
database/02_update_admins_table.sql
database/03_activate_member_function.sql
database/04_fix_trigger_for_activation.sql
database/05_rls_policies_complete.sql
```

### 2. إعداد SMTP (للبريد الإلكتروني)
راجع `docs/guides/RESEND_SMTP_SETUP.md`

### 3. اختبار النظام
1. افتح لوحة التحكم الإدارية
2. أرسل دعوة لعضو جديد
3. تحقق من وصول البريد
4. فعّل الحساب

---

## 🔐 الأمان

- ✅ Row Level Security (RLS) مفعّل على جميع الجداول
- ✅ مصادقة آمنة عبر Supabase Auth
- ✅ صلاحيات متعددة المستويات للإداريين
- ✅ حماية من SQL Injection
- ✅ تشفير كلمات المرور

---

## 🎨 الميزات

### للزوار
- عرض الأخبار والأنشطة
- الاطلاع على الدستور
- التواصل مع النادي
- الاشتراك في النشرة البريدية

### للأعضاء
- لوحة تحكم شخصية
- عرض البيانات الشخصية
- تتبع الأنشطة

### للإداريين
- إدارة الأعضاء والإداريين
- إدارة الأخبار
- إدارة رسائل التواصل
- إحصائيات شاملة
- نظام الدعوات

---

## 🛠️ التقنيات المستخدمة

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Email**: Resend API
- **Styling**: Custom CSS + TailwindCSS (في بعض الأجزاء)
- **Icons**: Font Awesome, Lucide

---

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل:
1. راجع `docs/troubleshooting/`
2. راجع `database/README.md`
3. تحقق من Browser Console للأخطاء
4. راجع Supabase Dashboard → Logs

---

## 📝 ملاحظات مهمة

1. **النسخ الاحتياطي**: خذ نسخة احتياطية قبل أي تحديثات
2. **الاختبار**: اختبر في بيئة تطوير أولاً
3. **التوثيق**: راجع الملفات الفردية للتفاصيل
4. **الأمان**: لا تشارك مفاتيح API أو كلمات المرور

---

**المطور**: نادي أديب - فريق التطوير  
**آخر تحديث**: نوفمبر 2024  
**الإصدار**: 2.0
