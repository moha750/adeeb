-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260720000527   الاسم: library_01_schema

-- مكتبة «إرثٌ يُروى» — المخطط الأساسيّ: الكتب وصفحاتها
-- نظام منشورات عامّ (تقارير سنويّة · مجلّات · كتيّبات) مبنيّ على القاعدة بالكامل.

create table if not exists public.library_books (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  kind           text not null default 'annual_report'
                   check (kind in ('annual_report','magazine','booklet')),
  summary        text,
  year_hijri     int,
  year_gregorian int,
  cover_page_id  uuid,                         -- FK يُضاف بعد إنشاء library_pages
  status         text not null default 'draft' check (status in ('draft','published')),
  published_at   timestamptz,
  views          int  not null default 0,
  is_featured    boolean not null default false,
  "order"        int  not null default 0,      -- ترتيب الرفّ (كعمود works."order")
  created_by     uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.library_books is 'كتب مكتبة «إرثٌ يُروى» — منشورات النادي (تقارير/مجلّات/كتيّبات)';

create table if not exists public.library_pages (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references public.library_books(id) on delete cascade,
  storage_path text not null,                  -- المسار داخل دلو library
  page_number  int  not null,                  -- 1-based، ترتيب العرض (فهرس غير فريد عمدًا)
  label        text,
  alt_text     text,
  width        int,
  height       int,
  is_hard      boolean not null default false, -- دفّة صلبة في المُقلِّب (غلاف)
  created_at   timestamptz not null default now()
);
comment on table public.library_pages is 'صفحات كتب المكتبة — صورة لكل صفحة مرتّبة بـ page_number';

-- المفتاح الأجنبيّ الدائريّ للغلاف يُضاف بعد وجود الجدولين
alter table public.library_books
  add constraint library_books_cover_fk
  foreign key (cover_page_id) references public.library_pages(id) on delete set null;

create index if not exists library_books_shelf_idx
  on public.library_books (is_featured desc, "order", published_at desc);
create index if not exists library_books_kind_idx
  on public.library_books (kind);
create index if not exists library_pages_order_idx
  on public.library_pages (book_id, page_number);
create index if not exists library_pages_book_fk_idx
  on public.library_pages (book_id);
create index if not exists library_books_cover_fk_idx
  on public.library_books (cover_page_id);
