-- أنظمةُ أدِيب ٠٤ (٢٠٢٦-١٠-١٣): غرفةُ التحرير — موافقةُ الرئيسين والنشرُ الذرّيّ
--
-- ⚠️ ينتظر كلمة المالك. ويليه في الكود `/dashboard/regulations`.
--
-- ## موافقةُ الرئيسين (الدستور م٦٨)
-- «فلا تُنشر نسخةٌ جديدة إلا بموافقتهما»: لكلّ مسودّةٍ موافقتان، واحدةٌ لكلّ مقعد (رئيس أدِيب والرئيس
-- التنفيذيّ)، ولا يُنشر ما لم تكتملا. والموافقةُ على نصٍّ بعينه: **أيُّ تعديلٍ في متن المسودّة يُسقط
-- موافقاتها** (المنبّه `regulation_versions_reset_approvals`)، فلا يُنشر نصٌّ لم يره الاثنان.
-- وموافقاتُ المنشورة سجلٌّ لا يتغيّر.
--
-- ## النشرُ ذرّيّ
-- `publish_regulation_version` ينشر المسودّةَ ومعها **الإصداراتِ التبعيّة**: إذا تغيّرت أرقامُ موادّ
-- الوثيقة (مادّةٌ أُضيفت أو حُذفت) صدر لكلّ وثيقةٍ تُحيل إليها إصدارٌ بالأرقام المصحّحة وحدها، بتاريخ
-- النفاذ نفسِه، في معاملةٍ واحدة. والمتنُ المنشور متنُ المسودّة التي وافق عليها الاثنان بعينه، يُنزع
-- منه `from` (مرساةُ الترقيم أثناء التحرير) في القاعدة لا في الخادم.
-- والدالّةُ لمفتاح الخدمة وحده: الخادمُ يتحقّق من القدرة عند الباب، وهي تتحقّق من الموافقات.

begin;

-- ═══ (١) الموافقات ═════════════════════════════════════════════════════════
create table if not exists public.regulation_version_approvals (
  version_id   uuid not null references public.regulation_versions(id) on delete cascade,
  role_name    text not null check (role_name in ('club_president', 'executive_council_president')),
  user_id      uuid references auth.users(id) on delete set null,
  approved_at  timestamptz not null default now(),
  primary key (version_id, role_name)
);

comment on table public.regulation_version_approvals is
  'موافقةُ كلّ رئيسٍ على مسودّة نسخةٍ من الأنظمة (الدستور م٦٨). تسقط بتعديل المتن، وتتجمّد بالنشر.';

create or replace function public.regulation_approvals_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- حذفُ حساب الموافِق يُفرغ `user_id` بفعل المفتاح الأجنبيّ، ولا شيءَ غيرُه.
  if tg_op = 'UPDATE'
     and new.user_id is null
     and (new.version_id, new.role_name, new.approved_at) is not distinct from (old.version_id, old.role_name, old.approved_at)
  then
    return new;
  end if;
  if exists (
    select 1 from public.regulation_versions v
    where v.id = coalesce(new.version_id, old.version_id) and v.status = 'published'
  ) then
    raise exception 'موافقاتُ النسخة المنشورة لا تتغيّر' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger regulation_approvals_guard
  before insert or update or delete on public.regulation_version_approvals
  for each row execute function public.regulation_approvals_guard();

-- ═══ (٢) التعديلُ يُسقط الموافقات ═══════════════════════════════════════════
create or replace function public.regulation_versions_reset_approvals()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'draft' and new.status = 'draft' and new.body is distinct from old.body then
    delete from public.regulation_version_approvals where version_id = new.id;
  end if;
  return null;
end;
$$;

create trigger regulation_versions_reset_approvals
  after update on public.regulation_versions
  for each row execute function public.regulation_versions_reset_approvals();

-- ═══ (٣) المتنُ بلا مرساة الترقيم ════════════════════════════════════════════
create or replace function public.regulation_body_clean(p_body jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_set(ch, '{articles}', (
      select coalesce(jsonb_agg(a - 'from' order by ai), '[]'::jsonb)
      from jsonb_array_elements(ch->'articles') with ordinality as t(a, ai)
    ))
    order by ci
  ), '[]'::jsonb)
  from jsonb_array_elements(p_body) with ordinality as c(ch, ci);
