-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260731073510   الاسم: news_v2_guards_and_vocabulary

-- ════════════════════════════════════════════════════════════════════
--  منصّة أخبار أدِيب V2 — الترحيل الثاني: حرّاس القاعدة ومفرداتها
--
--  كلّ ما هنا **آليّ**: حقائق تُشتقّ ولا تُكتب بيد. والأفعال التحريريّة
--  (تكليف · رفع · مراجعة · نشر) في الترحيل الثالث، لأنّها تحتاج فاعلًا يُسمّى.
-- ════════════════════════════════════════════════════════════════════


-- ── ١) مفردات القسم — محروسةٌ بقيد ───────────────────────────────────
--
-- العمود موجودٌ منذ البداية وفارغٌ في الخمسة عشر خبرًا كلّها: عمودٌ بلا مفردات
-- لا يصنّف شيئًا. فتُسمّى المفردات هنا ويحرسها قيد — كما في الإذاعة والمكتبة.

update news set category = 'coverage' where category is null;
-- الشراكة الوحيدة في الأرشيف تُسمّى باسمها؛ والباقي تغطياتُ فعاليّات.
update news set category = 'partnership' where slug like 'شراكة-واعدة%';

alter table news alter column category set default 'coverage';
alter table news alter column category set not null;
alter table news drop constraint if exists news_category_check;
alter table news add constraint news_category_check check (category in (
  'coverage',      -- تغطية: فعاليّة أو مشاركة
  'partnership',   -- شراكة: اتفاقيّة أو مذكّرة تفاهم
  'achievement',   -- إنجاز: تكريم أو جائزة
  'announcement',  -- إعلان: بيانٌ من النادي
  'feature'        -- تحقيق: مادّة تحريريّة موسّعة
));

alter table news alter column tags set default '{}';
update news set tags = '{}' where tags is null;

-- الوسوم حرّة لكن **نظيفة**: لا وسمٌ فارغ يتسلّل فيصير مرشِّحًا لا يطابق شيئًا.
alter table news drop constraint if exists news_tags_clean;
alter table news add constraint news_tags_clean
  check (tags is null or array_position(tags, '') is null);


-- ── ٢) مرآة `status` ⟷ `workflow_status` ─────────────────────────────
--
-- عمودان يقولان الشيء نفسه: `status` ثلاثيّ (V1 يقرؤه على adeeb.club الحيّ،
-- وقسمُ الأخبار في هبوط V2 يقرؤه)، و`workflow_status` سداسيّ (غرفة التحرير).
-- لا يُسقَط أحدهما قبل موت V1 — لكن **لا يُتركان يفترقان**: مزامنةٌ في اتّجاهين،
-- فأيّهما كُتب اشتُقّ منه الآخر. V2 يكتب `workflow_status` وحده.

create or replace function public.news_sync_status()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    new.status := case new.workflow_status
      when 'published' then 'published' when 'archived' then 'archived' else 'draft' end;
    return new;
  end if;

  if new.workflow_status is distinct from old.workflow_status then
    -- الغرفة التحريريّة تكلّمت: الثلاثيّ يتبع السداسيّ
    new.status := case new.workflow_status
      when 'published' then 'published' when 'archived' then 'archived' else 'draft' end;
  elsif new.status is distinct from old.status then
    -- V1 تكلّم: السداسيّ يتبع الثلاثيّ — ولا يهبط من مرحلةٍ تحريريّة قائمة
    new.workflow_status := case new.status
      when 'published' then 'published'
      when 'archived'  then 'archived'
      else case when old.workflow_status in ('published', 'archived')
                then 'draft' else old.workflow_status end
    end;
  end if;
  return new;
end $$;

drop trigger if exists news_sync_status on news;
create trigger news_sync_status before insert or update on news
  for each row execute function public.news_sync_status();


-- ── ٣) `author_name` مرآةُ `authors[1]` ──────────────────────────────
-- عمودٌ نصّيّ يكرّر أوّل عناصر المصفوفة. V1 يقرؤه، فيبقى — لكنّه يُشتقّ.

create or replace function public.news_sync_author_name()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.authors is not null and array_length(new.authors, 1) > 0 then
    new.author_name := new.authors[1];
  end if;
  return new;
end $$;

drop trigger if exists news_sync_author_name on news;
create trigger news_sync_author_name before insert or update on news
  for each row execute function public.news_sync_author_name();


-- ── ٤) `updated_at` لا يُكتب بيد ─────────────────────────────────────

