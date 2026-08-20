-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260205201852   الاسم: add_storage_policies_for_images_bucket

-- إضافة سياسات RLS لـ bucket الصور
-- السماح للمستخدمين المصادق عليهم برفع الصور
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

-- السماح للجميع بقراءة الصور (bucket عام)
CREATE POLICY "Anyone can view images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

-- السماح للمستخدمين المصادق عليهم بتحديث صورهم
CREATE POLICY "Authenticated users can update images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'images');

-- السماح للمستخدمين المصادق عليهم بحذف الصور
CREATE POLICY "Authenticated users can delete images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'images');
