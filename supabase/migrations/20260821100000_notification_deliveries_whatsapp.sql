-- تسليمُ الإشعارات — الفصلُ بين الواقعة ووصولها (٢٠٢٦-٠٨-٢١).
--
-- الإنذار **واقعةٌ** تُكتب في `member_warnings`، وبلوغُه صاحبَه **حدثٌ آخر** له حظُّه من
-- النجاح والفشل: قد يُرسَل ويُسلَّم ويُقرأ، وقد تسقط القناةُ أو يكون الرقمُ ليس على
-- واتساب. فلو خُزّنت الحالتان في صفٍّ واحدٍ لصار عطبُ القناة يلوّث سجلَّ الموارد البشريّة.
--
-- ولذلك جدولٌ مستقلّ: صفٌّ لكلّ (إنذار، قناة). والقناةُ اليوم واتساب وحدها، والبريدُ
-- والإشعارُ الداخليّ محجوزان في القيد لا مبنيّان.
--
-- **ولا إرسالَ مرّتين**: `unique (warning_id, channel)` قفلٌ في القاعدة لا في الكود. ومن
-- أراد إعادةَ الإرسال أعادها على الصفّ نفسه، ولا يُقبل ذلك إلّا من حالٍ لم يصل فيها شيء
-- (`pending` أو `failed`) — فالمُسلَّمُ لا يُبعث ثانيةً بضغطةٍ ساهية.

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  -- صاحبُ الرسالة. لقطةٌ صريحةٌ وإن كانت تُشتقّ من الإنذار: القراءةُ والحراسةُ تسألان عنه.
  user_id uuid not null references public.profiles(id) on delete cascade,
  warning_id uuid not null references public.member_warnings(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email', 'in_app')),
  /*
    دورةُ الحياة: pending ← processing ← sent ← delivered ← read، وfailed من أيّها.
    و`processing` ليست زينةً: هي **المِطرقة** التي يدقّها المُرسِل قبل النداء الخارجيّ،
    فلا يدخل نداءان في الوقت نفسه (انظر المِطالبة في دالّة الحافة).
  */
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'delivered', 'read', 'failed')),
  -- من حمل الرسالة. `ycloud` اليوم، و`resend` للبريد إن فُعّل الرديف.
  provider text,
  /*
    معرّفُ الحامل للرسالة : `id` الذي تردّه YCloud لحظةَ القبول. به تُربط تحديثاتُ
    الـwebhook بصفّها، وهو المفتاحُ الأوّل.
  */
  provider_message_id text,
  /*
    معرّفُ واتساب نفسِه (`wamid.…`). **يتأخّر غالبًا**: تُدرِج YCloud في طابورها وتردّ
    `accepted` قبل أن يبلغ الرسالةَ معرّفٌ من واتساب، فيجيء مع أوّل حدثٍ في الـwebhook.
    ويُحفَظ لأنّه لسانُ التشخيص المشترك بيننا وبين YCloud وميتا في أيّ نزاع.
  */
  provider_wamid text,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  -- متى تجوز المحاولةُ التالية بعد عطلٍ عارض. والدائمُ لا موعدَ له (انظر `permanent`).
  next_attempt_at timestamptz,
  -- **الفرقُ بين عطلٍ يزول وعطلٍ لا يزول**: رقمٌ غير مسجَّلٍ في واتساب لا تُصلحه إعادة.
  permanent boolean not null default false,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_one_per_channel unique (warning_id, channel)
);

comment on table public.notification_deliveries is
  'تسليمُ الإشعارات: صفٌّ لكلّ (إنذار، قناة). لا يُكتب إلّا من الخادم (مفتاح الخدمة أو الدوالّ).';

create index if not exists notification_deliveries_user_idx
  on public.notification_deliveries (user_id, created_at desc);

-- الـwebhook يصل ومعه المعرّفُ وحده، فالبحثُ به هو المسارُ الساخن. وفهرسان لأنّ الربط
-- يقع بأيّهما حضر: معرّفُ الحامل أوّلًا، ومعرّفُ واتساب إن لم يُعرَف الأوّل.
create index if not exists notification_deliveries_provider_msg_idx
  on public.notification_deliveries (provider_message_id)
  where provider_message_id is not null;

