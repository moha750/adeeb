# ✅ تم إكمال المرحلة 2: تحديث قسم "الصلاحيات الإدارية"

## 📋 ما تم إنجازه

### 1. تحديث دالة `fetchAdmins()`
```javascript
// القديم: استدعاء API قديم
const data = await callFunction('list-admins', { method: 'GET' });

// الجديد: استعلام مباشر من Supabase
const { data: adminUsers } = await sb
  .from('admin_users')
  .select(`
    *,
    member:members(
      id,
      full_name,
      email,
      avatar_url,
      phone
    )
  `)
  .eq('is_active', true);
```

### 2. تحديث دالة `renderAdmins()`
- ✅ عرض البيانات في جدول واحد بسيط
- ✅ عرض الاسم، البريد، الدور، الحالة
- ✅ أزرار للتعديل والإزالة
- ✅ ألوان مميزة لكل دور:
  - 🟡 **مدير عام** (super_admin)
  - 🔵 **مدير** (admin)
  - 🟢 **مشرف** (moderator)

### 3. إضافة معالجات الأحداث
- ✅ زر "تعديل" - يفتح نافذة تعديل الصلاحيات (قيد التطوير)
- ✅ زر "إزالة الصلاحيات" - يحذف من جدول `admin_users`

---

## 🎨 الواجهة الجديدة

### قبل:
```
┌─────────────────────────────────────┐
│  إرسال دعوة عضو إداري جديد         │
│  [نموذج معقد...]                    │
├─────────────────────────────────────┤
│  المجلس الأعلى                     │
│  [جدول...]                          │
├─────────────────────────────────────┤
│  المجلس الإداري                    │
│  [جدول...]                          │
├─────────────────────────────────────┤
│  المجالس التنفيذية                 │
│  [جدول...]                          │
└─────────────────────────────────────┘
```

### بعد:
```
┌─────────────────────────────────────┐
│  💡 ملاحظة: لمنح صلاحيات إدارية    │
│  اذهب إلى تبويب أعضاء النادي       │
├─────────────────────────────────────┤
│  المستخدمون الإداريون              │
│  ┌───────────────────────────────┐  │
│  │ الاسم │ البريد │ الدور │ ... │  │
│  ├───────────────────────────────┤  │
│  │ محمد  │ m@...  │ 🟡 مدير عام│  │
│  │ أحمد  │ a@...  │ 🔵 مدير   │  │
│  │ سعد   │ s@...  │ 🟢 مشرف   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 🔄 سير العمل الجديد

### لمنح صلاحيات إدارية:
```
1. اذهب إلى "أعضاء النادي"
   ↓
2. ابحث عن العضو
   ↓
3. اضغط "إعدادات" ⚙️
   ↓
4. فعّل "منح صلاحيات إدارية"
   ↓
5. اختر الدور والصلاحيات
   ↓
6. احفظ
   ↓
7. يظهر في قسم "الصلاحيات الإدارية" ✅
```

### لإزالة الصلاحيات:
```
1. اذهب إلى "الصلاحيات الإدارية"
   ↓
2. اضغط زر "إزالة" 🗑️
   ↓
3. تأكيد
   ↓
