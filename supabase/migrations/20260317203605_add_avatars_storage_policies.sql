-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260317203605   الاسم: add_avatars_storage_policies


-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Allow public read access to avatars
CREATE POLICY "Avatars are publicly accessible" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Allow users to update/replace their own avatars
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

