-- إنشاء bucket لتخزين صور الأخبار
-- يجب تشغيل هذا الكود في Supabase SQL Editor

-- إنشاء bucket للصور
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- السماح للجميع بقراءة الصور
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'news-images');

-- السماح للمستخدمين المسجلين برفع الصور
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'news-images' 
  AND auth.role() = 'authenticated'
);

-- السماح للمستخدمين المسجلين بحذف صورهم
CREATE POLICY "Allow authenticated users to delete their images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'news-images' 
  AND auth.role() = 'authenticated'
);

-- السماح للمستخدمين المسجلين بتحديث صورهم
CREATE POLICY "Allow authenticated users to update their images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'news-images' 
  AND auth.role() = 'authenticated'
);
