-- =====================================================
-- ترحيل البيانات من الهيكل القديم إلى الجديد
-- =====================================================
-- هذا الملف يقوم بترحيل البيانات من جدول admins القديم
-- إلى الهيكلة الجديدة (admin_users + board_councils + board_positions)
-- =====================================================

-- ⚠️ تحذير: قم بعمل نسخة احتياطية قبل تشغيل هذا الملف!

BEGIN;

-- =====================================================
-- الخطوة 1: إنشاء مجلس إداري افتراضي
-- =====================================================

DO $$
DECLARE
    v_default_council_id UUID;
BEGIN
    -- التحقق من وجود مجلس حالي
    SELECT id INTO v_default_council_id
    FROM public.board_councils
    WHERE is_current = true
    LIMIT 1;
    
    -- إذا لم يكن هناك مجلس حالي، أنشئ واحداً
    IF v_default_council_id IS NULL THEN
        INSERT INTO public.board_councils (
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
            'Board Council 2024',
            'المجلس الإداري 2024',
            'Current board council',
            'المجلس الإداري الحالي',
            CURRENT_DATE,
            true,
            true,
            true
        )
        RETURNING id INTO v_default_council_id;
        
        RAISE NOTICE 'تم إنشاء مجلس إداري افتراضي: %', v_default_council_id;
    ELSE
        RAISE NOTICE 'يوجد مجلس إداري حالي: %', v_default_council_id;
    END IF;
END $$;

-- =====================================================
-- الخطوة 2: إنشاء سجلات في members للمستخدمين الإداريين
-- =====================================================

DO $$
DECLARE
    v_count INTEGER;
    v_table_exists INTEGER;
BEGIN
    -- التحقق من وجود جدول admins
    SELECT COUNT(*) INTO v_table_exists
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admins';
    
    IF v_table_exists = 0 THEN
        RAISE NOTICE 'جدول admins غير موجود - تخطي إنشاء الأعضاء';
        RETURN;
    END IF;
    
    -- إنشاء سجلات في members للمستخدمين الإداريين الذين ليسوا أعضاء
    INSERT INTO public.members (
        id,
        user_id,
        full_name,
        email,
        phone,
        account_status,
        created_at
    )
    SELECT 
        COALESCE(a.member_id, a.user_id) as id,
        a.user_id,
        COALESCE(a.full_name, au.email, 'Admin User') as full_name,
        COALESCE(a.email, au.email) as email,
        a.phone,
        'active' as account_status,
        COALESCE(a.created_at, NOW()) as created_at
    FROM public.admins a
    LEFT JOIN auth.users au ON a.user_id = au.id
    WHERE a.user_id IS NOT NULL
    -- فقط الذين غير موجودين في members
    AND NOT EXISTS (
        SELECT 1 FROM public.members m 
        WHERE m.id = COALESCE(a.member_id, a.user_id)
    )
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'تم إنشاء % سجل في members للمستخدمين الإداريين', v_count;
END $$;

-- =====================================================
-- الخطوة 3: ترحيل المستخدمين الإداريين
-- =====================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- التحقق من وجود جدول admins
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admins';
    
    IF v_count = 0 THEN
        RAISE NOTICE 'جدول admins غير موجود - تخطي الترحيل';
        RETURN;
    END IF;
    
    -- ترحيل البيانات من جدول admins إلى admin_users
    -- الآن جميع المستخدمين موجودون في members (تم إنشاؤهم في الخطوة السابقة)
    INSERT INTO public.admin_users (
        member_id,
        user_id,
        role,
        permissions,
        is_active,
        created_at,
        notes
    )
    SELECT 
        COALESCE(a.member_id, a.user_id) as member_id,
        a.user_id,
        -- تحويل admin_level إلى role
        CASE 
            WHEN COALESCE(a.admin_level, 4) = 1 THEN 'super_admin'  -- رئيس النادي
            WHEN COALESCE(a.admin_level, 4) = 2 THEN 'admin'        -- نائب الرئيس
            WHEN COALESCE(a.admin_level, 4) = 5 THEN 'admin'        -- رئيس تنفيذي
            ELSE 'moderator'                                        -- الباقي
        END as role,
        -- نقل الصلاحيات كما هي
        COALESCE(a.permissions, '{}'::jsonb) as permissions,
        COALESCE(a.is_admin, true) as is_active,
        COALESCE(a.created_at, NOW()) as created_at,
        'Migrated from old admins table' as notes
    FROM public.admins a
    WHERE a.user_id IS NOT NULL
    ON CONFLICT (user_id) DO NOTHING;  -- تجنب التكرار
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'تم ترحيل % مستخدم إداري إلى admin_users', v_count;
END $$;

-- =====================================================
-- الخطوة 4: ترحيل مناصب المجلس
-- =====================================================

DO $$
DECLARE
    v_count INTEGER;
    v_council_id UUID;
