-- وجهةٌ بجدولٍ زمنيّ: الملصقُ نفسُه يوصّل إلى شيئين في وقتين (م٧)
--
-- ## العلّة
-- ملصقُ فعاليّةٍ يُطبَع مرّةً ويُلصَق في الجامعة: قبلها يجب أن يوصّل إلى **التسجيل**، وبعدها
-- إلى **الاستبيان**، وبعد أسبوعٍ إلى **الألبوم**. واليومَ يقتضي ذلك أن يقف أحدٌ عند الساعة
-- الثانية عشرة ليبدّل الوجهة بيده، وإن نام فاتت.
--
-- ## والتصميم: نوافذُ لا حقلٌ ثانٍ
-- لكلّ باركودٍ **نوافذُ** لها وجهةٌ وبدايةٌ ونهاية، وكلاهما اختياريّ:
-- · بلا بداية = من الأزل · بلا نهاية = إلى الأبد.
-- والمسحُ يختار **آخرَ نافذةٍ بدأت ولم تنتهِ**، فإن لم تكن فالوجهةُ الأصليّةُ في `qr_links`
-- هي الجواب. فالحقلُ الأصليُّ يبقى **الأصلَ لا استثناءً**: من لا يجدول لا يتغيّر عليه شيء.
--
-- ## وما لا يُفعَل
-- · لا تحويلَ مفتوح: قيدُ الوجهة نفسُه (`^https?://`) يحرس هذا الجدولَ كما يحرس الأصل.
-- · ولا كتابةَ عمياء من المتصفّح: امتيازٌ بالأعمدة، وسياسةُ own-row عبر الأب، والوجهةُ
--   تُصدَّق في الخادم قبل أن تصل (`checkTarget`).

begin;

create table if not exists public.qr_schedules (
  id         uuid primary key default gen_random_uuid(),
  link_id    uuid not null references public.qr_links(id) on delete cascade,
  target_url text not null check (target_url ~* '^https?://[^[:space:]]+$'),
  -- بلا بدايةٍ: سارٍ منذ الأزل. وبلا نهاية: إلى الأبد. والنهايةُ بعد البداية دائمًا.
  starts_at  timestamptz,
  ends_at    timestamptz,
  note       text check (note is null or length(btrim(note)) between 1 and 120),
  created_at timestamptz not null default now(),
  constraint qr_schedules_window check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index if not exists qr_schedules_link_idx on public.qr_schedules (link_id, starts_at desc);

alter table public.qr_schedules enable row level security;

-- المِلكيّةُ تُقرأ من الأب: نافذةُ باركودك لك، وغيرُها ليس لك.
drop policy if exists qr_schedules_own on public.qr_schedules;
create policy qr_schedules_own on public.qr_schedules
  for all to authenticated
  using (exists (
    select 1 from public.qr_links l
    where l.id = qr_schedules.link_id and l.owner_id = auth.uid()
      and public.check_user_permission(auth.uid(), 'use_qr_generator')
  ))
  with check (exists (
    select 1 from public.qr_links l
    where l.id = qr_schedules.link_id and l.owner_id = auth.uid()
      and public.check_user_permission(auth.uid(), 'use_qr_generator')
  ));

-- وعينُ الإشراف تقرأ الجداولَ كما تقرأ الوجهات: من يراقب وجهةَ ملصقٍ يراقب مواقيتَها.
drop policy if exists qr_schedules_oversight_read on public.qr_schedules;
create policy qr_schedules_oversight_read on public.qr_schedules
  for select to authenticated
  using (public.check_user_permission(auth.uid(), 'oversee_qr'));

grant select, insert, update, delete on public.qr_schedules to authenticated;

-- ═══ المسحُ يسأل الجدولَ أوّلًا ═══════════════════════════════════════════════
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
  v_id      uuid;
  v_target  text;
  v_window  text;
  v_recent  boolean := false;
begin
  select id, target_url into v_id, v_target
  from public.qr_links
  where code = p_code and active
  limit 1;

  if v_id is null then
    return null;  -- المسارُ يعرض «غير متاح» ولا يفرّق بين معدومٍ وموقوف
  end if;

  -- **آخرُ نافذةٍ بدأت ولم تنتهِ**: من جدول نافذتين متداخلتين فالأحدثُ بدايةً أولى، وهو
  -- ما يقوله الحدسُ (آخرُ ما قرّرتَه يغلب ما قبله). ومن لا نافذةَ له تبقى وجهتُه الأصليّة.
  select s.target_url into v_window
  from public.qr_schedules s
  where s.link_id = v_id
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now())
  order by coalesce(s.starts_at, '-infinity'::timestamptz) desc, s.created_at desc
  limit 1;

  if v_window is not null then
    v_target := v_window;
  end if;

  if p_visitor is not null then
    select exists (
      select 1 from public.qr_scans s
      where s.link_id = v_id
        and s.visitor = p_visitor
        and s.scanned_at > now() - interval '1 minute'
    ) into v_recent;
  end if;

  if not v_recent then
    insert into public.qr_scans (link_id, visitor, referrer, device, is_bot)
    values (v_id, p_visitor, left(p_referrer, 500), coalesce(p_device, 'unknown'), coalesce(p_is_bot, false));

    if not coalesce(p_is_bot, false) then
      update public.qr_links set scan_count = scan_count + 1 where id = v_id;
    end if;
  end if;

  return v_target;
end;
$$;

revoke all on function public.qr_resolve(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.qr_resolve(text, text, text, text, boolean) to service_role;

-- ═══ والجدولُ يُقيَّد كما تُقيَّد الوجهة ═══════════════════════════════════════
alter table public.qr_link_events drop constraint if exists qr_link_events_kind_check;
alter table public.qr_link_events add constraint qr_link_events_kind_check
  check (kind in ('target', 'title', 'active', 'spec', 'delete', 'owner', 'schedule'));

create or replace function public.qr_log_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (old.link_id, auth.uid(), 'schedule', old.target_url, null);
    return old;
  end if;
  insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
  values (new.link_id, auth.uid(), 'schedule',
          case when tg_op = 'UPDATE' then old.target_url else null end, new.target_url);
  return new;
end;
$$;

drop trigger if exists trg_qr_log_schedule on public.qr_schedules;
create trigger trg_qr_log_schedule
  after insert or update or delete on public.qr_schedules
  for each row execute function public.qr_log_schedule();

commit;
