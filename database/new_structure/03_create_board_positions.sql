-- =====================================================
-- جدول مناصب المجلس الإداري (Board Positions)
-- =====================================================
-- هذا الجدول يربط الأعضاء بمناصبهم في المجالس الإدارية
-- كل عضو يمكن أن يكون له منصب واحد في كل مجلس
-- =====================================================

CREATE TABLE IF NOT EXISTS public.board_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- الربط بالمجلس والعضو
    council_id UUID NOT NULL REFERENCES public.board_councils(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    
    -- معلومات المنصب
    position_type TEXT NOT NULL CHECK (position_type IN (
        'president',           -- الرئيس
        'vice_president',      -- نائب الرئيس
        'leader',              -- القائد
        'vice_leader',         -- نائب القائد
        'ceo',                 -- الرئيس التنفيذي
        'secretary',           -- الأمين العام
        'treasurer',           -- أمين الصندوق
        'member'               -- عضو
    )),
    
    position_title TEXT NOT NULL, -- "President", "Vice President", "Leader"
    position_title_ar TEXT NOT NULL, -- "الرئيس", "النائب", "القائد"
    
    -- ترتيب المنصب (1 = الأعلى)
    position_rank INTEGER NOT NULL DEFAULT 99,
    
    -- معلومات إضافية عن المنصب
    department TEXT, -- "Media Committee", "Events Committee"
    department_ar TEXT, -- "لجنة الإعلام", "لجنة الفعاليات"
    
    -- معلومات العرض
    bio TEXT, -- نبذة عن العضو في هذا المنصب
    bio_ar TEXT,
    custom_avatar_url TEXT, -- صورة مخصصة للمنصب (اختياري، وإلا تُستخدم صورة العضو)
    
    -- روابط التواصل الاجتماعي (يمكن أن تكون مختلفة عن روابط العضو الشخصية)
    social_links JSONB DEFAULT '{}'::jsonb, -- {twitter, instagram, linkedin, etc.}
    
    -- إعدادات العرض
    is_visible BOOLEAN DEFAULT true, -- هل يظهر في الموقع العام
    display_order INTEGER DEFAULT 0, -- ترتيب العرض في الصفحة
    
    -- التواريخ
    appointed_at DATE, -- تاريخ التعيين
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    
    -- قيود
    CONSTRAINT unique_member_per_council UNIQUE(council_id, member_id),
    CONSTRAINT valid_position_rank CHECK (position_rank > 0)
);

-- =====================================================
-- الفهارس (Indexes)
-- =====================================================

CREATE INDEX idx_board_positions_council ON public.board_positions(council_id);
CREATE INDEX idx_board_positions_member ON public.board_positions(member_id);
CREATE INDEX idx_board_positions_type ON public.board_positions(position_type);
CREATE INDEX idx_board_positions_rank ON public.board_positions(position_rank);
CREATE INDEX idx_board_positions_visible ON public.board_positions(is_visible) WHERE is_visible = true;
CREATE INDEX idx_board_positions_display_order ON public.board_positions(council_id, display_order);

-- =====================================================
-- Trigger لتحديث updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_board_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_board_positions_updated_at ON public.board_positions;

CREATE TRIGGER trigger_update_board_positions_updated_at
    BEFORE UPDATE ON public.board_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_board_positions_updated_at();

-- =====================================================
-- Trigger لتعيين الترتيب والعناوين تلقائياً حسب نوع المنصب
-- =====================================================

CREATE OR REPLACE FUNCTION set_position_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- تعيين الترتيب والعناوين الافتراضية حسب نوع المنصب
    CASE NEW.position_type
        WHEN 'president' THEN
            NEW.position_rank := COALESCE(NEW.position_rank, 1);
            NEW.position_title := COALESCE(NEW.position_title, 'President');
            NEW.position_title_ar := COALESCE(NEW.position_title_ar, 'الرئيس');
        
        WHEN 'vice_president' THEN
            NEW.position_rank := COALESCE(NEW.position_rank, 2);
            NEW.position_title := COALESCE(NEW.position_title, 'Vice President');
            NEW.position_title_ar := COALESCE(NEW.position_title_ar, 'نائب الرئيس');
        
        WHEN 'ceo' THEN
            NEW.position_rank := COALESCE(NEW.position_rank, 3);
            NEW.position_title := COALESCE(NEW.position_title, 'Chief Executive Officer');
            NEW.position_title_ar := COALESCE(NEW.position_title_ar, 'الرئيس التنفيذي');
        
        WHEN 'leader' THEN
            NEW.position_rank := COALESCE(NEW.position_rank, 4);
            NEW.position_title := COALESCE(NEW.position_title, 'Leader');
            NEW.position_title_ar := COALESCE(NEW.position_title_ar, 'القائد');
        
        WHEN 'vice_leader' THEN
            NEW.position_rank := COALESCE(NEW.position_rank, 5);
            NEW.position_title := COALESCE(NEW.position_title, 'Vice Leader');
            NEW.position_title_ar := COALESCE(NEW.position_title_ar, 'نائب القائد');
        
        WHEN 'secretary' THEN
            NEW.position_rank := COALESCE(NEW.position_rank, 6);
            NEW.position_title := COALESCE(NEW.position_title, 'Secretary General');
            NEW.position_title_ar := COALESCE(NEW.position_title_ar, 'الأمين العام');
        
        WHEN 'treasurer' THEN
            NEW.position_rank := COALESCE(NEW.position_rank, 7);
            NEW.position_title := COALESCE(NEW.position_title, 'Treasurer');
            NEW.position_title_ar := COALESCE(NEW.position_title_ar, 'أمين الصندوق');
        
        WHEN 'member' THEN
            NEW.position_rank := COALESCE(NEW.position_rank, 99);
            NEW.position_title := COALESCE(NEW.position_title, 'Board Member');
            NEW.position_title_ar := COALESCE(NEW.position_title_ar, 'عضو مجلس');
        
        ELSE
            NEW.position_rank := COALESCE(NEW.position_rank, 99);
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_position_defaults ON public.board_positions;

