-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260420014917   الاسم: election_applications_bucket_limit

-- =============================================
-- Election Applications Bucket — حدّ صارم لحجم الملف
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
