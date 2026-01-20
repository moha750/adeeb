-- =====================================================
-- جدول مشتركي النشرة البريدية
-- Newsletter Subscribers Table
-- =====================================================
-- تاريخ الإنشاء: 2026-01-18
-- الوصف: جدول لتخزين بيانات المشتركين في النشرة البريدية
-- =====================================================

-- إنشاء جدول مشتركي النشرة البريدية
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
    source TEXT DEFAULT 'website',
    ip_address INET,
    user_agent TEXT,
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    last_email_sent_at TIMESTAMPTZ,
    email_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_status ON public.newsletter_subscribers(status);
CREATE INDEX idx_newsletter_subscribers_subscribed_at ON public.newsletter_subscribers(subscribed_at DESC);

-- إنشاء محفز لتحديث updated_at تلقائياً
CREATE TRIGGER trigger_update_newsletter_subscribers_updated_at
    BEFORE UPDATE ON public.newsletter_subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- إضافة تعليقات توضيحية
COMMENT ON TABLE public.newsletter_subscribers IS 'جدول مشتركي النشرة البريدية';
COMMENT ON COLUMN public.newsletter_subscribers.id IS 'المعرف الفريد للمشترك';
COMMENT ON COLUMN public.newsletter_subscribers.email IS 'البريد الإلكتروني للمشترك';
COMMENT ON COLUMN public.newsletter_subscribers.status IS 'حالة الاشتراك: active, unsubscribed, bounced';
COMMENT ON COLUMN public.newsletter_subscribers.source IS 'مصدر الاشتراك';
COMMENT ON COLUMN public.newsletter_subscribers.subscribed_at IS 'تاريخ الاشتراك';
COMMENT ON COLUMN public.newsletter_subscribers.unsubscribed_at IS 'تاريخ إلغاء الاشتراك';
COMMENT ON COLUMN public.newsletter_subscribers.last_email_sent_at IS 'تاريخ آخر رسالة مرسلة';
COMMENT ON COLUMN public.newsletter_subscribers.email_count IS 'عدد الرسائل المرسلة';
