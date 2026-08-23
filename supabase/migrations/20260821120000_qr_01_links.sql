-- الباركود — الرمزُ الذي يُعدَّل ويُعَدّ (م٠)
--
-- ⚠️ مكتوبٌ ينتظر إذن المالك. لا يُنفَّذ إلّا بكلمته (قاعدةُ DDL).
--
-- ## لماذا جدولٌ أصلًا
-- مولّدُ الباركود أداةٌ بلا ذاكرة: الرابطُ محفورٌ في مصفوفة الرمز، فالمسحُ يقع بين
-- كاميرا الزائر والموقعِ المقصود ولا يمرّ بخادمنا. ومن ذلك ثلاثةُ عجزٍ في آن: لا
-- تعديلَ بعد الطباعة، ولا عدَّ مسحات، ولا تغييرَ وجهة. وعلاجُها واحدٌ: أن يحمل الرمزُ
-- **رابطَنا** لا رابطَ الوجهة، فتصير الوجهةُ صفًّا يُعدَّل والمرورُ عندنا فيُعَدّ.
-- والملصقُ المطبوعُ لا يتغيّر أبدًا.
--
-- ## والمدى في القاعدة لا في الشاشة
-- قرارُ المالك ٢٠٢٦-٠٨-٢١: **كلٌّ يرى رموزَه هو**. فسياساتُ own-row تحكم، والغرفةُ
-- تقرأ وتكتب بعميل الجلسة لا بمفتاح الخدمة — وإلّا كانت السياساتُ زينةً تتجاوزها.
-- ومفتاحُ الخدمة لا يظهر إلّا في مسار المسح العلنيّ: كاتبُه مجهولٌ لا سياسةَ إدراجٍ له.
--
-- ## ولا عنوانَ IP خامًا
-- البصمةُ `sha256(ip‖salt‖تاريخُ اليوم)` تُحسَب في التطبيق على درس ديبو: تدور كلّ يوم،
-- فتكفي لتمييز زائرَين اليوم ولا تصلح لوصلِ أمسِ باليوم بشخصٍ واحد. أي أنّ السجلّ
-- يحفظ **كم مُسح** ولا يحفظ **من مَسَح**.

begin;

