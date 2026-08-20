-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260720000537   الاسم: library_02_rls

-- RLS: العامّ يقرأ المنشور فقط؛ مفتاح الخدمة (اللوحة) يتجاوز RLS فيكتب كلّ شيء.
-- لا سياسات كتابة → anon/authenticated لا يكتبان ولا يريان المسودّات. (نموذج works.)

alter table public.library_books enable row level security;
alter table public.library_pages enable row level security;

create policy library_books_public_read on public.library_books
  for select to anon, authenticated
  using (status = 'published');

create policy library_pages_public_read on public.library_pages
  for select to anon, authenticated
  using (exists (
    select 1 from public.library_books b
    where b.id = library_pages.book_id and b.status = 'published'
  ));
