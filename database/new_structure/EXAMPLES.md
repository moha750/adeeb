# أمثلة عملية للاستخدام

## 📚 فهرس الأمثلة

1. [إدارة المستخدمين الإداريين](#1-إدارة-المستخدمين-الإداريين)
2. [إدارة المجالس الإدارية](#2-إدارة-المجالس-الإدارية)
3. [إدارة مناصب المجلس](#3-إدارة-مناصب-المجلس)
4. [الاستعلامات الشائعة](#4-الاستعلامات-الشائعة)
5. [أمثلة من الواجهة الأمامية](#5-أمثلة-من-الواجهة-الأمامية)

---

## 1. إدارة المستخدمين الإداريين

### إضافة مستخدم إداري جديد

```sql
-- 1. تأكد من وجود العضو في جدول members
INSERT INTO members (full_name, email, phone)
VALUES ('أحمد محمد', 'ahmed@example.com', '0501234567')
RETURNING id;

-- 2. أضف المستخدم كإداري
INSERT INTO admin_users (
    member_id,
    user_id,
    role
)
VALUES (
    'member_uuid_here',
    'auth_user_uuid_here',
    'admin'  -- أو 'super_admin' أو 'moderator'
);
-- الصلاحيات ستُعيّن تلقائياً حسب الدور
```

### تحديث صلاحيات مستخدم إداري

```sql
-- تحديث الدور (سيتم تحديث الصلاحيات تلقائياً)
UPDATE admin_users
SET role = 'super_admin'
WHERE member_id = 'member_uuid';

-- أو تخصيص الصلاحيات يدوياً
UPDATE admin_users
SET permissions = '{
    "dashboard": true,
    "members": {"read": true, "create": true, "update": true, "delete": false},
    "board": {"read": true, "create": true, "update": true, "delete": true},
    "news": {"read": true, "create": true, "update": true, "delete": false}
}'::jsonb
WHERE member_id = 'member_uuid';
```

### تعطيل/تفعيل مستخدم إداري

```sql
-- تعطيل
UPDATE admin_users
SET is_active = false
WHERE member_id = 'member_uuid';

-- تفعيل
UPDATE admin_users
SET is_active = true
WHERE member_id = 'member_uuid';
```

### التحقق من صلاحية مستخدم

```sql
-- التحقق من صلاحية معينة
SELECT check_admin_permission(
    'user_uuid',
    'members',
    'create'
);
-- النتيجة: true أو false

-- الحصول على جميع صلاحيات مستخدم
SELECT permissions
FROM admin_users
WHERE user_id = 'user_uuid';
```

---

## 2. إدارة المجالس الإدارية

### إنشاء مجلس إداري جديد

```sql
-- إنشاء مجلس جديد (غير حالي)
INSERT INTO board_councils (
    title,
    title_ar,
    description,
    description_ar,
    start_date,
    is_current,
    is_active,
    is_visible
)
VALUES (
    'Board Council 2025',
    'المجلس الإداري 2025',
    'The board council for the year 2025',
    'المجلس الإداري لعام 2025',
    '2025-01-01',
    false,  -- سيتم تفعيله لاحقاً
    true,
    true
);
```

### تفعيل مجلس جديد وإنهاء المجلس الحالي

```sql
-- طريقة 1: استخدام الدالة المساعدة (موصى بها)
SELECT transition_to_new_council(
    'new_council_uuid',
    true  -- إنهاء المجلس الحالي
);

-- طريقة 2: يدوياً
BEGIN;

-- إنهاء المجلس الحالي
UPDATE board_councils
SET 
    is_current = false,
    end_date = CURRENT_DATE
WHERE is_current = true;

-- تفعيل المجلس الجديد
UPDATE board_councils
SET is_current = true
WHERE id = 'new_council_uuid';

COMMIT;
```

### الحصول على المجلس الحالي

```sql
-- طريقة 1: استخدام الدالة
SELECT get_current_council();

-- طريقة 2: استعلام مباشر
SELECT *
FROM board_councils
WHERE is_current = true AND is_active = true
LIMIT 1;
```

### عرض جميع المجالس مع الإحصائيات

```sql
SELECT 
    id,
    title_ar,
    start_date,
    end_date,
    is_current,
    members_count,
    visible_members_count
FROM board_councils_with_stats
WHERE is_visible = true
ORDER BY start_date DESC;
```

---

## 3. إدارة مناصب المجلس

### إضافة عضو للمجلس الحالي

```sql
-- إضافة رئيس
INSERT INTO board_positions (
    council_id,
    member_id,
    position_type
)
VALUES (
    (SELECT get_current_council()),
    'member_uuid',
    'president'
);
-- العنوان والترتيب سيُعيّنان تلقائياً

-- إضافة نائب الرئيس مع تخصيص
INSERT INTO board_positions (
    council_id,
    member_id,
    position_type,
    position_title_ar,
    bio_ar,
    custom_avatar_url
)
VALUES (
    (SELECT get_current_council()),
    'member_uuid',
    'vice_president',
    'نائب الرئيس للشؤون الأكاديمية',
    'نبذة عن النائب...',
    'https://example.com/avatar.jpg'
);
```

### إضافة قائد لجنة

```sql
INSERT INTO board_positions (
    council_id,
    member_id,
    position_type,
    department,
    department_ar,
    bio_ar
)
VALUES (
    (SELECT get_current_council()),
    'member_uuid',
    'leader',
    'Media Committee',
    'لجنة الإعلام',
    'قائد لجنة الإعلام المسؤول عن...'
);
```

### تحديث معلومات منصب

```sql
-- تحديث النبذة والصورة
UPDATE board_positions
SET 
    bio_ar = 'نبذة محدثة عن العضو...',
    custom_avatar_url = 'https://example.com/new-avatar.jpg',
    social_links = '{
        "twitter": "@username",
        "instagram": "@username",
        "linkedin": "username"
    }'::jsonb
WHERE id = 'position_uuid';

-- تحديث ترتيب العرض
UPDATE board_positions
SET display_order = 1
WHERE id = 'position_uuid';
```

### حذف عضو من المجلس

```sql
DELETE FROM board_positions
WHERE id = 'position_uuid';

-- أو إخفاؤه فقط
UPDATE board_positions
SET is_visible = false
WHERE id = 'position_uuid';
```

---

## 4. الاستعلامات الشائعة

### عرض أعضاء المجلس الحالي

```sql
-- طريقة 1: استخدام الدالة (موصى بها)
SELECT * FROM get_current_board_members();

-- طريقة 2: استخدام الـ View
SELECT 
    member_name,
    position_title_ar,
    position_rank,
    department_ar,
    display_avatar,
    bio_ar
FROM board_positions_detailed
WHERE is_current_council = true
AND is_visible = true
ORDER BY position_rank, display_order;
```

### البحث عن منصب عضو معين

```sql
-- في المجلس الحالي
SELECT * FROM get_member_current_position('member_uuid');

-- في جميع المجالس
SELECT 
    council_title_ar,
    position_title_ar,
    council_start_date,
    council_end_date
FROM board_positions_detailed
WHERE member_id = 'member_uuid'
ORDER BY council_start_date DESC;
```

### عرض أعضاء لجنة معينة

```sql
SELECT 
    member_name,
    position_title_ar,
    bio_ar,
    display_avatar
FROM board_positions_detailed
WHERE is_current_council = true
AND department_ar = 'لجنة الإعلام'
AND is_visible = true
ORDER BY position_rank;
```

### إحصائيات المجالس

```sql
-- عدد الأعضاء في كل مجلس
SELECT 
    title_ar,
    start_date,
    end_date,
    members_count,
    visible_members_count
FROM board_councils_with_stats
ORDER BY start_date DESC;

-- توزيع المناصب في المجلس الحالي
SELECT 
    position_type,
    position_title_ar,
    COUNT(*) as count
FROM board_positions
WHERE council_id = (SELECT get_current_council())
GROUP BY position_type, position_title_ar
ORDER BY MIN(position_rank);
```

---

## 5. أمثلة من الواجهة الأمامية

### React/Next.js + Supabase

#### عرض أعضاء المجلس الحالي

```javascript
// components/BoardMembers.jsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BoardMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBoardMembers() {
      const { data, error } = await supabase
        .rpc('get_current_board_members');
      
      if (error) {
        console.error('Error:', error);
      } else {
        setMembers(data);
      }
      setLoading(false);
    }

    fetchBoardMembers();
  }, []);

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {members.map((member) => (
        <div key={member.position_id} className="card">
          <img 
            src={member.avatar_url} 
            alt={member.member_name}
            className="w-32 h-32 rounded-full mx-auto"
          />
          <h3 className="text-xl font-bold mt-4">
            {member.member_name}
          </h3>
          <p className="text-gray-600">
            {member.position_title_ar}
          </p>
        </div>
      ))}
    </div>
  );
}
```

#### التحقق من صلاحيات المستخدم

```javascript
// hooks/useAdminPermission.js
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useAdminPermission(resource, action) {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .rpc('check_admin_permission', {
          p_user_id: user.id,
          p_resource: resource,
          p_action: action
        });
      
      if (error) {
        console.error('Error:', error);
        setHasPermission(false);
      } else {
        setHasPermission(data);
      }
      setLoading(false);
    }

    checkPermission();
  }, [resource, action]);

  return { hasPermission, loading };
}

// استخدام الـ Hook
function MembersPage() {
  const { hasPermission, loading } = useAdminPermission('members', 'create');

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div>
      {hasPermission && (
        <button onClick={handleAddMember}>
          إضافة عضو جديد
        </button>
      )}
      {/* باقي المحتوى */}
    </div>
  );
}
```

#### إدارة المجالس الإدارية

```javascript
// pages/admin/councils.jsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CouncilsPage() {
  const [councils, setCouncils] = useState([]);

  useEffect(() => {
    fetchCouncils();
  }, []);

  async function fetchCouncils() {
    const { data, error } = await supabase
      .from('board_councils_with_stats')
      .select('*')
      .order('start_date', { ascending: false });
    
    if (!error) setCouncils(data);
  }

  async function createNewCouncil(councilData) {
    const { data, error } = await supabase
      .from('board_councils')
      .insert([councilData])
      .select();
    
    if (!error) {
      await fetchCouncils();
      alert('تم إنشاء المجلس بنجاح');
    }
  }

  async function activateCouncil(councilId) {
    const { error } = await supabase
      .rpc('transition_to_new_council', {
        p_new_council_id: councilId,
        p_end_current_council: true
      });
    
    if (!error) {
      await fetchCouncils();
      alert('تم تفعيل المجلس بنجاح');
    }
  }

  return (
    <div>
      <h1>إدارة المجالس الإدارية</h1>
      
      <div className="councils-list">
        {councils.map((council) => (
          <div key={council.id} className="council-card">
            <h3>{council.title_ar}</h3>
            <p>عدد الأعضاء: {council.members_count}</p>
            <p>الفترة: {council.start_date} - {council.end_date || 'مستمر'}</p>
            
            {council.is_current ? (
              <span className="badge">المجلس الحالي</span>
            ) : (
              <button onClick={() => activateCouncil(council.id)}>
                تفعيل
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### إضافة عضو لمنصب في المجلس

```javascript
// components/AddBoardPosition.jsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddBoardPosition() {
  const [formData, setFormData] = useState({
    member_id: '',
    position_type: 'president',
    bio_ar: '',
    department_ar: ''
  });

  async function handleSubmit(e) {
    e.preventDefault();
    
    // الحصول على المجلس الحالي
    const { data: councilId } = await supabase
      .rpc('get_current_council');
    
    // إضافة المنصب
    const { error } = await supabase
      .from('board_positions')
      .insert([{
        council_id: councilId,
        ...formData
      }]);
    
    if (!error) {
      alert('تم إضافة العضو بنجاح');
      setFormData({
        member_id: '',
        position_type: 'president',
        bio_ar: '',
        department_ar: ''
      });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <select 
        value={formData.position_type}
        onChange={(e) => setFormData({...formData, position_type: e.target.value})}
      >
        <option value="president">الرئيس</option>
        <option value="vice_president">نائب الرئيس</option>
        <option value="ceo">الرئيس التنفيذي</option>
        <option value="leader">القائد</option>
        <option value="vice_leader">نائب القائد</option>
        <option value="secretary">الأمين العام</option>
        <option value="treasurer">أمين الصندوق</option>
        <option value="member">عضو مجلس</option>
      </select>
      
      <textarea
        placeholder="نبذة عن العضو"
        value={formData.bio_ar}
        onChange={(e) => setFormData({...formData, bio_ar: e.target.value})}
      />
      
      <input
        type="text"
        placeholder="القسم/اللجنة (اختياري)"
        value={formData.department_ar}
        onChange={(e) => setFormData({...formData, department_ar: e.target.value})}
      />
      
      <button type="submit">إضافة</button>
    </form>
  );
}
```

---

## 📝 ملاحظات مهمة

1. **استخدم الدوال المساعدة**: الدوال مثل `get_current_board_members()` و `check_admin_permission()` تسهل العمل كثيراً

2. **استخدم الـ Views**: الـ Views مثل `board_positions_detailed` توفر بيانات منظمة وجاهزة

3. **التحقق من الصلاحيات**: دائماً تحقق من صلاحيات المستخدم قبل السماح بالعمليات الحساسة

4. **معالجة الأخطاء**: تأكد من معالجة الأخطاء بشكل صحيح في جميع الاستعلامات

5. **الأداء**: استخدم الفهارس والـ Views لتحسين الأداء

---

**آخر تحديث**: نوفمبر 2024
