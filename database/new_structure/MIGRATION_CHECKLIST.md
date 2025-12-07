# ✅ قائمة المهام بعد الترحيل

## 1. التحقق من البيانات ✓

- [ ] تشغيل استعلامات التحقق من ملف `VERIFICATION_QUERIES.sql`
- [ ] التأكد من وجود جميع المستخدمين الإداريين في `admin_users`
- [ ] التأكد من وجود المجلس الحالي في `board_councils`
- [ ] التأكد من وجود جميع المناصب في `board_positions`
- [ ] مراجعة الأعضاء الذين تم إنشاؤهم تلقائياً في `members`

## 2. تحديث الكود (Backend)

### أ. تحديث استعلامات قاعدة البيانات

#### قبل (الجدول القديم):
```typescript
// ❌ القديم - استعلام من جدول admins
const { data: admins } = await supabase
  .from('admins')
  .select('*')
  .eq('is_admin', true);
```

#### بعد (الجداول الجديدة):
```typescript
// ✅ الجديد - استعلام المستخدمين الإداريين
const { data: adminUsers } = await supabase
  .from('admin_users')
  .select(`
    *,
    member:members(*)
  `)
  .eq('is_active', true);

// ✅ الجديد - استعلام أعضاء المجلس
const { data: boardMembers } = await supabase
  .from('board_positions_detailed')
  .select('*')
  .eq('council_is_current', true)
  .order('position_rank');
```

### ب. الملفات التي تحتاج تحديث

- [ ] **صفحات الإدارة (Admin Pages)**
  - `pages/admin/users.tsx` أو `app/admin/users/page.tsx`
  - `pages/admin/board.tsx` أو `app/admin/board/page.tsx`

- [ ] **API Routes**
  - `api/admin/users.ts` - تحديث استعلامات المستخدمين الإداريين
  - `api/board/members.ts` - تحديث استعلامات أعضاء المجلس

- [ ] **Components**
  - `components/admin/UsersList.tsx` - قائمة المستخدمين الإداريين
  - `components/board/BoardMembers.tsx` - عرض أعضاء المجلس

- [ ] **Types/Interfaces**
  - تحديث الـ Types لتتوافق مع الجداول الجديدة

### ج. أمثلة على التحديثات المطلوبة

#### 1. تحديث Types

```typescript
// types/admin.ts

// ❌ القديم
export interface Admin {
  id: string;
  user_id: string;
  admin_level: number;
  admin_type: string;
  position: string;
  is_admin: boolean;
  permissions: any;
}

// ✅ الجديد
export interface AdminUser {
  id: string;
  member_id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member?: Member;
}

export interface BoardPosition {
  id: string;
  council_id: string;
  member_id: string;
  position_type: 'president' | 'vice_president' | 'leader' | 'vice_leader' | 'ceo' | 'secretary' | 'treasurer' | 'member';
  position_title: string;
  position_title_ar: string;
  position_rank: number;
  bio?: string;
  bio_ar?: string;
  is_visible: boolean;
  member?: Member;
}
```

#### 2. تحديث API Calls

```typescript
// lib/api/admin.ts

// ❌ القديم
export async function getAdmins() {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('is_admin', true);
  
  return { data, error };
}

// ✅ الجديد
export async function getAdminUsers() {
  const { data, error } = await supabase
    .from('admin_users')
    .select(`
      *,
      member:members(
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  return { data, error };
}

export async function getCurrentBoardMembers() {
  const { data, error } = await supabase
    .rpc('get_current_board_members');
  
  return { data, error };
}
```

#### 3. تحديث Components

```typescript
// components/admin/AdminUsersList.tsx

// ❌ القديم
const AdminsList = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  
  useEffect(() => {
    loadAdmins();
  }, []);
  
  const loadAdmins = async () => {
    const { data } = await supabase
      .from('admins')
      .select('*');
    setAdmins(data || []);
  };
  
  return (
    <div>
      {admins.map(admin => (
        <div key={admin.id}>
          {admin.position} - Level {admin.admin_level}
        </div>
      ))}
    </div>
  );
};

// ✅ الجديد
const AdminUsersList = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  
  useEffect(() => {
    loadAdminUsers();
  }, []);
  
  const loadAdminUsers = async () => {
    const { data } = await supabase
      .from('admin_users')
      .select(`
        *,
        member:members(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('is_active', true);
    setAdminUsers(data || []);
  };
  
  return (
    <div>
      {adminUsers.map(admin => (
        <div key={admin.id}>
          {admin.member?.full_name} - {admin.role}
        </div>
      ))}
    </div>
  );
};
```

## 3. تحديث RLS Policies

- [ ] التأكد من أن المستخدمين الإداريين يمكنهم الوصول للبيانات
- [ ] اختبار الصلاحيات للأدوار المختلفة (super_admin, admin, moderator)

## 4. اختبار التطبيق

### الصفحات التي يجب اختبارها:

- [ ] **صفحة إدارة المستخدمين الإداريين**
  - عرض قائمة المستخدمين الإداريين
  - إضافة مستخدم إداري جديد
  - تعديل صلاحيات مستخدم
  - حذف/تعطيل مستخدم إداري

- [ ] **صفحة إدارة المجلس الإداري**
  - عرض أعضاء المجلس الحالي
  - إضافة عضو جديد للمجلس
  - تعديل منصب عضو
  - إزالة عضو من المجلس

- [ ] **الصفحة العامة لعرض المجلس**
  - عرض أعضاء المجلس للزوار
  - التأكد من ظهور المناصب بالترتيب الصحيح

## 5. تنظيف قاعدة البيانات (اختياري)

بعد التأكد من أن كل شيء يعمل بشكل صحيح:

```sql
-- حذف الجدول القديم (فقط بعد التأكد!)
-- DROP TABLE admins_old_backup;
```

## 6. توثيق التغييرات

- [ ] تحديث ملف README للمشروع
- [ ] توثيق الجداول الجديدة
- [ ] إضافة أمثلة على الاستخدام للمطورين الآخرين

## 7. النشر (Deployment)

- [ ] اختبار التطبيق في بيئة التطوير
- [ ] اختبار التطبيق في بيئة الـ Staging (إن وجدت)
- [ ] نشر التحديثات على الـ Production

---

## 📝 ملاحظات مهمة

### الفروقات الرئيسية:

| القديم | الجديد |
|--------|--------|
| `admins` | `admin_users` + `board_positions` |
| `admin_level` (1-5) | `role` (super_admin, admin, moderator) |
| `admin_type` | `position_type` |
| `is_admin` | `is_active` |
| عمود واحد للمنصب والصلاحيات | فصل واضح بين الصلاحيات والمناصب |

### الفوائد:

✅ **فصل واضح** بين صلاحيات النظام ومناصب المجلس  
✅ **مرونة أكبر** في إدارة المجالس المتعددة  
✅ **تتبع تاريخي** للمجالس السابقة  
✅ **RLS محسّن** لأمان أفضل  
✅ **Views وFunctions** لاستعلامات أسهل  

---

## 🆘 في حالة وجود مشاكل

إذا واجهت أي مشاكل:

1. راجع ملف `VERIFICATION_QUERIES.sql` للتحقق من البيانات
2. راجع ملف `EXAMPLES.md` لأمثلة على الاستخدام
3. راجع ملف `COMPARISON.md` لفهم الفروقات
4. يمكنك الرجوع للجدول القديم إذا كنت قد احتفظت به
