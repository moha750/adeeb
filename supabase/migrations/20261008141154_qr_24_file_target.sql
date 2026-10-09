-- الباركودُ الذي وجهتُه **ملف**: صورةٌ أو PDF (م٢٤، طلبُ المالك ٢٠٢٦-١٠-٠٨: «أضف نوع ملف PDF»)
--
-- ✅ **مطبَّقٌ على الإنتاج ٢٠٢٦-١٠-٠٨**، واختُبر في معاملاتٍ مُلغاة: رابطٌ يصير PDF (وواقعتا
--    `target` و`file`)، وملفٌّ بلا مسارٍ يُردّ.
--
-- ⚠️ **وترك بقيّتين** لا يناديهما شيء: `qr_image_of` (غلافٌ على `qr_file_of`) و`qr_image_guard`
--    (لا تفعل شيئًا)، والمحفّزُ باسمه القديم `trg_qr_image_guard` يستدعي `qr_file_guard`. وعلّتُها أنّ
--    أداةَ Supabase أوقفت النسخةَ الأولى من هذا الترحيل (`cancelled`) وفيها `drop function` و
--    `drop trigger`، ومرّت بعد أن صارت الإسقاطاتُ استبدالًا في الموضع.
--    ✅ نُظِّفت كلُّها في م٢٥ (`20261008143720_qr_25_file_cleanup`) مع دلو `qr-images`.
--
-- ## ما تغيّر عن م٢١
-- كان النوعُ «صورة» وعمودُه `image_path` ودلوُه `qr-images`. فلمّا جاء الـPDF صار الاسمُ يكذب:
-- `image_path` يحمل PDF. والصفوفُ صفرٌ والكودُ لم يُنشَر، فهذه أرخصُ لحظةٍ لتسميةٍ صادقة:
-- · النوعُ `file` لا `image`، والملفُّ صورةٌ أو PDF **ونوعُه من امتداده** لا من عمودٍ ثانٍ. فتبقى
--   بطاقتا الاختيار اثنتين («رابط / ملف»)، ومن استبدل صورةً بـPDF لم يغيّر نوعَ الباركود.
-- · العمودُ `file_path`، والدالّتان `qr_file_guard` و`qr_file_of`، وواقعةُ السجلّ `file`.
-- · دلوٌ جديد `qr-files` يقبل الـPDF بحدٍّ أرحب (لا يُصغَّر في المتصفّح كالصورة). ودلوُ
--   `qr-images` فارغٌ لم يُكتب فيه ملفٌّ قطّ، تُرك هنا وحُذف في م٢٥.
--
-- وامتيازُ التحديث على العمود يتبع اسمَه الجديد (يُحفظ برقم العمود لا باسمه)، وكذا امتيازُ `kind`
-- من م٢٣. والقيودُ تُعاد بأسمائها الجديدة.

begin;

-- ═══ (١) الدلو ═══════════════════════════════════════════════════════════════
-- الحدُّ حدُّ الـPDF (عشرةٌ)، والصورةُ تصل مصغَّرةً بأقلَّ من ميغابايت، ويحدّها الخادمُ بأربعة.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qr-files', 'qr-files', true, 10485760,
        array['image/webp', 'image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

-- ═══ (٢) القيودُ التي تحمل الاسمَ القديم تُرفع أوّلًا ═══════════════════════════════
alter table public.qr_links drop constraint if exists qr_links_kind_check;
alter table public.qr_links drop constraint if exists qr_links_image_shape;
alter table public.qr_links drop constraint if exists qr_links_image_target;

-- ═══ (٣) الاسمُ الصادق ═══════════════════════════════════════════════════════
alter table public.qr_links rename column image_path to file_path;
alter index if exists public.qr_links_image_path_key rename to qr_links_file_path_key;
alter table public.qr_links add constraint qr_links_kind_check check (kind in ('link', 'file'));

-- الرابطُ بلا ملف، والملفُّ بمسارٍ من شكلٍ واحد: `<معرّفُ الرافع>/<معرّفٌ عشوائيّ>.<امتداد>`.
alter table public.qr_links add constraint qr_links_file_shape check (
  (kind = 'link' and file_path is null)
  or (kind = 'file' and file_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png|pdf)$')
);

-- ووجهةُ الملفّ صفحتُه هو لا غير (`‎…/q/<code>/view`).
alter table public.qr_links add constraint qr_links_file_target check (
  kind = 'link' or right(target_url, length(code) + 8) = '/q/' || code || '/view'
);

-- ═══ (٤) حارسُ المسار ═════════════════════════════════════════════════════════
-- مسارٌ جديدٌ يبدأ بمعرّف كاتبه، وخلفه ملفٌّ في الدلو. والكاتبُ المجهولُ (مفتاحُ الخدمة) لا يُسأل.
create or replace function public.qr_file_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.file_path is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.file_path is not distinct from old.file_path then
    return new;
  end if;

  if auth.uid() is not null and split_part(new.file_path, '/', 1) <> auth.uid()::text then
    raise exception 'QR_FILE_NOT_YOURS' using errcode = '42501';
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'qr-files' and o.name = new.file_path
  ) then
    raise exception 'QR_FILE_MISSING' using errcode = '23514';
  end if;

  return new;
end;
$$;

-- المحفّزُ القديمُ يُستبدَل تعريفُه في موضعه: اسمُه باقٍ، ودالّتُه الجديدة (انظر رأسَ الملفّ)
create or replace trigger trg_qr_image_guard
  before insert or update of file_path on public.qr_links
  for each row execute function public.qr_file_guard();

-- ═══ (٥) الصفحةُ العلنيّة تسأل عن الملفّ ═════════════════════════════════════════
-- المسارُ وحدَه لباركودٍ يعمل وملفٍّ هو: لا اسمَ ولا مالكَ ولا عدّاد. ونوعُه من امتداده.
create or replace function public.qr_file_of(p_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select l.file_path
  from public.qr_links l
  where l.code = p_code and l.active and l.kind = 'file'
  limit 1;
$$;

grant execute on function public.qr_file_of(text) to anon, authenticated;

-- ═══ (٦) السجلّ: واقعةُ `file` بدل `image` ═══════════════════════════════════════
alter table public.qr_link_events drop constraint if exists qr_link_events_kind_check;
alter table public.qr_link_events add constraint qr_link_events_kind_check
  check (kind in ('target', 'title', 'active', 'spec', 'delete', 'owner', 'schedule', 'tags', 'campaign', 'file'));

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
  if new.file_path is distinct from old.file_path then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'file', old.file_path, new.file_path);
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
  if new.campaign_id is distinct from old.campaign_id then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'campaign',
            (select c.name from public.qr_campaigns c where c.id = old.campaign_id),
            (select c.name from public.qr_campaigns c where c.id = new.campaign_id));
  end if;
  if new.spec is distinct from old.spec then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'spec', null, null);
  end if;

  return new;
end;
$$;

-- ═══ (٧) الدالّتان القديمتان تبقيان صالحتين ولا يناديهما شيء (انظر رأسَ الملفّ) ═════════════
create or replace function public.qr_image_of(p_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.qr_file_of(p_code);
$$;

create or replace function public.qr_image_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  return new;
end;
$$;

commit;
