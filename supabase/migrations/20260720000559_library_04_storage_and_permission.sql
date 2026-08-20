-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260720000559   الاسم: library_04_storage_and_permission

-- دلو تخزين عامّ لصور صفحات المكتبة (كـ images/avatars).
-- الرفع يمرّ حصرًا عبر Signed Upload URL يصكّه مفتاح الخدمة — لا سياسة كتابة على storage.objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('library', 'library', true, 15728640,
        array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;

-- قدرة إدارة المكتبة (قدراتيّة لا رتبيّة) — تُمنح للأدوار عبر role_permissions.
insert into public.permissions (permission_key, permission_name_ar, description, category)
values ('manage_library', 'إدارة المكتبة',
        'إنشاء المنشورات ورفع صفحاتها ونشرها في المكتبة الرقميّة', 'website')
on conflict (permission_key) do nothing;