CREATE TRIGGER trigger_set_position_defaults
    BEFORE INSERT OR UPDATE OF position_type ON public.board_positions
    FOR EACH ROW
    EXECUTE FUNCTION set_position_defaults();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.board_positions ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة المناصب المرئية في المجالس المرئية
DROP POLICY IF EXISTS "Public can read visible positions" ON public.board_positions;
CREATE POLICY "Public can read visible positions"
ON public.board_positions FOR SELECT
USING (
    is_visible = true 
    AND EXISTS (
        SELECT 1 FROM public.board_councils
        WHERE board_councils.id = board_positions.council_id
        AND board_councils.is_visible = true
    )
);

-- السماح للمستخدمين المصادقين بقراءة كل المناصب
DROP POLICY IF EXISTS "Authenticated can read all positions" ON public.board_positions;
CREATE POLICY "Authenticated can read all positions"
ON public.board_positions FOR SELECT
TO authenticated
USING (true);

-- السماح للإداريين بإدارة المناصب
DROP POLICY IF EXISTS "Admins can manage positions" ON public.board_positions;
CREATE POLICY "Admins can manage positions"
ON public.board_positions FOR ALL
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
-- View للمناصب مع معلومات الأعضاء والمجالس
-- =====================================================

CREATE OR REPLACE VIEW board_positions_detailed AS
SELECT 
    bp.id,
    bp.council_id,
    bp.member_id,
    bp.position_type,
    bp.position_title,
    bp.position_title_ar,
    bp.position_rank,
    bp.department,
    bp.department_ar,
    bp.bio,
    bp.bio_ar,
    bp.social_links,
    bp.is_visible,
    bp.display_order,
    bp.appointed_at,
    bp.created_at,
    bp.updated_at,
    
    -- معلومات العضو
    m.full_name as member_name,
    m.email as member_email,
    m.avatar_url as member_avatar,
    COALESCE(bp.custom_avatar_url, m.avatar_url) as display_avatar,
    
    -- معلومات المجلس
    bc.title as council_title,
    bc.title_ar as council_title_ar,
    bc.is_current as is_current_council,
    bc.start_date as council_start_date,
    bc.end_date as council_end_date
    
FROM public.board_positions bp
LEFT JOIN public.members m ON bp.member_id = m.id
LEFT JOIN public.board_councils bc ON bp.council_id = bc.id;

-- =====================================================
-- دوال مساعدة
-- =====================================================

-- دالة للحصول على أعضاء المجلس الحالي
CREATE OR REPLACE FUNCTION get_current_board_members()
RETURNS TABLE (
    position_id UUID,
    member_id UUID,
    member_name TEXT,
    position_title TEXT,
    position_title_ar TEXT,
    position_rank INTEGER,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.id,
        bp.member_id,
        m.full_name,
        bp.position_title,
        bp.position_title_ar,
        bp.position_rank,
        COALESCE(bp.custom_avatar_url, m.avatar_url)
    FROM public.board_positions bp
    JOIN public.members m ON bp.member_id = m.id
    JOIN public.board_councils bc ON bp.council_id = bc.id
    WHERE bc.is_current = true
    AND bc.is_active = true
    AND bp.is_visible = true
    ORDER BY bp.position_rank ASC, bp.display_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على منصب عضو معين في المجلس الحالي
CREATE OR REPLACE FUNCTION get_member_current_position(p_member_id UUID)
RETURNS TABLE (
    position_type TEXT,
    position_title TEXT,
    position_title_ar TEXT,
    council_title TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.position_type,
        bp.position_title,
        bp.position_title_ar,
        bc.title
    FROM public.board_positions bp
    JOIN public.board_councils bc ON bp.council_id = bc.id
    WHERE bp.member_id = p_member_id
    AND bc.is_current = true
    AND bc.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- View للمجالس مع عدد الأعضاء
-- =====================================================
-- تم نقل هذا الـ View من ملف 02_create_board_councils.sql
-- لأنه يعتمد على جدول board_positions
-- =====================================================

CREATE OR REPLACE VIEW board_councils_with_stats AS
SELECT 
    bc.*,
    (
        SELECT COUNT(*)
        FROM public.board_positions bp
        WHERE bp.council_id = bc.id
    ) as members_count,
    (
        SELECT COUNT(*)
        FROM public.board_positions bp
        WHERE bp.council_id = bc.id AND bp.is_visible = true
    ) as visible_members_count
FROM public.board_councils bc;

-- =====================================================
-- التعليقات التوضيحية
-- =====================================================

COMMENT ON TABLE public.board_positions IS 'جدول مناصب المجلس الإداري - يربط الأعضاء بمناصبهم في المجالس';
COMMENT ON COLUMN public.board_positions.position_type IS 'نوع المنصب: president, vice_president, leader, vice_leader, ceo, secretary, treasurer, member';
COMMENT ON COLUMN public.board_positions.position_rank IS 'ترتيب المنصب (1 = الأعلى)';
COMMENT ON COLUMN public.board_positions.custom_avatar_url IS 'صورة مخصصة للمنصب (اختياري)';
COMMENT ON COLUMN public.board_positions.social_links IS 'روابط التواصل الاجتماعي بصيغة JSON';
