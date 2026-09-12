-- تنبيهُ تبديل الوجهة: السجلُّ يصير حارسًا لا دفترًا (م٩)
--
-- ## العلّة
-- سجلُّ الوقائع (م١) يقيّد كلَّ تبديل وجهةٍ في لحظته، لكنّه **دفترٌ لا يقرؤه أحدٌ كلَّ صباح**.
-- فحسابٌ يُخترَق يحوّل ملصقًا مطبوعًا إلى صفحةِ تصيّدٍ تحمل رابطنا، ويبقى الأمرُ مكتوبًا
-- ولا يُرى حتّى يشتكي زائر. والفرقُ بين الدفتر والحارس أنّ الحارسَ **ينادي**.
--
-- ## والتصميم: صندوقُ صادرٍ لا إرسالٌ في المحفّز
-- المحفّزُ لا يُرسل بريدًا: نداءُ شبكةٍ داخل معاملةٍ يعلّق الكتابةَ إن تأخّر الطرفُ الآخر،
-- وفشلُه يُسقط تبديلَ الوجهة نفسَه. فيُكتَب **صفُّ صادرٍ** في الجدول، ويستنزفه لاحقًا
-- منفذٌ في التطبيق بمفتاح الخدمة (`‎/api/qr-alerts/drain`).
--
-- · **والصفُّ يبقى بعد الإرسال**: يُقرأ منه «هل نُبِّهنا؟» و«متى؟»، وهو سؤالٌ أمنيّ.
-- · **ولا يُنبَّه إلّا تبديلُ الوجهة**: الاسمُ والتصميمُ والإيقافُ وقائعُ تُراجَع لا تُوقظ.

begin;

create table if not exists public.qr_alert_outbox (
  id         bigint generated always as identity primary key,
  event_id   bigint not null references public.qr_link_events(id) on delete cascade,
  link_id    uuid not null,
  status     text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'off')),
  attempts   integer not null default 0,
  error      text,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);

create index if not exists qr_alert_outbox_pending_idx
  on public.qr_alert_outbox (created_at) where status = 'pending';

comment on table public.qr_alert_outbox is
  'صادرُ تنبيهات تبديل الوجهة. يكتبه محفّزُ السجلّ، ويستنزفه منفذُ التطبيق بمفتاح الخدمة.';

create or replace function public.qr_enqueue_target_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'target' then
    insert into public.qr_alert_outbox (event_id, link_id) values (new.id, new.link_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_qr_enqueue_target_alert on public.qr_link_events;
create trigger trg_qr_enqueue_target_alert
  after insert on public.qr_link_events
  for each row execute function public.qr_enqueue_target_alert();

alter table public.qr_alert_outbox enable row level security;

-- يقرؤه المشرفُ ليعرف أنُبِّه أم لا. ولا كتابةَ لأحد: المحفّزُ يكتب، ومفتاحُ الخدمة يُحدّث.
drop policy if exists qr_alerts_oversight_read on public.qr_alert_outbox;
create policy qr_alerts_oversight_read on public.qr_alert_outbox
  for select to authenticated
  using (public.check_user_permission(auth.uid(), 'oversee_qr'));

grant select on public.qr_alert_outbox to authenticated;

commit;
