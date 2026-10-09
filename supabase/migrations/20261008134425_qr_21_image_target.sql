-- باركودٌ وجهتُه صورة (م٢١)
--
-- ✅ **مطبَّقٌ على الإنتاج ٢٠٢٦-١٠-٠٨** بإذن المالك، بالأداة (`apply_migration`)، واختُبرت حرّاسُه في
--    معاملاتٍ مُلغاة: مسارٌ بلا ملف، ومسارٌ في مجلّد غيرِ كاتبه، ووجهةٌ غيرُ صفحتها، وقراءةُ الصفحة.
--
-- ## العلّة (طلبُ المالك ٢٠٢٦-١٠-٠٨)
-- المولّدُ لا يقبل إلّا رابطًا. وكثيرٌ ممّا يُطبَع له باركودٌ **صورةٌ لا صفحة**: برنامجُ
-- فعاليّة، أو ملصقٌ، أو جدول. واليومَ يُرفع الملفُّ في مكانٍ آخر ويُلصَق رابطُه، فيصل الماسحُ
-- إلى مخزنٍ غريبٍ لا اسمَ لأدِيب فيه.
--
-- ## والتصميم: الصورةُ صفحةٌ عندنا، لا رابطٌ إلى المخزن
-- وجهةُ الصورة في `target_url` هي **صفحتُنا** (`‎/q/<code>/view`)، يكتبها الخادمُ لا المتصفّح.
-- فبابُ المسح (`qr_resolve` ومنفذُه) لا يتغيّر بحرف: يعدّ ويحوّل كما يفعل مع كلّ رابط، والصفحةُ
-- تعرض الصورة. ومن ذلك أنّ نوافذَ الجدول (م٧) تعمل بلا مساس: صورةٌ الآن ورابطٌ في نافذة.
-- والصورةُ نفسُها في `image_path`، ويُستبدَل الملفُّ فلا يتغيّر الملصق.
--
-- ## وما لا يُفعَل
-- · **لا كتابةَ من المتصفّح في الدلو**: لا سياسةَ إدراجٍ على `storage.objects`، والرفعُ برابطٍ
--   موقَّعٍ يصكّه مفتاحُ الخدمة بعد حارس الغرفة (سابقةُ `library`).
-- · **ولا ملفُّ غيرِك**: المسارُ يبدأ بمعرّف من رفعه، والمحفّزُ يردّ مسارًا ليس لكاتبه أو لا
--   ملفَّ خلفه. والتفرّدُ يمنع صفّين على ملفٍّ واحد، فلا يذهب ملفُّ أحدهما بذهاب الآخر.
-- · **ولا يتبدّل النوعُ بعد الإنشاء**: لا امتيازَ تحديثٍ على `kind`.
--
-- ## ولمَ ترحيلان لا ترحيلٌ واحد (٢٠٢٦-١٠-٠٨)
-- هذا الترحيلُ **إضافةٌ محضة** (أعمدةٌ وقيودٌ تُضاف بشرط غيابها، ومحفّزٌ يُنشأ أو يُستبدَل)، وتقييدُ
-- استبدال الصورة في السجلّ في أخيه `qr_22`: قيدُ أنواع الواقعة لا يُوسَّع إلّا بإسقاطه وإعادته،
-- وأداةُ Supabase قد تحبس ما فيه إسقاطٌ بانتظار تأكيد (رُئي في جلسةٍ أخرى، ولم يقع هنا).

begin;

