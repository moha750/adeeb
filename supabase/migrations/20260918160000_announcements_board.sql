-- اللوحةُ الإعلانيّة — كلماتُ الشريط الجاري في صدر الهبوط تخرج من الكود إلى القاعدة
--
-- ⚠️ مكتوبٌ ينتظر إذن المالك. لا يُنفَّذ إلّا بكلمته (قاعدةُ DDL).
--
-- ## ما الذي يتحرّك
-- الشريطُ الجاري على حدّ الصدر (`hro-ribbon`) كان خمسَ جملٍ محفورةً في
-- `app/_components/Hero.tsx` (الثابت `TICKER`)، فتبديلُ كلمةٍ فيها نشرٌ كامل.
-- طلب المالك ٢٠٢٦-٠٩-١٨ أن يُدار من اللوحة، وسمّى التبويبَ «اللوحة الإعلانية»،
-- فهذا الجدولُ بيتُها. والشكلُ والحركةُ والمقاسُ لا تُمسّ: المتبدّلُ مصدرُ الكلمات.
--
-- ## ولمَ قفلٌ مستقلٌّ `manage_announcements`
-- عُرفُ اللوحة منذ ٢٠٢٦-٠٧-٢٦ (`split_tab_capabilities`): لكلّ تبويبٍ قفلُه، فمن أراد
-- أن يمنح أحدًا لوحةَ الإعلانات وحدها استطاع. ويُمنَح ابتداءً لمن يملك `manage_faq`
-- اليوم بالضبط (رئيسُ النادي ومدير أديب)، فلا أحدَ ينال وصولًا لم يكن له.
--
-- ## والإيقافُ لا الحذف
-- عَلَمُ `is_active` بأمر المالك في الورقة نفسِها: جملةٌ موسميّةٌ تُطفَأ وتُشعَل
-- بلا إعادة كتابة. والقراءةُ العامّة تُظهر المُشعَلَ وحدَه، وصاحبُ الغرفة يرى الكلّ.

begin;

-- ═══ (١) الجدول ═════════════════════════════════════════════════════════════
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  -- سطرٌ واحدٌ يمرّ في الشريط. الحدُّ ١٢٠ محرفًا: الشريطُ يجري ولا يقف، فجملةٌ
  -- تطول تخرج من الشاشة قبل أن تُقرأ. وأطولُ الخمسِ الحيّةِ اليومَ خمسةٌ وأربعون.
  text        text not null check (length(btrim(text)) between 2 and 120),
  sort        integer not null default 0,
  -- الإيقافُ لا الحذف: جملةٌ تُطفَأ اليومَ قد تعود غدًا، وحذفُها يفقد نصَّها.
  is_active   boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.announcements is
  'اللوحةُ الإعلانيّة — كلماتُ الشريط الجاري في صدر الهبوط، تُحرَّر من /dashboard/website/announcements.';

create index if not exists announcements_active_idx
  on public.announcements (sort, created_at) where is_active;

-- ═══ (٢) القدرة ═════════════════════════════════════════════════════════════
insert into permissions (permission_key, permission_name_ar, category)
select 'manage_announcements', 'إدارة اللوحة الإعلانية', 'website'
where not exists (select 1 from permissions p where p.permission_key = 'manage_announcements');

-- وراثةٌ من أخيها `manage_faq`: من يُحرّر محتوى الصفحة الرئيسية اليومَ يُحرّر لوحتَها.
insert into role_permissions (role_name, permission_id)
select rp.role_name, child.id
from role_permissions rp
join permissions parent on parent.id = rp.permission_id and parent.permission_key = 'manage_faq'
join permissions child on child.permission_key = 'manage_announcements'
where not exists (
  select 1 from role_permissions x
  where x.role_name = rp.role_name and x.permission_id = child.id
);

-- ═══ (٣) الحراسة ════════════════════════════════════════════════════════════
-- القراءةُ للعموم لأنّ الصدرَ يُرسَم لزائرٍ بلا جلسة، والمُطفَأُ محجوبٌ عنه: سياسةٌ
-- تُظهر الكلَّ تجعل الإيقافَ زينةً تُقرأ من PostgREST مباشرةً. وصاحبُ الغرفة يراه.
alter table public.announcements enable row level security;

drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements
  for select to anon, authenticated
  using (is_active or check_user_permission((select auth.uid()), 'manage_announcements'));

-- والكتابةُ لصاحب القفل وحده. والغرفةُ تكتب بمفتاح الخدمة (كسائر غرف اللوحة،
-- والتفويضُ عند الباب)، فهذه السياسةُ حارسُ من ينادي القاعدةَ من المتصفّح مباشرةً.
drop policy if exists announcements_write on public.announcements;
create policy announcements_write on public.announcements
  for all to authenticated
  using (check_user_permission((select auth.uid()), 'manage_announcements'))
  with check (check_user_permission((select auth.uid()), 'manage_announcements'));

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

-- ═══ (٤) ساعةُ التحديث ══════════════════════════════════════════════════════
drop trigger if exists announcements_touch on public.announcements;
create trigger announcements_touch
  before update on public.announcements
  for each row execute function public.set_updated_at_now();

-- ═══ (٥) البذرةُ: الخمسُ كما هي في الكود حرفًا بحرف ═════════════════════════
-- تُنقل ولا تُعاد صياغتُها: هذا ما يقرؤه الزائرُ اليوم، فلا يتبدّل بترحيلٍ موضوعُه
-- أين يسكن النصُّ لا ما هو. والشرطُ يجعل الترحيلَ مُعادًا بلا أثر (idempotent).
insert into public.announcements (text, sort)
select v.t, v.s
from (values
  ('كلُّ حكايةٍ عظيمة تبدأ بحرف', 0),
  ('اجتمع شغفٌ بالحرف وإيمانٌ بالكلمة، فكان أدِيب', 1),
  ('حكايةٌ تجاوزت الأسوار', 2),
  ('خلف كلّ إنجازٍ أُدباء صنعوه', 3),
  ('وما زالت الحكاية تُكتب', 4)
) as v(t, s)
where not exists (select 1 from public.announcements a where a.text = v.t);

commit;
