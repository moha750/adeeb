# دليل نظام الصلاحيات المركزي الشامل - نادي أدِيب

## 📋 المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [البدء السريع](#البدء-السريع)
3. [الصلاحيات المتاحة](#الصلاحيات-المتاحة)
4. [استخدام المكتبة](#استخدام-المكتبة)
5. [توثيق API](#توثيق-api)
6. [واجهة المستخدم](#واجهة-المستخدم)
7. [الأمان](#الأمان)
8. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## 🎯 نظرة عامة

نظام الصلاحيات المركزي هو حل شامل ومستقل لإدارة جميع الصلاحيات في نادي أدِيب الأدبي. تم تصميمه ليكون الجهة الوحيدة المسؤولة عن منح وإدارة الصلاحيات، مما يُلغي الحاجة لتعريف الصلاحيات في كل جدول أو قسم منفصل.

### ✨ المميزات

- ✅ **مركزي وموحد**: إدارة جميع الصلاحيات من مكان واحد
- ✅ **مرن وقابل للتوسع**: دعم نطاقات متعددة وشروط مخصصة
- ✅ **آمن**: Row Level Security وتسجيل كامل للتدقيق
- ✅ **سهل الاستخدام**: واجهة مستخدم بديهية ومكتبة JavaScript شاملة
- ✅ **عالي الأداء**: نظام caching ذكي
- ✅ **صلاحيات مؤقتة**: دعم تواريخ انتهاء للصلاحيات

### 📁 هيكل الملفات

```
adeeb-main/
├── supabase/migrations/
│   ├── 005_centralized_permissions_system.sql
│   ├── 006_seed_centralized_permissions.sql
│   ├── 007_assign_permissions_to_roles.sql
│   └── 008_permissions_rls_policies.sql
├── admin/js/
│   └── permissions-manager.js
└── PERMISSIONS_COMPLETE_GUIDE.md (هذا الملف)
```

---

## 🚀 البدء السريع

### 1. تطبيق Migrations

```bash
# تطبيق جميع ملفات migration بالترتيب
supabase db push
```

أو يدوياً:

```sql
\i supabase/migrations/005_centralized_permissions_system.sql
\i supabase/migrations/006_seed_centralized_permissions.sql
\i supabase/migrations/007_assign_permissions_to_roles.sql
\i supabase/migrations/008_permissions_rls_policies.sql
```

### 2. استخدام المكتبة في JavaScript

```javascript
// تضمين المكتبة
<script src="/admin/js/permissions-manager.js"></script>

// التهيئة
const permissionsManager = new AdeebPermissionsManager(sb);
await permissionsManager.initialize();

// التحقق من صلاحية
const canDelete = await permissionsManager.checkPermission('users.delete');

if (canDelete) {
    // المستخدم لديه صلاحية الحذف
}
```

### 3. استخدام data attributes في HTML

```html
<!-- سيتم إخفاء الزر إذا لم تكن الصلاحية متاحة -->
<button data-permission="users.delete" data-permission-action="hide">
    حذف المستخدم
</button>

<!-- تطبيق الصلاحيات على الصفحة -->
<script>
    await permissionsManager.applyPermissionsToPage();
</script>
```

---

## 🔑 الصلاحيات المتاحة

النظام يوفر أكثر من **89 صلاحية** موزعة على **10 أقسام**:

### 1. المستخدمين (Users) - 11 صلاحية

| المفتاح | الوصف |
|---------|-------|
| `users.view.all` | عرض جميع المستخدمين |
| `users.view.committee` | عرض مستخدمي اللجنة |
| `users.view.own` | عرض الملف الشخصي |
| `users.create` | إضافة مستخدمين |
| `users.update.all` | تعديل أي مستخدم |
| `users.update.committee` | تعديل مستخدمي اللجنة |
| `users.update.own` | تعديل الملف الشخصي |
| `users.delete` | حذف مستخدمين |
| `users.activate` | تفعيل/تعطيل الحسابات |
| `users.assign_roles` | تعيين الأدوار |
| `users.export` | تصدير بيانات المستخدمين |

### 2. اللجان (Committees) - 8 صلاحيات

| المفتاح | الوصف |
|---------|-------|
| `committees.view.all` | عرض جميع اللجان |
| `committees.view.own` | عرض اللجنة الخاصة |
| `committees.create` | إنشاء لجان |
| `committees.update.all` | تعديل أي لجنة |
| `committees.update.own` | تعديل اللجنة الخاصة |
| `committees.delete` | حذف لجان |
| `committees.manage_members` | إدارة أعضاء اللجنة |
| `committees.activate` | تفعيل/تعطيل اللجان |

### 3. المشاريع (Projects) - 9 صلاحيات

| المفتاح | الوصف |
|---------|-------|
| `projects.view.all` | عرض جميع المشاريع |
| `projects.view.committee` | عرض مشاريع اللجنة |
| `projects.view.own` | عرض المشاريع الخاصة |
| `projects.create` | إنشاء مشاريع |
| `projects.update.all` | تعديل أي مشروع |
| `projects.update.committee` | تعديل مشاريع اللجنة |
| `projects.update.own` | تعديل المشاريع الخاصة |
| `projects.delete` | حذف مشاريع |
| `projects.approve` | الموافقة على المشاريع |

### 4. المهام (Tasks) - 10 صلاحيات

| المفتاح | الوصف |
|---------|-------|
| `tasks.view.all` | عرض جميع المهام |
| `tasks.view.committee` | عرض مهام اللجنة |
| `tasks.view.assigned` | عرض المهام المسندة |
| `tasks.create` | إنشاء مهام |
| `tasks.assign` | تعيين مهام |
| `tasks.update.all` | تعديل أي مهمة |
| `tasks.update.committee` | تعديل مهام اللجنة |
| `tasks.update.assigned` | تعديل المهام المسندة |
| `tasks.delete` | حذف مهام |
| `tasks.comment` | التعليق على المهام |

### 5. الاجتماعات (Meetings) - 6 صلاحيات

| المفتاح | الوصف |
|---------|-------|
| `meetings.view.all` | عرض جميع الاجتماعات |
| `meetings.view.committee` | عرض اجتماعات اللجنة |
| `meetings.create` | إنشاء اجتماعات |
| `meetings.update` | تعديل اجتماعات |
| `meetings.delete` | حذف اجتماعات |
| `meetings.record_attendance` | تسجيل الحضور |

### 6. التقارير (Reports) - 6 صلاحيات

| المفتاح | الوصف |
|---------|-------|
| `reports.view.all` | عرض جميع التقارير |
| `reports.view.committee` | عرض تقارير اللجنة |
| `reports.view.own` | عرض التقارير الخاصة |
| `reports.generate` | إنشاء تقارير |
| `reports.export` | تصدير التقارير |
| `reports.delete` | حذف تقارير |

### 7. التقييمات (Evaluations) - 8 صلاحيات

| المفتاح | الوصف |
|---------|-------|
| `evaluations.view.all` | عرض جميع التقييمات |
| `evaluations.view.committee` | عرض تقييمات اللجنة |
| `evaluations.view.own` | عرض التقييمات الخاصة |
| `evaluations.create` | إنشاء تقييمات |
| `evaluations.update` | تعديل تقييمات |
| `evaluations.delete` | حذف تقييمات |
| `evaluations.approve` | الموافقة على التقييمات |

### 8. محتوى الموقع (Website) - 19 صلاحية

| المفتاح | الوصف |
|---------|-------|
| `website.works.view` | عرض الأعمال |
| `website.works.create` | إضافة عمل |
| `website.works.update` | تعديل الأعمال |
| `website.works.delete` | حذف الأعمال |
| `website.works.publish` | نشر الأعمال |
| `website.achievements.view` | عرض الإنجازات |
| `website.achievements.create` | إضافة إنجاز |
| `website.achievements.update` | تعديل الإنجازات |
| `website.achievements.delete` | حذف الإنجازات |
| `website.sponsors.view` | عرض الشركاء |
| `website.sponsors.create` | إضافة شريك |
| `website.sponsors.update` | تعديل الشركاء |
| `website.sponsors.delete` | حذف الشركاء |
| `website.faq.view` | عرض الأسئلة الشائعة |
| `website.faq.create` | إضافة سؤال |
| `website.faq.update` | تعديل الأسئلة |
| `website.faq.delete` | حذف الأسئلة |
| `website.manage` | إدارة محتوى الموقع |
| `website.settings` | إعدادات الموقع |

### 9. النظام (System) - 7 صلاحيات

| المفتاح | الوصف |
|---------|-------|
| `system.settings.view` | عرض إعدادات النظام |
| `system.settings.update` | تعديل إعدادات النظام |
| `system.logs.view` | عرض سجلات النظام |
| `system.permissions.view` | عرض الصلاحيات |
| `system.permissions.manage` | إدارة الصلاحيات |
| `system.backup` | النسخ الاحتياطي |
| `system.maintenance` | صيانة النظام |

### 10. الإشعارات (Notifications) - 5 صلاحيات

| المفتاح | الوصف |
|---------|-------|
| `notifications.view.own` | عرض الإشعارات الخاصة |
| `notifications.send.all` | إرسال إشعارات للجميع |
| `notifications.send.committee` | إرسال إشعارات للجنة |
| `notifications.manage` | إدارة الإشعارات |

---

## 💻 استخدام المكتبة في JavaScript

### التهيئة

```javascript
const permissionsManager = new AdeebPermissionsManager(supabaseClient);
await permissionsManager.initialize();
```

### التحقق من الصلاحيات

```javascript
// التحقق من صلاحية واحدة
const canViewUsers = await permissionsManager.checkPermission('users.view.all');

// التحقق مع نطاق محدد
const canEditOwnProfile = await permissionsManager.checkPermission('users.update.own', 'own');

// التحقق من أي صلاحية من قائمة
const canManageProjects = await permissionsManager.checkAnyPermission([
    'projects.create',
    'projects.update.all'
]);
```

### الحصول على الصلاحيات

```javascript
// الحصول على جميع صلاحيات المستخدم
const userPermissions = await permissionsManager.getUserPermissions();

// الحصول على صلاحيات حسب القسم
const tasksPermissions = await permissionsManager.getUserPermissionsByModule('tasks');

// الحصول على صلاحيات دور معين
const rolePermissions = await permissionsManager.getRolePermissions(roleId);
```

### إدارة الصلاحيات

```javascript
// منح صلاحية لدور
await permissionsManager.grantPermissionToRole(
    roleId,
    'users.view.all',
    'all'
);

// إلغاء صلاحية من دور
await permissionsManager.revokePermissionFromRole(
    roleId,
    'users.delete',
    'all'
);

// منح صلاحية خاصة لمستخدم
await permissionsManager.grantUserSpecificPermission(
    userId,
    'projects.approve',
    'committee',
    true, // منح
    '2026-12-31', // تاريخ الانتهاء
    'صلاحية مؤقتة للموافقة على المشاريع'
);

// حظر صلاحية لمستخدم
await permissionsManager.grantUserSpecificPermission(
    userId,
    'users.delete',
    'all',
    false // حظر
);
```

### التحكم في عناصر الصفحة

```javascript
// إخفاء/إظهار عنصر حسب الصلاحية
await permissionsManager.toggleElementByPermission(
    '#deleteButton',
    'users.delete'
);

// تطبيق الصلاحيات على جميع عناصر الصفحة
await permissionsManager.applyPermissionsToPage();
```

### استخدام data attributes في HTML

```html
<!-- إخفاء العنصر -->
<button data-permission="users.delete" data-permission-action="hide">
    حذف المستخدم
</button>

<!-- تعطيل العنصر -->
<button data-permission="projects.approve" data-permission-action="disable">
    الموافقة على المشروع
</button>

<!-- إزالة العنصر -->
<div data-permission="system.settings.update" data-permission-action="remove">
    إعدادات النظام
</div>

<!-- مع نطاق محدد -->
<button 
    data-permission="tasks.update.committee" 
    data-permission-scope="committee"
    data-permission-action="hide">
    تعديل المهمة
</button>
```

---

## 📚 توثيق API

### دوال قاعدة البيانات

#### `check_permission(user_id, permission_key, scope, context)`

التحقق من صلاحية معينة لمستخدم.

```sql
SELECT check_permission(
    'user-uuid-here',
    'users.view.all',
    'all',
    '{}'::JSONB
);
```

#### `get_user_all_permissions(user_id)`

الحصول على جميع صلاحيات المستخدم.

```sql
SELECT * FROM get_user_all_permissions('user-uuid-here');
```

#### `grant_permission_to_role(role_id, permission_key, scope, granted_by, conditions)`

منح صلاحية لدور معين.

```sql
SELECT grant_permission_to_role(
    7,
    'projects.create',
    'committee',
    'admin-uuid',
    '{}'::JSONB
);
```

#### `revoke_permission_from_role(role_id, permission_key, scope, revoked_by)`

إلغاء صلاحية من دور معين.

```sql
SELECT revoke_permission_from_role(
    7,
    'projects.delete',
    'all',
    'admin-uuid'
);
```

### JavaScript API

جميع الدوال المتاحة:

- `checkPermission(permissionKey, scope, context)` - التحقق من صلاحية
- `checkAnyPermission(permissionKeys, scope)` - التحقق من أي صلاحية
- `getUserPermissions()` - الحصول على صلاحيات المستخدم
- `getUserPermissionsByModule(module)` - صلاحيات قسم معين
- `getRolePermissions(roleId)` - صلاحيات دور معين
- `grantPermissionToRole(roleId, permissionKey, scope, conditions)` - منح صلاحية لدور
- `revokePermissionFromRole(roleId, permissionKey, scope)` - إلغاء صلاحية
- `grantUserSpecificPermission(userId, permissionKey, scope, isGranted, expiresAt, notes)` - صلاحية خاصة
- `getAllPermissions()` - جميع الصلاحيات المتاحة
- `getPermissionsByModule(module)` - صلاحيات قسم
- `getModules()` - قائمة الأقسام
- `getPermissionsAuditLog(filters)` - سجل التدقيق
- `toggleElementByPermission(selector, permissionKey, scope)` - التحكم في عناصر DOM
- `applyPermissionsToPage()` - تطبيق الصلاحيات على الصفحة
- `clearCache()` - مسح الكاش
- `logout()` - تسجيل الخروج

---

## 🎨 واجهة المستخدم

### الوصول

```
/admin/permissions/index.html
```

**المتطلبات:**
- تسجيل الدخول
- صلاحية `system.permissions.manage`

### الأقسام المتاحة

1. **نظرة عامة**: إحصائيات وملخص
2. **قائمة الصلاحيات**: عرض جميع الصلاحيات
3. **صلاحيات الأدوار**: ربط الصلاحيات بالأدوار
4. **صلاحيات المستخدمين**: إدارة الصلاحيات الخاصة
5. **سجل التدقيق**: عرض جميع التغييرات

---

## 🔒 الأمان

### Row Level Security (RLS)

جميع الجداول محمية بسياسات RLS:

- **permissions**: الجميع يمكنهم القراءة، فقط رئيس النادي يمكنه التعديل
- **role_permissions**: الجميع يمكنهم القراءة، فقط من لديه صلاحية إدارة الصلاحيات يمكنه التعديل
- **user_specific_permissions**: المستخدم يرى صلاحياته فقط، الإدارة ترى الكل
- **permissions_audit_log**: فقط من لديه صلاحية عرض السجلات

### أولوية الصلاحيات

1. **الصلاحيات الخاصة بالمستخدم** (أعلى أولوية)
2. **صلاحيات الدور**
3. **الرفض الافتراضي**

### سجل التدقيق

جميع التغييرات تُسجل تلقائياً:
- من قام بالتغيير
- نوع التغيير
- القيم القديمة والجديدة
- التاريخ والوقت

---

## 🆘 استكشاف الأخطاء

### المشكلة: الصلاحية لا تعمل

**الحل:**
1. تحقق من وجود الصلاحية في جدول `permissions`
2. تأكد من ربط الصلاحية بالدور
3. تحقق من أن المستخدم لديه الدور النشط
4. امسح الكاش: `permissionsManager.clearCache()`

### المشكلة: التغييرات لا تظهر فوراً

**الحل:**
```javascript
permissionsManager.clearCache();
await permissionsManager.loadUserPermissions();
```

### المشكلة: خطأ في الوصول للصفحة

**الحل:**
- تأكد من تسجيل الدخول
- تحقق من صلاحية `system.permissions.manage`
- راجع console للأخطاء

---

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل، تواصل مع فريق التطوير.

---

**تاريخ الإنشاء:** 2026-01-17  
**الإصدار:** 1.0.0  
**الحالة:** ✅ جاهز للاستخدام
