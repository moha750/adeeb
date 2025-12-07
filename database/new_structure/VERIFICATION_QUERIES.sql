-- =====================================================
-- استعلامات التحقق من نجاح الترحيل
-- =====================================================
-- استخدم هذه الاستعلامات للتحقق من البيانات المرحّلة
-- =====================================================

-- =====================================================
-- 1. التحقق من المستخدمين الإداريين
-- =====================================================

-- عرض جميع المستخدمين الإداريين
SELECT 
    au.id,
    au.role,
    m.full_name,
    m.email,
    au.is_active,
    au.created_at
FROM admin_users au
JOIN members m ON au.member_id = m.id
ORDER BY 
    CASE au.role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'moderator' THEN 3
    END;

-- =====================================================
-- 2. التحقق من المجلس الحالي
-- =====================================================

-- عرض المجلس الحالي
SELECT * 
FROM board_councils 
WHERE is_current = true;

-- عرض المجلس مع عدد الأعضاء
SELECT * 
FROM board_councils_with_stats 
WHERE is_current = true;

-- =====================================================
-- 3. التحقق من أعضاء المجلس
-- =====================================================

-- عرض أعضاء المجلس الحالي (مفصّل)
SELECT * 
FROM board_positions_detailed
WHERE council_is_current = true
ORDER BY position_rank;

-- أو استخدام الدالة
SELECT * 
FROM get_current_board_members()
ORDER BY position_rank;

-- =====================================================
-- 4. التحقق من المناصب حسب النوع
-- =====================================================

-- عد المناصب حسب النوع
SELECT 
    position_type,
    COUNT(*) as count
FROM board_positions bp
JOIN board_councils bc ON bp.council_id = bc.id
WHERE bc.is_current = true
GROUP BY position_type
ORDER BY count DESC;

-- =====================================================
-- 5. التحقق من الأعضاء الذين لديهم صلاحيات إدارية ومناصب
-- =====================================================

-- الأعضاء الذين لديهم صلاحيات إدارية ومناصب في المجلس
SELECT 
    m.full_name,
    m.email,
    au.role as admin_role,
    bp.position_title_ar as board_position
FROM members m
LEFT JOIN admin_users au ON m.id = au.member_id
LEFT JOIN board_positions bp ON m.id = bp.member_id
WHERE au.id IS NOT NULL OR bp.id IS NOT NULL
ORDER BY au.role, bp.position_rank;

-- =====================================================
-- 6. مقارنة البيانات القديمة والجديدة
-- =====================================================

-- إذا كان جدول admins القديم لا زال موجوداً
-- يمكنك مقارنة عدد السجلات

-- عدد السجلات في الجدول القديم
-- SELECT COUNT(*) as old_count FROM admins;

-- عدد السجلات في الجداول الجديدة
SELECT 
    (SELECT COUNT(*) FROM admin_users) as admin_users_count,
    (SELECT COUNT(*) FROM board_positions) as board_positions_count,
    (SELECT COUNT(*) FROM board_councils) as board_councils_count;

-- =====================================================
-- 7. التحقق من الأعضاء الذين تم إنشاؤهم تلقائياً
-- =====================================================

-- الأعضاء الذين تم إنشاؤهم من جدول admins
SELECT 
    m.id,
    m.full_name,
    m.email,
    m.account_status,
    m.created_at,
    au.role as admin_role
FROM members m
JOIN admin_users au ON m.id = au.member_id
WHERE au.notes = 'Migrated from old admins table'
ORDER BY m.created_at DESC;
