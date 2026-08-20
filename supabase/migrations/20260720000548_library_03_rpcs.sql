-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260720000548   الاسم: library_03_rpcs

-- زيادة المشاهدات ذرّيًّا للمنشور (anon لا يملك UPDATE على الجدول)
create or replace function public.library_increment_views(p_book_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.library_books
     set views = views + 1
   where id = p_book_id and status = 'published';
$$;
revoke all on function public.library_increment_views(uuid) from public;
grant execute on function public.library_increment_views(uuid) to anon, authenticated;

-- إعادة ترتيب الصفحات ذرّيًّا حسب مصفوفة المعرّفات (يستدعيها action بمفتاح الخدمة)
create or replace function public.library_reorder_pages(p_book_id uuid, p_page_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.library_pages p
     set page_number = t.ord
    from (select u.id, u.ord
            from unnest(p_page_ids) with ordinality as u(id, ord)) t
   where p.id = t.id and p.book_id = p_book_id;
end;
$$;
revoke all on function public.library_reorder_pages(uuid, uuid[]) from public;
grant execute on function public.library_reorder_pages(uuid, uuid[]) to service_role;
