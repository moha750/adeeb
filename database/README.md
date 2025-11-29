# دليل قاعدة البيانات - نادي أديب

## نظرة عامة
هذا المجلد يحتوي على جميع ملفات SQL اللازمة لإعداد وتحديث قاعدة البيانات في Supabase.

---

## 📁 الملفات والترتيب

### ملفات الإعداد الأساسية (بالترتيب)

#### 1. `01_create_admin_invitations.sql`
**الوصف**: إنشاء جدول دعوات الإداريين  
**المحتوى**:
- جدول `admin_invitations`
- Indexes للأداء
- Triggers للتحديث التلقائي
- RLS Policies

#### 2. `02_update_admins_table.sql`
**الوصف**: تحديث جدول الإداريين  
**المحتوى**:
- إضافة أعمدة جديدة (`admin_level`, `permissions`, `email`, `full_name`)
- Constraints
- Triggers
- تحديث البيانات الموجودة

#### 3. `03_activate_member_function.sql`
**الوصف**: دالة تفعيل حساب العضو  
**المحتوى**:
- دالة `activate_member_account()`
- معالجة التفعيل الآمن

#### 4. `04_fix_trigger_for_activation.sql`
**الوصف**: إصلاح Triggers للتفعيل  
**المحتوى**:
- تحديث Triggers
- إصلاح المشاكل المعروفة

#### 5. `05_rls_policies_complete.sql` ⭐
**الوصف**: RLS Policies الكاملة لجدول members  
**المحتوى**:
- تنظيف Policies القديمة
- إنشاء Policies للأعضاء
- إنشاء Policies للإداريين
- Policy خاصة للتفعيل
- التحقق من النجاح

**ملاحظة مهمة**: هذا الملف يجمع ويحل محل:
- `FIX_RLS_POLICIES.sql`
- `SIMPLE_RLS_FIX.sql`
- `NUCLEAR_FIX.sql`

#### 6. `06_add_order_column_to_board_members.sql`
**الوصف**: إضافة عمود الترتيب لأعضاء المجلس  
**المحتوى**:
- إضافة عمود `display_order`
- تحديث البيانات الموجودة

---

### ملفات الميزات الإضافية

#### `contact_and_newsletter_tables.sql`
**الوصف**: جداول التواصل والنشرة البريدية  
**المحتوى**:
- جدول `contact_messages`
- جدول `newsletter_subscriptions`
- RLS Policies
- Indexes

**الميزات**:
- حفظ رسائل التواصل من الموقع
- إدارة اشتراكات النشرة البريدية
- حالات متعددة (new, read, replied, archived)
- تصدير البريد الإلكتروني

**الدليل الكامل**: `README_CONTACT_NEWSLETTER.md`

---

#### `news_table.sql`
**الوصف**: جدول الأخبار  
**المحتوى**:
- جدول `news`
- RLS Policies
- Indexes
- Triggers

**الميزات**:
- إدارة أخبار النادي
- حالات متعددة (draft, published, archived)
- دعم الصور
- دعم كُتّاب متعددين
- نظام المشاهدات
- أخبار مميزة

**الدليل الكامل**: `README_NEWS.md`

---

#### `news_storage.sql`
**الوصف**: إعداد Supabase Storage للصور  
**المحتوى**:
- إنشاء bucket `news-images`
- Policies للقراءة والرفع

---

#### `news_images_update.sql`
**الوصف**: تحديث جدول الأخبار لدعم الصور  
**المحتوى**:
- إضافة عمود `image_url`
- تحديث RLS Policies

---

### ملفات SQL الأخرى

#### `member_accounts_setup.sql` (في مجلد `sql/`)
**الوصف**: إعداد حسابات الأعضاء  
**ملاحظة**: يُنصح بنقله إلى مجلد `database/`

---

## 🚀 الاستخدام

### للإعداد الأولي:
```bash
# 1. شغّل الملفات بالترتيب
01_create_admin_invitations.sql
02_update_admins_table.sql
03_activate_member_function.sql
04_fix_trigger_for_activation.sql
05_rls_policies_complete.sql
06_add_order_column_to_board_members.sql

# 2. إذا كنت تريد ميزة الأخبار
news_table.sql
news_storage.sql

# 3. إذا كنت تريد ميزة التواصل والنشرة
contact_and_newsletter_tables.sql
```

### لإصلاح مشاكل RLS:
```bash
# شغّل هذا الملف فقط
05_rls_policies_complete.sql
```

---

## 🔐 الأمان

### Row Level Security (RLS)
جميع الجداول محمية بـ RLS مع السياسات التالية:

#### جدول `members`:
- **القراءة**: الأعضاء يقرأون بياناتهم فقط، الإداريون يقرأون الكل
- **التحديث**: الأعضاء يحدثون بياناتهم فقط، الإداريون يحدثون الكل
- **التفعيل**: Policy خاصة للسماح بالتحديث عندما `user_id = NULL`

#### جدول `admin_invitations`:
- **القراءة**: المصادقون فقط
- **الإضافة/التحديث**: المصادقون فقط

#### جدول `contact_messages`:
- **الإدراج**: الجميع (للسماح بإرسال الرسائل من الموقع)
- **القراءة/التحديث**: المصادقون فقط

#### جدول `newsletter_subscriptions`:
- **الإدراج**: الجميع (للسماح بالاشتراك من الموقع)
- **القراءة/التحديث**: المصادقون فقط

#### جدول `news`:
- **القراءة العامة**: الأخبار المنشورة فقط
- **القراءة الكاملة**: المصادقون يقرأون كل شيء
- **الإضافة/التحديث/الحذف**: المصادقون فقط

---

## 📊 الجداول الرئيسية

### `members`
- معلومات الأعضاء
- حالة الحساب
- ربط مع Auth

### `admins`
- معلومات الإداريين
- المستويات والصلاحيات
- ربط مع Auth

### `admin_invitations`
- دعوات الإداريين
- التوكنات
- حالة الدعوة

### `member_invitations`
- دعوات الأعضاء
- التوكنات
- حالة الدعوة

### `contact_messages`
- رسائل التواصل من الموقع
- الحالات (new, read, replied, archived)

### `newsletter_subscriptions`
- اشتراكات النشرة البريدية
- الحالات (active, unsubscribed)

### `news`
- أخبار النادي
- الحالات (draft, published, archived)
- الصور والكُتّاب

---

## 🔧 استكشاف الأخطاء

### مشكلة: RLS يمنع التحديث
**الحل**: شغّل `05_rls_policies_complete.sql`

### مشكلة: لا يمكن رفع الصور
**الحل**: شغّل `news_storage.sql`

### مشكلة: خطأ في التفعيل
**الحل**: 
1. شغّل `05_rls_policies_complete.sql`
2. راجع `docs/troubleshooting/ACTIVATION_COMPLETE_GUIDE.md`

---

## 📝 ملاحظات مهمة

1. **الترتيب مهم**: شغّل الملفات بالترتيب المذكور
2. **النسخ الاحتياطي**: خذ نسخة احتياطية قبل التشغيل
3. **الاختبار**: اختبر في بيئة تطوير أولاً
4. **التوثيق**: راجع الملفات الفردية للتفاصيل

---

## 📚 مراجع إضافية

- `docs/guides/` - أدلة الاستخدام
- `docs/troubleshooting/` - حل المشاكل
- `docs/archive/` - ملفات قديمة للمرجع

---

**آخر تحديث**: نوفمبر 2024  
**الإصدار**: 2.0
