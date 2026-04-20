-- =============================================
-- Election Applications Bucket — حدّ صارم لحجم الملف
-- =============================================
-- الحد الأقصى لحجم الملف الانتخابي = 5 ميغابايت (5 * 1024 * 1024 = 5242880 بايت)
-- الأنواع المسموح بها: PDF + الصور الشائعة فقط
-- يطابق التحقق على الواجهة في admin/js/elections-manager.js (CANDIDACY_FILE_MAX_BYTES)
-- =============================================

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'election-applications',
    'election-applications',
    false,
    5242880,
    ARRAY[
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg'
    ]
)
ON CONFLICT (id) DO UPDATE
SET
    file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    public             = EXCLUDED.public;
