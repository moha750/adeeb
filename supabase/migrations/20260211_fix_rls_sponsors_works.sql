-- إصلاح سياسات RLS لجداول sponsors و works
-- السماح للمستخدمين المصادق عليهم بإضافة وتعديل البيانات

-- =====================================================
-- جدول sponsors
-- =====================================================

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Allow authenticated users to insert sponsors" ON sponsors;
DROP POLICY IF EXISTS "Allow authenticated users to update sponsors" ON sponsors;
DROP POLICY IF EXISTS "Allow authenticated users to delete sponsors" ON sponsors;
DROP POLICY IF EXISTS "Allow public to read sponsors" ON sponsors;

-- إنشاء سياسات جديدة
-- السماح للجميع بقراءة الشركاء
CREATE POLICY "Allow public to read sponsors" ON sponsors
    FOR SELECT USING (true);

-- السماح للمستخدمين المصادق عليهم بإضافة شركاء
CREATE POLICY "Allow authenticated users to insert sponsors" ON sponsors
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- السماح للمستخدمين المصادق عليهم بتعديل الشركاء
CREATE POLICY "Allow authenticated users to update sponsors" ON sponsors
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- السماح للمستخدمين المصادق عليهم بحذف الشركاء
CREATE POLICY "Allow authenticated users to delete sponsors" ON sponsors
    FOR DELETE TO authenticated
    USING (true);

-- =====================================================
-- جدول works
-- =====================================================

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Allow authenticated users to insert works" ON works;
DROP POLICY IF EXISTS "Allow authenticated users to update works" ON works;
DROP POLICY IF EXISTS "Allow authenticated users to delete works" ON works;
DROP POLICY IF EXISTS "Allow public to read works" ON works;

-- إنشاء سياسات جديدة
-- السماح للجميع بقراءة الأعمال
CREATE POLICY "Allow public to read works" ON works
    FOR SELECT USING (true);

-- السماح للمستخدمين المصادق عليهم بإضافة أعمال
CREATE POLICY "Allow authenticated users to insert works" ON works
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- السماح للمستخدمين المصادق عليهم بتعديل الأعمال
CREATE POLICY "Allow authenticated users to update works" ON works
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- السماح للمستخدمين المصادق عليهم بحذف الأعمال
CREATE POLICY "Allow authenticated users to delete works" ON works
    FOR DELETE TO authenticated
    USING (true);
