-- وسمُ الباركود: حملةٌ تُقرأ مجموعةً لا سبعةَ أرقامٍ متفرّقة (م٨)
--
-- ## العلّة
-- حملةُ التسجيل تخرج بستّة ملصقات: بوّابة الكلّيّة، ولوحةُ الإعلانات، وطاولةُ المدخل،
-- ومنشورٌ في الإنستغرام، وشاشةُ القاعة، وظهرُ الكرت. وكلٌّ منها باركودٌ بعدّاده. والسؤالُ
-- الذي يُسأل بعد الحملة **«كم مسحةً للحملة كلِّها؟» و«أيُّ موضعٍ نجح؟»** لا «كم لباركود
-- رقم ثلاثة؟». واليومَ يُجمَع ذلك بالورقة والقلم.
--
-- ## والتصميم: عمودُ وسومٍ لا جدولُ حملات
-- الحملةُ **صفةٌ تُقرأ لا كيانٌ يُدار**: لا تاريخَ لها ولا ميزانيّة ولا صاحب. فجدولٌ لها
-- ديونٌ بلا مقابل. والوسمُ نصٌّ في مصفوفةٍ على الصفّ نفسِه: يُكتَب بحرفٍ ويُبحَث به بفهرس
-- ‏GIN، ويُحذف بحذف الباركود بلا صفوفٍ يتيمة.
--
-- · **الوسمُ عربيٌّ أو لاتينيّ**، ٢ إلى ٣٢ محرفًا، بلا فاصلةٍ (الفاصلةُ فاصلُ الكتابة في
--   الشاشة، فلو دخلت في الوسم انشطر عند القراءة).
-- · **وستّةٌ سقفًا** لباركودٍ واحد: ما زاد على ذلك تصنيفٌ لا وسم.

begin;

alter table public.qr_links add column if not exists tags text[] not null default '{}';

-- **الشرطُ في دالّةٍ لا في القيد**: قيدُ CHECK لا يقبل استعلامًا فرعيًّا (و`unnest` استعلام)،
-- فيُلَفّ الشرطُ في دالّةٍ ثابتة (`immutable`) ويناديها القيد.
create or replace function public.qr_tags_ok(p_tags text[])
returns boolean
language sql
immutable
as $$
  select p_tags is null or (
    coalesce(array_length(p_tags, 1), 0) <= 6
    and not exists (
      select 1 from unnest(p_tags) t
      where length(btrim(t)) < 2 or length(t) > 32 or t <> btrim(t) or t like '%,%'
    )
  );
$$;

alter table public.qr_links drop constraint if exists qr_links_tags_shape;
alter table public.qr_links add constraint qr_links_tags_shape check (public.qr_tags_ok(tags));

create index if not exists qr_links_tags_idx on public.qr_links using gin (tags);

comment on column public.qr_links.tags is
  'وسومُ الحملة. صفةٌ تُقرأ لا كيانٌ يُدار: ستّةٌ سقفًا، ٢ إلى ٣٢ محرفًا، بلا فاصلة.';

-- الوسمُ يُحرَّر من المتصفّح كالاسم والوجهة (امتيازٌ بالأعمدة، ترحيل م١).
grant update (tags) on public.qr_links to authenticated;

-- ═══ والوسمُ يُقيَّد في السجلّ ═══════════════════════════════════════════════
alter table public.qr_link_events drop constraint if exists qr_link_events_kind_check;
alter table public.qr_link_events add constraint qr_link_events_kind_check
  check (kind in ('target', 'title', 'active', 'spec', 'delete', 'owner', 'schedule', 'tags'));

create or replace function public.qr_log_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (old.id, auth.uid(), 'delete', old.target_url, null);
    return old;
  end if;

  if new.target_url is distinct from old.target_url then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'target', old.target_url, new.target_url);
  end if;
  if new.title is distinct from old.title then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'title', old.title, new.title);
  end if;
  if new.active is distinct from old.active then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'active', old.active::text, new.active::text);
  end if;
  if new.tags is distinct from old.tags then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'tags',
            array_to_string(old.tags, '، '), array_to_string(new.tags, '، '));
  end if;
  -- الوصفةُ تُقيَّد وقوعًا لا محتوًى (شعارٌ مضمَّنٌ يُضخّم السجلَّ أضعافَ الجدول).
  if new.spec is distinct from old.spec then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'spec', null, null);
  end if;

  return new;
end;
$$;

commit;
