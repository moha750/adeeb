-- =============================================
-- توحيد بادئة رقم الشهادة: ADB → ADEEB
-- =============================================
-- 1) تحديث دالة التوليد للشهادات الجديدة
-- 2) ترحيل الشهادات الموجودة من ADB-YYYY-NNNN إلى ADEEB-YYYY-NNNN
--    (الفترة الانتقالية في التطوير قبل بدء الإصدار الفعلي)

-- =============================================
-- 1. تحديث مولّد الرقم التسلسلي
-- =============================================
-- التنسيق الجديد: ADEEB-YYYY-NNNN (السنة من تاريخ النشاط)
CREATE OR REPLACE FUNCTION generate_certificate_serial(p_activity_date DATE)
RETURNS TEXT AS $$
BEGIN
    RETURN 'ADEEB-'
        || EXTRACT(YEAR FROM p_activity_date)::TEXT
        || '-'
        || LPAD(nextval('certificate_serial_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- =============================================
-- 2. ترحيل الشهادات الحالية ADB → ADEEB
-- =============================================
-- نتجاوز trigger الحماية على الأعمدة الحساسة عبر app.via_lifecycle_fn
DO $$
BEGIN
    PERFORM set_config('app.via_lifecycle_fn', 'true', true);

    UPDATE activity_reservations
    SET    certificate_serial = REPLACE(certificate_serial, 'ADB-', 'ADEEB-')
    WHERE  certificate_serial LIKE 'ADB-%';
END;
$$;