create index if not exists notification_deliveries_provider_wamid_idx
  on public.notification_deliveries (provider_wamid)
  where provider_wamid is not null;

-- ما ينتظر محاولةً ثانية — كشفٌ صغيرٌ للشاشة ولأيّ كانسٍ يأتي لاحقًا
create index if not exists notification_deliveries_retryable_idx
  on public.notification_deliveries (next_attempt_at)
  where status in ('pending', 'failed') and not permanent;

create or replace function public.notification_deliveries_touch()
 returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists notification_deliveries_touch on public.notification_deliveries;
create trigger notification_deliveries_touch
  before update on public.notification_deliveries
  for each row execute function public.notification_deliveries_touch();

/* ── الحراسة ──────────────────────────────────────────────────────────────
   القراءةُ بحَكَم الإنذارات نفسِه (`can_view_warnings_of`): من يرى الإنذار يرى مصيرَ
   رسالته، ولا حَكَمَ ثانٍ يفترق عن الأوّل. والكتابةُ ممنوعةٌ من المتصفّح بتاتًا: الكاتبُ
   إمّا دالّةُ الطابور أدناه أو دالّةُ الحافة بمفتاح الخدمة. */

alter table public.notification_deliveries enable row level security;

drop policy if exists notification_deliveries_select on public.notification_deliveries;
create policy notification_deliveries_select on public.notification_deliveries
  for select to authenticated
  using (public.can_view_warnings_of(auth.uid(), user_id));

revoke insert, update, delete on public.notification_deliveries from anon, authenticated;

/* ── بابُ الطابور ─────────────────────────────────────────────────────────
   يُنادى من الإجراء الخادميّ عقب تسجيل الإنذار. لا يُرسِل شيئًا: يفتح الصفّ `pending`
   فحسب. **وسقوطُه لا يُسقط الإنذار** — الإنذارُ كُتب قبله وبقي، وهذا خبرُ قناةٍ لا أكثر. */

create or replace function public.queue_warning_notification(
  p_warning uuid, p_channel text default 'whatsapp'
) returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_user uuid;
  v_id uuid;
  v_status text;
begin
  if p_channel is null or p_channel not in ('whatsapp', 'email', 'in_app') then
    return jsonb_build_object('ok', false, 'code', 'BAD_CHANNEL', 'message', 'قناةٌ غير معروفة.');
  end if;

  select user_id into v_user from member_warnings where id = p_warning;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا الإنذار.');
  end if;

  -- `do nothing` لا `do update`: الصفُّ القائم حالةٌ حيّةٌ لا تُدهَس بطابورٍ جديد
  insert into notification_deliveries (user_id, warning_id, channel)
  values (v_user, p_warning, p_channel)
  on conflict (warning_id, channel) do nothing
  returning id into v_id;

  if v_id is null then
    select id, status into v_id, v_status
    from notification_deliveries where warning_id = p_warning and channel = p_channel;
    return jsonb_build_object('ok', true, 'id', v_id, 'status', v_status, 'created', false);
  end if;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'pending', 'created', true);
end;
$$;

revoke all on function public.queue_warning_notification(uuid, text) from public, anon, authenticated;

/* ── دلوُ الخطابات ────────────────────────────────────────────────────────
   خطابُ الإنذار **يُرسَم في المتصفّح** (`lib/paper.ts` يمسّ DOM، ولا رسّامَ خادميًّا في
   المشروع). فالمتصفّحُ الذي أصدر الإنذار يرفع صورتَه هنا، ثمّ يقرؤها الخادمُ برابطٍ
   موقَّعٍ قصيرِ الأجل تنزّله YCloud حين تُخرج الرسالة.

   والدلوُ **خاصّ**: خطابُ إنذارٍ ورقةٌ شخصيّة، لا تُترك على رابطٍ عامٍّ يُخمَّن. ولا سياسةَ
   واحدةً عليه، فلا يبلغه إلّا مفتاحُ الخدمة. */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('warning-letters', 'warning-letters', false, 5242880, array['image/png'])
on conflict (id) do nothing;

