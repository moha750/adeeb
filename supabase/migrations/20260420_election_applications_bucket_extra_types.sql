-- =============================================
-- Election Applications Bucket — توسيع الأنواع المسموح بها
-- =============================================
-- إضافة دعم: DOC, DOCX, TXT
-- يحافظ على الحد الأقصى 5 ميغا الذي ضُبط في 20260420_election_applications_bucket_limit.sql
-- =============================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/png',
        'image/jpeg',
        'image/jpg'
    ]
WHERE id = 'election-applications';