$$;

-- ═══ (٤) النشر ════════════════════════════════════════════════════════════
-- `p_followups`: [{ "regulation_id": n, "body": <المتن المنشور الجديد> | null, "draft_body": <متن مسودّتها> | null,
--                   "change_note": "…" }] — يحسبها الخادمُ بمحلّل الإحالات. و`body` الفارغ: لا إصدارَ تبعيّ،
--                   تُصحَّح المسودّةُ وحدها.
create or replace function public.publish_regulation_version(
  p_version_id     uuid,
  p_effective_from date,
  p_change_note    text,
  p_approval_note  text,
  p_actor          uuid,
  p_followups      jsonb default '[]'::jsonb
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v       public.regulation_versions%rowtype;
  f       jsonb;
  rid     smallint;
  next_no integer;
  today   date := (now() at time zone 'Asia/Riyadh')::date;
begin
  select * into v from public.regulation_versions where id = p_version_id for update;
  if not found or v.status <> 'draft' then
    raise exception 'NOT_DRAFT' using errcode = 'P0001';
  end if;
  if (select count(*) from public.regulation_version_approvals where version_id = v.id) < 2 then
    raise exception 'NEEDS_APPROVALS' using errcode = 'P0001';
  end if;
  if p_effective_from is null or p_effective_from < today then
    raise exception 'PAST_EFFECTIVE' using errcode = 'P0001';
  end if;
  if jsonb_array_length(v.body) = 0 then
    raise exception 'EMPTY_BODY' using errcode = 'P0001';
  end if;

  -- الإصداراتُ التبعيّة: مسودّةُ الوثيقة إن وُجدت تتأخّر رقمًا وتأخذ الأرقامَ المصحّحة، ثمّ يُنشر
  -- إصدارُها الجديد برقم ما بعد آخر منشور.
  for f in select * from jsonb_array_elements(coalesce(p_followups, '[]'::jsonb)) loop
    rid := (f->>'regulation_id')::smallint;
    if rid = v.regulation_id then
      raise exception 'FOLLOWUP_SELF' using errcode = 'P0001';
    end if;
    perform 1 from public.regulation_versions where regulation_id = rid for update;
    if coalesce(f->'body', 'null'::jsonb) <> 'null'::jsonb then
      select coalesce(max(version_no), 0) + 1 into next_no
        from public.regulation_versions where regulation_id = rid and status = 'published';
      update public.regulation_versions set version_no = version_no + 1
       where regulation_id = rid and status = 'draft';
      insert into public.regulation_versions
        (regulation_id, version_no, status, effective_from, change_note, body, published_by)
      values
        (rid, next_no, 'published', p_effective_from, f->>'change_note', f->'body', p_actor);
    end if;
    -- ومسودّتُها، إن كانت، تأخذ الأرقامَ المصحّحة وإن لم يتغيّر منشورُها.
    if coalesce(f->'draft_body', 'null'::jsonb) <> 'null'::jsonb then
      update public.regulation_versions set body = f->'draft_body'
       where regulation_id = rid and status = 'draft';
    end if;
  end loop;

  update public.regulation_versions
     set status = 'published',
         effective_from = p_effective_from,
         change_note = p_change_note,
         approval_note = nullif(btrim(coalesce(p_approval_note, '')), ''),
         published_by = p_actor,
         body = public.regulation_body_clean(v.body)
   where id = v.id;

  return v.version_no;
end;
$$;

-- ═══ (٥) الحراسة ═════════════════════════════════════════════════════════════
alter table public.regulation_version_approvals enable row level security;
revoke all on public.regulation_version_approvals from anon, authenticated;
revoke all on function public.publish_regulation_version(uuid, date, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.regulation_approvals_guard() from public, anon, authenticated;
revoke all on function public.regulation_versions_reset_approvals() from public, anon, authenticated;
grant execute on function public.publish_regulation_version(uuid, date, text, text, uuid, jsonb) to service_role;

commit;