-- ═══ (١) الدلو ═══════════════════════════════════════════════════════════════
-- علنيٌّ لأنّ الصورةَ تُعرَض لكلّ ماسح. والحدُّ حدُّ **المحفوظ** لا المختار: المتصفّحُ يصغّر
-- الصورةَ إلى ضلعٍ أقصاه ٢٠٤٨ قبل الرفع (`UPLOAD_RULES.qrImageStored` يقرأ الرقمَ نفسَه).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qr-images', 'qr-images', true, 4194304, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- ═══ (٢) العمودان وقيودُهما ═══════════════════════════════════════════════════
alter table public.qr_links add column if not exists kind text not null default 'link';
alter table public.qr_links add column if not exists image_path text;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.qr_links'::regclass and conname = 'qr_links_kind_check') then
    alter table public.qr_links add constraint qr_links_kind_check check (kind in ('link', 'image'));
  end if;

  -- الرابطُ بلا صورة، والصورةُ بمسارٍ من شكلٍ واحد: `<معرّفُ الرافع>/<معرّفٌ عشوائيّ>.<امتداد>`.
  if not exists (select 1 from pg_constraint where conrelid = 'public.qr_links'::regclass and conname = 'qr_links_image_shape') then
    alter table public.qr_links add constraint qr_links_image_shape check (
      (kind = 'link' and image_path is null)
      or (kind = 'image' and image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$')
    );
  end if;

  -- ووجهةُ الصورة صفحتُها هي لا غير (`‎…/q/<code>/view`): لو بُدِّلت إلى رابطٍ آخر لصار الباركودُ
  -- «صورةً» في القائمة ورابطًا عند المسح. والطرفُ يُقاس لا الأصلُ (الأصلُ يتبدّل بين الإنتاج والتجربة).
  if not exists (select 1 from pg_constraint where conrelid = 'public.qr_links'::regclass and conname = 'qr_links_image_target') then
    alter table public.qr_links add constraint qr_links_image_target check (
      kind = 'link' or right(target_url, length(code) + 8) = '/q/' || code || '/view'
    );
  end if;
end;
$$;

-- ملفٌّ واحدٌ لصفٍّ واحد: ذهابُ الصفّ يُذهب ملفَّه من المخزن، فملفٌّ يشترك فيه صفّان يُيتِّم أحدَهما.
create unique index if not exists qr_links_image_path_key
  on public.qr_links (image_path) where image_path is not null;

-- الصورةُ تُستبدَل (الملصقُ واحدٌ والصورةُ تتغيّر)، والنوعُ لا يتبدّل: لا امتيازَ على `kind`.
grant update (image_path) on public.qr_links to authenticated;

-- ═══ (٣) حارسُ المسار ═════════════════════════════════════════════════════════
-- **قبل الكتابة**: مسارٌ جديدٌ يجب أن يبدأ بمعرّف كاتبه، وأن يكون خلفه ملفٌّ في الدلو.
-- والكاتبُ المجهولُ (مفتاحُ الخدمة في الصيانة) لا يُسأل: لا `auth.uid()` له.
create or replace function public.qr_image_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.image_path is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.image_path is not distinct from old.image_path then
    return new;
  end if;

  if auth.uid() is not null and split_part(new.image_path, '/', 1) <> auth.uid()::text then
    raise exception 'QR_IMAGE_NOT_YOURS' using errcode = '42501';
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'qr-images' and o.name = new.image_path
  ) then
    raise exception 'QR_IMAGE_MISSING' using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace trigger trg_qr_image_guard
  before insert or update of image_path on public.qr_links
  for each row execute function public.qr_image_guard();

-- ═══ (٤) الصفحةُ العلنيّة تسأل عن الصورة ═════════════════════════════════════════
-- `‎/q/<code>/view` يعرض الصورةَ لمن لا جلسةَ له، وسياسةُ own-row تُخفي الصفوف. فدالّةٌ ترجع
-- **المسارَ وحدَه** لباركودٍ يعمل وصورةٍ هو، ولا شيءَ غيرَه: لا اسمَ (الاسمُ لصاحبه وحدَه)
-- ولا مالكَ ولا عدّاد. وهو ما يناله من مسح الملصقَ على كلّ حال.
create or replace function public.qr_image_of(p_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select l.image_path
  from public.qr_links l
  where l.code = p_code and l.active and l.kind = 'image'
  limit 1;
$$;

grant execute on function public.qr_image_of(text) to anon, authenticated;

commit;