-- ═══ (١) الروابط ════════════════════════════════════════════════════════════
-- القدرةُ قائمةٌ منذ بناء المولّد (`use_qr_generator`, فئة `tools`) فلا تُنشأ هنا.
create table if not exists public.qr_links (
  id            uuid primary key default gen_random_uuid(),
  -- الرمزُ في الرابط `/q/<code>`. سبعةُ محارفَ من أبجديّةٍ **بلا ملتبِس** (لا 0/o ولا 1/l):
  -- الرمزُ يُقرأ بالعين ويُملى بالصوت أحيانًا، والالتباسُ فيه عطبٌ لا ذوق.
  code          text not null unique
                check (code ~ '^[2-9abcdefghjkmnpqrstuvwxyz]{7}$'),
  title         text not null check (length(btrim(title)) between 1 and 120),
  -- **لا تحويلَ مفتوح**: البروتوكولان وحدهما. والتصديقُ هنا شبكةُ أمانٍ أخيرة —
  -- الخادمُ يصدّق قبلها، والقيدُ يمنع ما يفلت.
  target_url    text not null check (target_url ~* '^https?://[^[:space:]]+$'),
  -- وصفةُ الرسم (`QrSpec`) كما هي، بشعارِها المضمَّن. مكتفيةٌ بنفسها عمدًا: تُعيد رسمَ
  -- الرمز حرفًا بحرف بعد شهور، ورابطُ شعارٍ خارجيّ يُلوّث الـcanvas فيمنع تصدير PNG.
  spec          jsonb not null default '{}'::jsonb,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  -- الإيقافُ لا الحذف: الملصقُ مطبوعٌ في الشارع، وإيقافُه يُبقي الأثرَ ويردّ القاصد.
  active        boolean not null default true,
  -- عدّادٌ محفوظٌ لأجل القائمة وحدها — الحقيقةُ في `qr_scans`، وهذا مجموعُها المُسرَّع.
  scan_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists qr_links_owner_idx on public.qr_links (owner_id, created_at desc);

-- ═══ (٢) المسحات ═══════════════════════════════════════════════════════════
create table if not exists public.qr_scans (
  id          bigint generated always as identity primary key,
  link_id     uuid not null references public.qr_links(id) on delete cascade,
  scanned_at  timestamptz not null default now(),
  -- البصمةُ الدائرة — انظر رأس الملفّ. تُقبل NULL حين يعجز الخادمُ عن قراءة العنوان.
  visitor     text,
  referrer    text,
  device      text check (device in ('mobile', 'tablet', 'desktop', 'unknown')),
  -- معاينةُ الروابط في واتساب وتويتر تفتح الرابطَ فتنفخ العدّاد. تُوسَم ولا تُعرَض،
  -- ولا تُحذف: الوسمُ يخطئ أحيانًا، والصفُّ المحفوظ يُراجَع والمحذوفُ لا يعود.
  is_bot      boolean not null default false
);

create index if not exists qr_scans_link_idx on public.qr_scans (link_id, scanned_at desc);

-- ═══ (٣) السياسات ══════════════════════════════════════════════════════════
alter table public.qr_links enable row level security;
alter table public.qr_scans enable row level security;

-- المِلكيّةُ **والقدرةُ** معًا: من نُزعت عنه القدرةُ لا يبقى له بابٌ خلفيّ إلى صفوفه.
drop policy if exists qr_links_own on public.qr_links;
create policy qr_links_own on public.qr_links
  for all to authenticated
  using (owner_id = auth.uid() and public.check_user_permission(auth.uid(), 'use_qr_generator'))
  with check (owner_id = auth.uid() and public.check_user_permission(auth.uid(), 'use_qr_generator'));

drop policy if exists qr_scans_own_read on public.qr_scans;
create policy qr_scans_own_read on public.qr_scans
  for select to authenticated
  using (exists (
    select 1 from public.qr_links l
    where l.id = qr_scans.link_id
      and l.owner_id = auth.uid()
      and public.check_user_permission(auth.uid(), 'use_qr_generator')
  ));

-- والمنحُ صريحٌ لا مفهوم: سياسةٌ سليمةٌ بلا امتيازٍ على الجدول تُردّ بـ403 قبل النظر
-- في الصفّ (درسُ `profiles`). ولا امتيازَ إدراجٍ على `qr_scans` لأحد: الدالّةُ وحدها تكتب.
grant select, insert, update, delete on public.qr_links to authenticated;
grant select on public.qr_scans to authenticated;

-- ═══ (٤) التحويلُ والعدُّ فعلٌ واحد ══════════════════════════════════════════
-- نداءٌ واحدٌ لا ثلاثة (اقرأ ← أدرِج ← زِد): المسحُ في طريق الزائر، وكلُّ ذهابٍ وإيابٍ
-- تأخيرٌ يراه. والزيادةُ في SQL ذرّيّةٌ بلا قفل — مسحتان معًا لا تكتبان القيمةَ نفسَها.
create or replace function public.qr_resolve(
  p_code     text,
  p_visitor  text default null,
  p_referrer text default null,
  p_device   text default null,
  p_is_bot   boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid;
  v_target text;
begin
  select id, target_url into v_id, v_target
  from public.qr_links
  where code = p_code and active
  limit 1;

  if v_id is null then
    return null;  -- المسارُ يعرض «رمزٌ غير معروف» ولا يفرّق بين معدومٍ وموقوف
  end if;

  insert into public.qr_scans (link_id, visitor, referrer, device, is_bot)
  values (v_id, p_visitor, left(p_referrer, 500), coalesce(p_device, 'unknown'), coalesce(p_is_bot, false));

  -- الآلةُ لا تُعَدّ في الرقم الظاهر، وصفُّها محفوظٌ على كلّ حال.
  if not coalesce(p_is_bot, false) then
    update public.qr_links set scan_count = scan_count + 1 where id = v_id;
  end if;

  return v_target;
end;
$$;

revoke all on function public.qr_resolve(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.qr_resolve(text, text, text, text, boolean) to service_role;

commit;