4. تم الحذف من admin_users ✅
```

---

## 📊 الجداول المستخدمة

### قبل:
- `admins` (جدول واحد مختلط)

### بعد:
- `members` - جميع الأعضاء
- `admin_users` - الصلاحيات الإدارية فقط
- `board_positions` - المناصب في المجلس

---

## 🚀 الخطوات القادمة

### المرحلة 3: نافذة إعدادات العضو (أولوية عالية)

يجب إنشاء نافذة منبثقة تحتوي على:

#### HTML المطلوب:
```html
<dialog id="memberSettingsDialog">
  <div class="dialog-header">
    <h2>إعدادات العضو: [الاسم]</h2>
  </div>
  
  <div class="dialog-body">
    <!-- القسم 1: الصلاحيات الإدارية -->
    <div class="settings-section">
      <h3>الصلاحيات الإدارية</h3>
      <label>
        <input type="checkbox" id="grantAdminPermissions" />
        منح صلاحيات إدارية
      </label>
      
      <div id="adminPermissionsOptions" style="display:none">
        <select id="adminRole">
          <option value="super_admin">مدير عام</option>
          <option value="admin">مدير</option>
          <option value="moderator">مشرف</option>
        </select>
        
        <!-- الصلاحيات التفصيلية -->
        <div class="permissions-grid">
          <label><input type="checkbox" /> إدارة الأعمال</label>
          <label><input type="checkbox" /> إدارة الرعاة</label>
          <!-- ... إلخ -->
        </div>
      </div>
    </div>
    
    <!-- القسم 2: المجلس الإداري -->
    <div class="settings-section">
      <h3>المجلس الإداري</h3>
      <label>
        <input type="checkbox" id="addToBoardCouncil" />
        إضافة للمجلس الإداري
      </label>
      
      <div id="boardPositionOptions" style="display:none">
        <select id="boardCouncil">
          <option>المجلس الحالي 2024</option>
        </select>
        
        <select id="boardPosition">
          <option value="president">الرئيس</option>
          <option value="vice_president">نائب الرئيس</option>
          <option value="leader">القائد</option>
          <!-- ... إلخ -->
        </select>
        
        <input type="number" id="positionRank" placeholder="الترتيب" />
      </div>
    </div>
  </div>
  
  <div class="dialog-footer">
    <button class="btn btn-outline">إلغاء</button>
    <button class="btn btn-primary">حفظ التغييرات</button>
  </div>
</dialog>
```

#### JavaScript المطلوب:
```javascript
async function openMemberSettings(idx) {
  const m = members?.[idx];
  if (!m) return;
  
  // 1. جلب البيانات الحالية
  const { data: adminUser } = await sb
    .from('admin_users')
    .select('*')
    .eq('member_id', m.id)
    .single();
  
  const { data: boardPosition } = await sb
    .from('board_positions')
    .select('*, council:board_councils(*)')
    .eq('member_id', m.id)
    .eq('council.is_current', true)
    .single();
  
  // 2. ملء النموذج
  if (adminUser) {
    document.getElementById('grantAdminPermissions').checked = true;
    document.getElementById('adminRole').value = adminUser.role;
    // ... ملء الصلاحيات
  }
  
  if (boardPosition) {
    document.getElementById('addToBoardCouncil').checked = true;
    // ... ملء بيانات المنصب
  }
  
  // 3. عرض النافذة
  memberSettingsDialog.showModal();
}

// عند الحفظ
async function saveMemberSettings(memberId) {
  const grantAdmin = document.getElementById('grantAdminPermissions').checked;
  const addToBoard = document.getElementById('addToBoardCouncil').checked;
  
  // حفظ الصلاحيات الإدارية
  if (grantAdmin) {
    const role = document.getElementById('adminRole').value;
    const permissions = getSelectedPermissions();
    
    await sb.from('admin_users').upsert({
      member_id: memberId,
      user_id: member.user_id,
      role: role,
      permissions: permissions,
      is_active: true
    });
  } else {
    // إزالة الصلاحيات
    await sb.from('admin_users')
      .delete()
      .eq('member_id', memberId);
  }
  
  // حفظ المنصب في المجلس
  if (addToBoard) {
    const councilId = getCurrentCouncilId();
    const positionType = document.getElementById('boardPosition').value;
    const rank = document.getElementById('positionRank').value;
    
    await sb.from('board_positions').upsert({
      council_id: councilId,
      member_id: memberId,
      position_type: positionType,
      position_rank: rank,
      // ... باقي البيانات
    });
  } else {
    // إزالة من المجلس
    const councilId = getCurrentCouncilId();
    await sb.from('board_positions')
      .delete()
      .eq('member_id', memberId)
      .eq('council_id', councilId);
  }
}
```

---

## ✅ الملخص

### تم إنجازه:
- ✅ قاعدة البيانات الجديدة
- ✅ ترحيل البيانات
- ✅ تحديث قسم "الصلاحيات الإدارية"
- ✅ إضافة زر "إعدادات" في قسم الأعضاء

### قيد التطوير:
- ⏳ نافذة إعدادات العضو
- ⏳ دوال منح/إزالة الصلاحيات
- ⏳ دوال إضافة/إزالة من المجلس

### لم يبدأ:
- ❌ قسم "المجلس الإداري" المنفصل
- ❌ صفحة عرض المجلس للزوار

---

**الحالة الحالية: 70% مكتمل** 🎉

**الخطوة التالية: إنشاء نافذة إعدادات العضو**
