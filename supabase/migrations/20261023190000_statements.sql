-- ═══════════════════════════════════════════════════════════════════════════
-- البيانات الرسميّة (٢٠٢٦-١٠-٢٣، قرار محمد)
--
-- كانت بيانات أدِيب (تكليف، تعيين، تعميم…) تُصمَّم في الفوتوشوب على قالبٍ ثابت وتُنشر في الجروبات.
-- صارت غرفةً في بوّابة أدِيب للرئيسين: عنوانٌ ومتنٌ وتوقيع (رئيس أدِيب، أو الرئيس التنفيذيّ، أو
-- كلاهما) والختمُ دائمًا، فتُرسَم على القالب في المتصفّح وتُنزَّل PNG (صفحةً) أو PDF (صفحات).
--
-- قراراتُ المالك:
--  · القالبُ ثابت، والعنوانُ يتغيّر بحسب البيان.
--  · تنزيلٌ يُنشر في الجروبات الآن؛ والنشرُ في الموقع وإشعارُ الأعضاء لاحقًا.
--  · البيانُ المشترك يصدره أحدُ الرئيسين بلا موافقة الآخر في المنصّة (متّفقٌ عليه قبلها).
--
-- وكلُّ بيانٍ يُحفظ **سجلًّا** برقمه في سنته (2026/7) ومُصدِره ووقته، ويُعاد تنزيلُه منه مطابقًا:
-- يُحفظ ما يُرسَم (العنوان والمتن والتوقيع واسما الموقّعَين ومسمّياهما) لا الصورة.
--
-- والتوقيعان والختم **في دلوٍ خاصّ** (`statement-assets`) لا يقرؤه إلّا مفتاحُ الخدمة، ويصل
-- المتصفّحَ من بابٍ يقفله `issue_statements` — لا من ملفّات الموقع العامّة، فلا يُنزَّل توقيعٌ
-- يُزوَّر به بيان.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ═══ (١) الجدول ═════════════════════════════════════════════════════════════
create table public.statements (
  id            bigint generated always as identity primary key,
  year          integer not null,
  seq           integer not null,
  title         text not null check (char_length(btrim(title)) between 2 and 60),
  body          text not null check (char_length(btrim(body)) between 2 and 8000),
  signers       text not null check (signers in ('president', 'ceo', 'both')),
  signer_names  jsonb not null default '{}'::jsonb,
  pages         integer not null default 1 check (pages between 1 and 20),
  issued_by     uuid references public.profiles(id) on delete set null,
  issued_at     timestamptz not null default now(),
  unique (year, seq)
);
comment on table public.statements is
  'البيانات الرسميّة: سجلُّ ما أصدره الرئيسان برقمه في سنته، ويُعاد رسمُه منه مطابقًا.';
alter table public.statements enable row level security;
revoke all on public.statements from anon, authenticated;

-- ═══ (٢) القدرة: للرئيسين ═══════════════════════════════════════════════════
insert into public.permissions (permission_key, permission_name_ar, description, category)
select 'issue_statements', 'إصدار البيانات',
       'البيانات الرسميّة (تكليف، تعيين، تعميم…) على قالب أدِيب، في /dashboard/statements', 'website'
where not exists (select 1 from public.permissions p where p.permission_key = 'issue_statements');

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from (values ('club_president'), ('executive_council_president')) as r(role_name)
join public.permissions p on p.permission_key = 'issue_statements'
where not exists (
  select 1 from public.role_permissions x
  where x.role_name = r.role_name and x.permission_id = p.id
);

-- ═══ (٣) الإصدار: رقمٌ في السنة بلا تسابق ══════════════════════════════════════
create or replace function public.issue_statement(
  p_actor uuid, p_title text, p_body text, p_signers text, p_signer_names jsonb, p_pages integer
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_year integer := extract(year from (now() at time zone 'Asia/Riyadh'))::integer;
  v_seq  integer;
  v_id   bigint;
begin
  if not exists (select 1 from get_user_permissions(p_actor) g where g.permission_key = 'issue_statements') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'إصدارُ البيانات للرئيسين وحدهما.');
  end if;
  p_title := btrim(coalesce(p_title, ''));
  p_body := btrim(coalesce(p_body, ''));
  if char_length(p_title) < 2 or char_length(p_title) > 60 then
    return jsonb_build_object('ok', false, 'code', 'TITLE', 'message', 'العنوان بين حرفين وستّين حرفًا.');
  end if;
  if char_length(p_body) < 2 or char_length(p_body) > 8000 then
    return jsonb_build_object('ok', false, 'code', 'BODY', 'message', 'المتن فارغ أو أطول ممّا يُكتب في بيان.');
  end if;
  if p_signers not in ('president', 'ceo', 'both') then
    return jsonb_build_object('ok', false, 'code', 'SIGNERS', 'message', 'اختر من يوقّع البيان.');
  end if;

  -- الرقمُ التالي في السنة: قفلٌ للسنة فلا يأخذ بيانان رقمًا واحدًا
  perform pg_advisory_xact_lock(hashtext('statements.seq'), v_year);
  select coalesce(max(s.seq), 0) + 1 into v_seq from statements s where s.year = v_year;

  insert into statements (year, seq, title, body, signers, signer_names, pages, issued_by)
  values (v_year, v_seq, p_title, p_body, p_signers, coalesce(p_signer_names, '{}'::jsonb),
          greatest(1, least(20, coalesce(p_pages, 1))), p_actor)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'year', v_year, 'seq', v_seq);
end;
$function$;

revoke all on function public.issue_statement(uuid, text, text, text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.issue_statement(uuid, text, text, text, jsonb, integer) to service_role;

-- ═══ (٤) دلوُ التوقيعين والختم: خاصّ ═════════════════════════════════════════
-- لا سياسةَ قراءةٍ ولا كتابة: لا يبلغه إلّا مفتاحُ الخدمة، وبابُه في الموقع مقفولٌ بالقدرة.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('statement-assets', 'statement-assets', false, 5242880, array['image/png'])
on conflict (id) do nothing;

commit;
