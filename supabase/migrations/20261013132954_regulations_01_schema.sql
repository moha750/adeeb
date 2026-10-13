-- أنظمةُ أدِيب ٠١ (٢٠٢٦-١٠-١٢): بيتُ الدستور والأنظمة في القاعدة
--
-- طُبِّق ٢٠٢٦-١٠-١٣. ويليه `regulations_02_v1` (الإصدارُ الأوّل مسودّاتٍ، طُبِّق معه)،
-- ثمّ `supabase/pending/regulations_03_publish_v1.sql` يومَ تُفتح الصفحةُ العلنيّة.
--
-- ## الشكل (REGULATIONS-SYSTEM.md › رابعًا)
-- وثيقةٌ لها نسخٌ متتابعة، والمتنُ عمودُ `jsonb` في صفّ النسخة لا جدولُ موادّ، على سابقة
-- «أقسام الخبر»: النسخةُ تُقرأ كاملةً وتُكتب كاملة. والاستشهادُ ثلاثيّ (الوثيقة، النسخة، المادّة)
-- فلا يحتاج مفتاحًا إلى صفّ مادّة.
--
-- `body` مصفوفةُ أبواب بالشكل الذي تقرؤه الواجهة (`lib/regulations/types.ts`):
--   [{ title | null, articles: [{ no, title, blocks: [para | list | table | figure] }] }]
--
-- ## التجميد في القاعدة لا في الواجهة
-- النسخةُ المنشورة لا تُعدَّل ولا تُحذف، ولو بمفتاح الخدمة. التعديلُ نسخةٌ جديدة.
-- والاستثناءُ الوحيد أن يصير `published_by` فارغًا حين يُحذف حسابُ ناشرها، فهذا فعلُ
-- المفتاح الأجنبيّ لا تعديلٌ في النصّ.
--
-- ## السارية
-- أحدثُ نسخةٍ منشورةٍ بلغ تاريخُ نفاذها، بتوقيت الرياض. يعرضها `regulations_current`.
--
-- ## القراءة والكتابة
-- `anon` يقرأ المنشورَ وحده، وصاحبُ `manage_regulations` يرى المسودّات.
-- ولا كتابةَ من العميل أصلًا: غرفةُ التحرير (المرحلة ٥) تكتب بأفعال الخادم بمفتاح الخدمة،
-- والتفويضُ عند الباب، على قاعدة «أمن ٠٢»: لا امتيازَ كتابةٍ حيث لا سياسةَ كتابة.
--
-- ## القدرة
-- `manage_regulations` لرئيس أدِيب والرئيس التنفيذيّ وحدهما، لأنّ الأنظمة يُقرّها الرئيسان معًا.
-- وحسابُ النادي (`adeeb_admin`) لا يحملها عمدًا: ليس شخصًا يُقِرّ.

begin;

-- ═══ (١) الوثيقة ═════════════════════════════════════════════════════════════
create table if not exists public.regulations (
  id          smallint generated always as identity primary key,
  -- الرابطُ العلنيّ `/regulations/<slug>`، وعليه تقوم الاستشهادات، فلا يتبدّل.
  slug        text not null unique check (slug ~ '^[a-z][a-z-]{1,40}$'),
  title       text not null check (length(btrim(title)) between 2 and 80),
  -- سطرُ التعريف: ما تنظّمه الوثيقة، في صدرها وكرتِها في الفهرس (أقرّ المالكُ النصوصَ ٢٠٢٦-١٠-١٣).
  summary     text not null check (length(btrim(summary)) between 10 and 240),
  -- ترتيبُ المادة ٦٥ من الدستور: الدستورُ أوّلًا ثمّ الأنظمة.
  position    smallint not null unique,
  created_at  timestamptz not null default now()
);

comment on table public.regulations is
  'أنظمةُ أدِيب: الدستورُ والأنظمة، لكلٍّ نسخُه في regulation_versions. تُعرض في /regulations.';

-- ═══ (٢) النسخة ══════════════════════════════════════════════════════════════
create table if not exists public.regulation_versions (
  id              uuid primary key default gen_random_uuid(),
  regulation_id   smallint not null references public.regulations(id) on delete restrict,
  version_no      integer not null check (version_no >= 1),
  status          text not null default 'draft' check (status in ('draft', 'published')),
  effective_from  date,
  change_note     text check (change_note is null or length(btrim(change_note)) between 2 and 500),
  approval_note   text check (approval_note is null or length(btrim(approval_note)) between 2 and 500),
  body            jsonb not null default '[]'::jsonb check (jsonb_typeof(body) = 'array'),
  created_at      timestamptz not null default now(),
  published_at    timestamptz,
  published_by    uuid references auth.users(id) on delete set null,
  unique (regulation_id, version_no),
  -- المنشورةُ تامّة: تاريخُ نفاذها وخلاصتُها ومتنٌ غيرُ فارغ.
  constraint regulation_versions_published_complete check (
    status = 'draft' or (
      effective_from is not null and published_at is not null
      and change_note is not null and jsonb_array_length(body) > 0
    )
  )
);