create or replace function public.news_touch_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists news_touch_updated_at on news;
create trigger news_touch_updated_at before update on news
  for each row execute function public.news_touch_updated_at();

drop trigger if exists news_writer_assignments_touch on news_writer_assignments;
create trigger news_writer_assignments_touch before update on news_writer_assignments
  for each row execute function public.news_touch_updated_at();


-- ── ٥) عدّاد الإعجابات الصادق ────────────────────────────────────────
--
-- **عطلٌ حيّ:** في القاعدة ٥٥ إعجابًا، و`likes_count` صفرٌ في كلّ خبر —
-- عدّادٌ يكذب لأنّ أحدًا لم يُحدّثه. الجذر: لا يُحدَّث بيد، بل يُشتقّ من الصفوف.

create or replace function public.news_recount_likes()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  target uuid := coalesce(new.news_id, old.news_id);
begin
  update news n
     set likes_count = (select count(*) from news_likes l where l.news_id = target)
   where n.id = target;
  return null;
end $$;

drop trigger if exists news_likes_recount on news_likes;
create trigger news_likes_recount after insert or delete on news_likes
  for each row execute function public.news_recount_likes();

-- تسديد ما فات: العدّاد يُصدَّق الآن لا عند أوّل إعجابٍ قادم.
update news n set likes_count = (select count(*) from news_likes l where l.news_id = n.id);


-- ── ٦) المعرّف (slug) — يُشتقّ إن خلا، ولا يُترك فارغًا ──────────────
--
-- الأرشيف كلّه معرّفاتٌ عربيّة (`حينَ-يتحوّلُ-السُّؤالُ…`) — تبقى كما هي فروابطها
-- منشورةٌ في الخارج، لكن الجديد يُولَد بمعرّفٍ مضمونِ التفرّد إن لم يُسمَّ.

create or replace function public.news_fill_slug()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := 'news-' || replace(new.id::text, '-', '');
  end if;
  return new;
end $$;

drop trigger if exists news_fill_slug on news;
create trigger news_fill_slug before insert on news
  for each row execute function public.news_fill_slug();

alter table news drop constraint if exists news_slug_present;
alter table news add constraint news_slug_present check (slug is not null and btrim(slug) <> '');


-- ── ٧) حارس اكتمال النشر ─────────────────────────────────────────────
--
-- لا يُنشَر خبرٌ ناقص. بطاقة الخبر في الهبوط تعرض الملخّص والغلاف والكاتب —
-- فخبرٌ بلا أحدها يخرج إلى الواجهة مشوَّهًا. القاعدة تمنعه، لا الواجهة وحدها.

alter table news drop constraint if exists news_publish_guard;
alter table news add constraint news_publish_guard check (
  workflow_status <> 'published' or (
        summary   is not null and btrim(summary) <> ''
    and image_url is not null and btrim(image_url) <> ''
    and authors   is not null and array_length(authors, 1) > 0
    and published_at is not null
  )
);

-- تاريخ النشر يُختم مرّةً واحدة ولا يُعاد ختمه بإعادة نشرٍ لاحقة.
create or replace function public.news_stamp_published_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.workflow_status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

drop trigger if exists news_stamp_published_at on news;
create trigger news_stamp_published_at before insert or update on news
  for each row execute function public.news_stamp_published_at();


-- ── ٨) اتّساق الوسائط: مصوّرو المعرض بعدد صوره ───────────────────────

alter table news alter column gallery_images set default '{}';
update news set gallery_images = '{}' where gallery_images is null;

alter table news drop constraint if exists news_gallery_photographers_aligned;
alter table news add constraint news_gallery_photographers_aligned check (
  gallery_photographers is null
  or coalesce(array_length(gallery_photographers, 1), 0)
     = coalesce(array_length(gallery_images, 1), 0)
);


-- ── ٩) فهارس القراءات الحيّة ─────────────────────────────────────────

create index if not exists news_published_idx
  on news (published_at desc) where status = 'published';
create index if not exists news_workflow_idx on news (workflow_status, updated_at desc);
create index if not exists news_committee_idx on news (committee_id);
create index if not exists news_writer_assignments_writer_idx
  on news_writer_assignments (writer_id, status);
create index if not exists news_activity_log_news_idx on news_activity_log (news_id, created_at desc);
create index if not exists news_collab_news_idx on news_collaboration_comments (news_id, created_at);
create index if not exists news_public_comments_news_idx on news_public_comments (news_id, created_at desc);

