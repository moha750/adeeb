-- =====================================================
-- جدول المجالس الإدارية (Board Councils)
-- =====================================================
-- هذا الجدول يمثل الحاضنة التي تضم الأعضاء الإداريين
-- مثال: "المجلس الإداري 2024", "المجلس الإداري 2025"
-- =====================================================

CREATE TABLE IF NOT EXISTS public.board_councils (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- معلومات المجلس
    title TEXT NOT NULL, -- "Board Council 2024"
    title_ar TEXT NOT NULL, -- "المجلس الإداري 2024"
    
    -- الوصف
    description TEXT,
    description_ar TEXT,
    
    -- الفترة الزمنية
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- الحالة
    is_active BOOLEAN DEFAULT true,
    is_current BOOLEAN DEFAULT false, -- المجلس الحالي (واحد فقط يمكن أن يكون current)
    
    -- إعدادات العرض
    is_visible BOOLEAN DEFAULT true, -- هل يظهر في الموقع العام
    display_order INTEGER DEFAULT 0, -- ترتيب العرض (الأحدث أولاً)
    
    -- صورة المجلس (اختياري)
    cover_image_url TEXT,
    
    -- التواريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    
    -- قيود
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- =====================================================
-- الفهارس (Indexes)
-- =====================================================

CREATE INDEX idx_board_councils_active ON public.board_councils(is_active) WHERE is_active = true;
CREATE INDEX idx_board_councils_current ON public.board_councils(is_current) WHERE is_current = true;
CREATE INDEX idx_board_councils_visible ON public.board_councils(is_visible) WHERE is_visible = true;
CREATE INDEX idx_board_councils_dates ON public.board_councils(start_date DESC, end_date DESC);

-- =====================================================
-- Trigger لتحديث updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_board_councils_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_board_councils_updated_at ON public.board_councils;

CREATE TRIGGER trigger_update_board_councils_updated_at
    BEFORE UPDATE ON public.board_councils
    FOR EACH ROW
    EXECUTE FUNCTION update_board_councils_updated_at();

-- =====================================================
-- Trigger للتأكد من وجود مجلس حالي واحد فقط
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_single_current_council()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا تم تعيين المجلس كـ current
    IF NEW.is_current = true THEN
        -- إلغاء تعيين جميع المجالس الأخرى كـ current
        UPDATE public.board_councils
        SET is_current = false
        WHERE id != NEW.id AND is_current = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_current_council ON public.board_councils;

CREATE TRIGGER trigger_ensure_single_current_council
    BEFORE INSERT OR UPDATE OF is_current ON public.board_councils
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_current_council();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.board_councils ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة المجالس المرئية
DROP POLICY IF EXISTS "Public can read visible councils" ON public.board_councils;
CREATE POLICY "Public can read visible councils"
ON public.board_councils FOR SELECT
USING (is_visible = true);

-- السماح للمستخدمين المصادقين بقراءة كل المجالس
DROP POLICY IF EXISTS "Authenticated can read all councils" ON public.board_councils;
CREATE POLICY "Authenticated can read all councils"
ON public.board_councils FOR SELECT
TO authenticated
USING (true);

-- السماح للإداريين بإدارة المجالس
DROP POLICY IF EXISTS "Admins can manage councils" ON public.board_councils;
CREATE POLICY "Admins can manage councils"
ON public.board_councils FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
);

-- =====================================================
-- دوال مساعدة
-- =====================================================

-- دالة للحصول على المجلس الحالي
CREATE OR REPLACE FUNCTION get_current_council()
RETURNS UUID AS $$
DECLARE
    v_council_id UUID;
BEGIN
    SELECT id INTO v_council_id
    FROM public.board_councils
    WHERE is_current = true AND is_active = true
    LIMIT 1;
    
    RETURN v_council_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنهاء المجلس الحالي وبدء مجلس جديد
CREATE OR REPLACE FUNCTION transition_to_new_council(
    p_new_council_id UUID,
    p_end_current_council BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_council_id UUID;
BEGIN
    -- الحصول على المجلس الحالي
    v_current_council_id := get_current_council();
    
    -- إنهاء المجلس الحالي إذا طُلب ذلك
    IF p_end_current_council AND v_current_council_id IS NOT NULL THEN
        UPDATE public.board_councils
        SET 
            is_current = false,
            end_date = CURRENT_DATE,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_current_council_id;
    END IF;
    
    -- تفعيل المجلس الجديد
    UPDATE public.board_councils
    SET 
        is_current = true,
        is_active = true,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_new_council_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- التعليقات التوضيحية
-- =====================================================
-- ملاحظة: View board_councils_with_stats سيتم إنشاؤه في ملف 03_create_board_positions.sql
-- بعد إنشاء جدول board_positions
-- =====================================================

COMMENT ON TABLE public.board_councils IS 'جدول المجالس الإدارية - الحاضنة التي تضم الأعضاء الإداريين';
COMMENT ON COLUMN public.board_councils.title IS 'عنوان المجلس بالإنجليزية';
COMMENT ON COLUMN public.board_councils.title_ar IS 'عنوان المجلس بالعربية';
COMMENT ON COLUMN public.board_councils.is_current IS 'هل هذا المجلس الحالي (واحد فقط)';
COMMENT ON COLUMN public.board_councils.is_active IS 'هل المجلس نشط';
COMMENT ON COLUMN public.board_councils.is_visible IS 'هل يظهر في الموقع العام';