/* ── سياقُ الرسالة ────────────────────────────────────────────────────────
   ما تحتاجه دالّةُ الحافة عن إنذارٍ واحد، في نداءٍ واحد. ورتبةُ الإنذار **تُحسَب هنا**
   بالتعبير نفسِه الذي في `warnings_for_reader` — فهي مشتقّةٌ لا مخزّنة، ولا تُعاد كتابةُ
   حسابها في Deno فتفترق عن القاعدة.

   ولا يُنادى إلّا بمفتاح الخدمة: فيه جوّالُ العضو وبريدُه، ولا حَكَمَ فيه لأنّ لا إنسانَ
   خلفه. وسلطةُ الإنسان تُفحَص قبله في إجراء اللوحة (`can_issue_warning`). */

create or replace function public.warning_delivery_context(p_warning uuid)
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select jsonb_build_object(
    'id', w.id,
    'user_id', w.user_id,
    'status', w.status,
    'created_at', w.created_at,
    'category', w.category,
    'caused_termination', w.caused_termination,
    /*
      **قطعتا النداء من لقطة الإنذار لا من حال العضو اليوم** — كما في الخطاب سواءً
      (`role_at_issue` و`committee_id` مخزَّنان يومَ صدر). فلو انتقل صاحبُه بعده بقيت
      الرسالةُ صادقةً. والوصلُ بينهما ليس ههنا: تلك قاعدةُ `positionLine` وحدها.
    */
    'role_ar', ro.role_name_ar,
    'committee_name', c.committee_name_ar,
    'ordinal', (
      select count(*)::integer from member_warnings a
      where a.user_id = w.user_id and a.status = 'active' and a.created_at <= w.created_at
    ),
    'active_count', (
      select count(*)::integer from member_warnings a
      where a.user_id = w.user_id and a.status = 'active'
    ),
    'limit', warning_limit(),
    'member', jsonb_build_object(
      'full_name', p.full_name,
      'gender', p.gender,
      'phone', p.phone,
      'email', p.email,
      'account_status', p.account_status
    )
  )
  from member_warnings w
  join profiles p on p.id = w.user_id
  left join roles ro on ro.role_name = w.role_at_issue
  left join committees c on c.id = w.committee_id
  where w.id = p_warning;
$$;

revoke all on function public.warning_delivery_context(uuid) from public, anon, authenticated;

/* ── مِطالبةُ الصفّ ───────────────────────────────────────────────────────
   **هذا هو منعُ الإرسال المكرّر حقًّا**: عبارةُ `update` واحدةٌ ذرّيّة، فنداءان متزامنان
   لا يظفر بالصفّ منهما إلّا واحد. ولو فُحصت الحالةُ ثمّ كُتبت في نداءين لتخلّلهما زمنٌ
   يسع رسالتين.

   **و`processing` لا تُخلَّد**: لو مات نداءٌ بعد المِطالبة وقبل النداء الخارجيّ لبقي الصفُّ
   مطالَبًا أبدًا فلا يُرسَل ولا يُعاد. فالمطالَبُ منذ `p_stale_minutes` يُعَدّ متروكًا
   ويُطالَب من جديد. والعشرُ دقائق سعةٌ لأطول نداءٍ ممكن، وأقصرُ من صبر إنسان.

   ويردّ `claimed=false` مع الحالة الراهنة حين يكون الخبرُ قد وصل فعلًا. */

create or replace function public.claim_notification_delivery(
  p_warning uuid, p_channel text default 'whatsapp', p_stale_minutes integer default 10
) returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  r notification_deliveries%rowtype;
  v_status text;
begin
  update notification_deliveries d
  set status = 'processing', provider = coalesce(d.provider, 'ycloud')
  where d.warning_id = p_warning
    and d.channel = p_channel
    and (
      d.status in ('pending', 'failed')
      or (d.status = 'processing' and d.updated_at < now() - make_interval(mins => p_stale_minutes))
    )
  returning d.* into r;

  if found then
    return jsonb_build_object('ok', true, 'claimed', true, 'id', r.id, 'attempt_count', r.attempt_count);
  end if;

  select id, status into r.id, v_status
  from notification_deliveries
  where warning_id = p_warning and channel = p_channel;

  return jsonb_build_object('ok', true, 'claimed', false, 'id', r.id, 'status', v_status);
end;
$$;

revoke all on function public.claim_notification_delivery(uuid, text, integer) from public, anon, authenticated;