BEGIN
    -- التحقق من وجود جدول admins
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admins';
    
    IF v_count = 0 THEN
        RAISE NOTICE 'جدول admins غير موجود - تخطي الترحيل';
        RETURN;
    END IF;
    
    -- الحصول على المجلس الحالي
    SELECT id INTO v_council_id
    FROM public.board_councils
    WHERE is_current = true
    LIMIT 1;
    
    IF v_council_id IS NULL THEN
        RAISE WARNING 'لا يوجد مجلس حالي - تخطي ترحيل المناصب';
        RETURN;
    END IF;
    
    -- ترحيل البيانات من جدول admins إلى board_positions
    -- الآن جميع الأعضاء موجودون في members (تم إنشاؤهم في الخطوة 2)
    INSERT INTO public.board_positions (
        council_id,
        member_id,
        position_type,
        position_title,
        position_title_ar,
        position_rank,
        bio,
        bio_ar,
        is_visible,
        created_at
    )
    SELECT 
        v_council_id as council_id,
        COALESCE(a.member_id, a.user_id) as member_id,
        -- تحويل admin_type إلى position_type
        CASE COALESCE(a.admin_type, 'member')
            WHEN 'president' THEN 'president'
            WHEN 'vice' THEN 'vice_president'
            WHEN 'executive_president' THEN 'ceo'
            WHEN 'committee_leader' THEN 'leader'
            ELSE 'member'
        END as position_type,
        -- استخدام المسمى الوظيفي الموجود أو الافتراضي
        COALESCE(a.position, 'Board Member') as position_title,
        COALESCE(a.position, 'عضو مجلس') as position_title_ar,
        -- استخدام admin_level كترتيب
        COALESCE(a.admin_level, 99) as position_rank,
        a.bio,
        a.bio_ar,
        COALESCE(a.is_admin, true) as is_visible,
        COALESCE(a.created_at, NOW()) as created_at
    FROM public.admins a
    WHERE a.user_id IS NOT NULL
    ON CONFLICT (council_id, member_id) DO NOTHING;  -- تجنب التكرار
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'تم ترحيل % منصب في المجلس', v_count;
END $$;

-- =====================================================
-- الخطوة 5: التحقق من نجاح الترحيل
-- =====================================================

DO $$
DECLARE
    v_old_count INTEGER := 0;
    v_admin_users_count INTEGER;
    v_positions_count INTEGER;
    v_table_exists INTEGER;
BEGIN
    -- التحقق من وجود جدول admins
    SELECT COUNT(*) INTO v_table_exists
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admins';
    
    -- عد السجلات في الجدول القديم إذا كان موجوداً
    IF v_table_exists > 0 THEN
        EXECUTE 'SELECT COUNT(*) FROM public.admins' INTO v_old_count;
    END IF;
    
    -- عد السجلات في الجداول الجديدة
    SELECT COUNT(*) INTO v_admin_users_count FROM public.admin_users;
    SELECT COUNT(*) INTO v_positions_count FROM public.board_positions;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'نتائج الترحيل:';
    RAISE NOTICE 'عدد السجلات في admins القديم: %', v_old_count;
    RAISE NOTICE 'عدد السجلات في admin_users الجديد: %', v_admin_users_count;
    RAISE NOTICE 'عدد السجلات في board_positions الجديد: %', v_positions_count;
    RAISE NOTICE '==============================================';
    
    IF v_admin_users_count = 0 AND v_old_count > 0 THEN
        RAISE WARNING 'لم يتم ترحيل أي مستخدمين إداريين! تحقق من البيانات.';
    END IF;
    
    IF v_positions_count = 0 AND v_old_count > 0 THEN
        RAISE WARNING 'لم يتم ترحيل أي مناصب! تحقق من البيانات.';
    END IF;
    
    IF v_table_exists = 0 THEN
        RAISE NOTICE 'ملاحظة: جدول admins غير موجود - لم يتم الترحيل';
    END IF;
END $$;

-- =====================================================
-- الخطوة 6: (اختياري) إعادة تسمية الجدول القديم
-- =====================================================

-- ⚠️ قم بإلغاء التعليق عن هذا الجزء فقط بعد التأكد من نجاح الترحيل

-- ALTER TABLE admins RENAME TO admins_old_backup;
-- COMMENT ON TABLE admins_old_backup IS 'نسخة احتياطية من جدول admins القديم - تم الترحيل منه';

-- RAISE NOTICE 'تم إعادة تسمية جدول admins إلى admins_old_backup';

COMMIT;

-- =====================================================
-- ملاحظات مهمة بعد الترحيل
-- =====================================================

-- 1. راجع البيانات المرحّلة:
--    SELECT * FROM admin_users;
--    SELECT * FROM board_positions_detailed;

-- 2. تحقق من المجلس الحالي:
--    SELECT * FROM board_councils WHERE is_current = true;

-- 3. تحقق من أعضاء المجلس:
--    SELECT * FROM get_current_board_members();

-- 4. إذا كانت البيانات صحيحة، يمكنك حذف الجدول القديم:
--    DROP TABLE admins_old_backup;

-- 5. حدّث التطبيق ليستخدم الجداول الجديدة

-- انتهى الترحيل بنجاح! راجع الملاحظات أعلاه.