comment on table public.regulation_versions is
  'نسخُ الوثيقة. المنشورةُ مجمَّدة (regulation_versions_freeze)، والساريةُ في regulations_current.';

-- مسودّةٌ واحدةٌ لكلّ وثيقة في كلّ حين: غرفةُ التحرير تُكمل ما بدأته ولا تُشعّبه.
create unique index if not exists regulation_versions_one_draft
  on public.regulation_versions (regulation_id) where status = 'draft';

-- ═══ (٣) التجميد ═════════════════════════════════════════════════════════════
create or replace function public.regulation_versions_freeze()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'TRUNCATE' then
    raise exception 'نسخُ الأنظمة لا تُفرَّغ' using errcode = 'P0001';
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.status = 'published' then
    -- حذفُ حساب الناشر يُفرغ `published_by` بفعل المفتاح الأجنبيّ، ولا شيءَ غيرُه.
    if tg_op = 'UPDATE'
       and new.published_by is null
       and (new.id, new.regulation_id, new.version_no, new.status, new.effective_from,
            new.change_note, new.approval_note, new.body, new.created_at, new.published_at)
           is not distinct from
           (old.id, old.regulation_id, old.version_no, old.status, old.effective_from,
            old.change_note, old.approval_note, old.body, old.created_at, old.published_at)
    then
      return new;
    end if;
    raise exception 'النسخةُ المنشورة لا تُعدَّل ولا تُحذف؛ التعديلُ نسخةٌ جديدة'
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  -- ساعةُ النشر تُختم هنا لا في الواجهة.
  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

create trigger regulation_versions_freeze
  before insert or update or delete on public.regulation_versions
  for each row execute function public.regulation_versions_freeze();

create trigger regulation_versions_no_truncate
  before truncate on public.regulation_versions
  for each statement execute function public.regulation_versions_freeze();

-- ═══ (٤) السارية ═════════════════════════════════════════════════════════════
-- `security_invoker`: المنظرُ يقرأ بصلاحيّة السائل، فتحكمه سياسةُ النسخ نفسُها.
create or replace view public.regulations_current
with (security_invoker = true) as
select distinct on (v.regulation_id)
  r.slug, r.title, r.summary, r.position,
  v.version_no, v.effective_from, v.change_note, v.approval_note, v.body, v.published_at
from public.regulations r
join public.regulation_versions v on v.regulation_id = r.id
where v.status = 'published'
  and v.effective_from <= (now() at time zone 'Asia/Riyadh')::date
order by v.regulation_id, v.version_no desc;

comment on view public.regulations_current is
  'النسخةُ السارية لكلّ وثيقة: أحدثُ منشورةٍ بلغ تاريخُ نفاذها بتوقيت الرياض.';

-- ═══ (٥) القدرة ══════════════════════════════════════════════════════════════
insert into public.permissions (permission_key, permission_name_ar, description, category)
select 'manage_regulations', 'إدارة الأنظمة',
       'نشرُ نسخٍ جديدةٍ من الدستور والأنظمة في /dashboard/regulations', 'website'
where not exists (select 1 from public.permissions p where p.permission_key = 'manage_regulations');

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from (values ('club_president'), ('executive_council_president')) as r(role_name)
join public.permissions p on p.permission_key = 'manage_regulations'
where not exists (
  select 1 from public.role_permissions x
  where x.role_name = r.role_name and x.permission_id = p.id
);

-- ═══ (٦) الحراسة ═════════════════════════════════════════════════════════════
alter table public.regulations enable row level security;
alter table public.regulation_versions enable row level security;

create policy regulations_read on public.regulations
  for select to anon, authenticated
  using (true);

create policy regulation_versions_read on public.regulation_versions
  for select to anon, authenticated
  using (status = 'published'
         or check_user_permission((select auth.uid()), 'manage_regulations'));

-- الامتيازُ الافتراضيّ في `public` يمنح العميلَ كلَّ شيء، فيُنزع ثمّ تُمنح القراءةُ وحدها.
revoke all on public.regulations, public.regulation_versions, public.regulations_current
  from anon, authenticated;
grant select on public.regulations, public.regulation_versions, public.regulations_current
  to anon, authenticated;

revoke all on function public.regulation_versions_freeze() from public, anon, authenticated;

commit;
