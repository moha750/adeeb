-- ═══════════════════════════════════════════════════════════════════════════
-- «عِرفان» ٢ (٢٠٢٦-١٠-١٧) — **الرسالةُ تصل القائدَ في واتساب**، ومعها صورةُ بطاقتها.
--
-- العلّةُ بكلمة المالك: تطبيقُ أدِيب على الجوّال لم يُعلَن بعد، فإشعارُ شاشة القفل لا يصل أحدًا
-- تقريبًا. فبعد الحفظ تُفتح محادثةُ القائد في واتساب برسالةٍ جاهزةٍ يرسلها العضوُ بيده، وأرقامُ
-- القادة ليست سرًّا («كلّ أرقام القادة معلومة من الأساس»).
--
-- ورابطُ واتساب يحمل نصًّا لا صورة. فلكلّ رسالةٍ **رابطٌ عامٌّ برمزٍ لا يُخمَّن** (`/irfan/<رمز>`)،
-- صفحتُه تعلن صورةَ البطاقة (Open Graph) فيعرضها واتساب فوق الرسالة. والصورةُ يرسمها متصفّحُ
-- المرسل ويرفعها إلى `images/irfan/<رمز>.jpg` (الرسمُ على الخادم يتعثّر في وصل العربيّة).
--
-- والرقمُ لا يُعطى في قائمة القادة: يُردّ في جواب `send_irfan` لمن أرسل لصاحبه فحسب.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.irfan_messages
  add column share_token text not null default replace(gen_random_uuid()::text, '-', '');
alter table public.irfan_messages
  add constraint irfan_messages_share_token_key unique (share_token);
comment on column public.irfan_messages.share_token is
  'رمزُ الرابط العامّ للبطاقة (`/irfan/<رمز>`): ١٢٢ بتًّا عشوائيًّا. من ملكه رأى البطاقة، والرسالةُ تمرّ في واتساب أصلًا.';

create or replace function public.send_irfan(p_recipient uuid, p_body text, p_look text default 'letter')
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_self uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_season record;
  v_leader record;
  v_sender_name text;
  v_id bigint;
  v_token text;
  v_phone text;
begin
  if v_self is null or not public.is_adeeb_member(v_self) then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER');
  end if;
  select * into v_season from public.irfan_open_season();
  if v_season.id is null then
    return jsonb_build_object('ok', false, 'code', 'CLOSED');
  end if;
  if p_recipient = v_self then
    return jsonb_build_object('ok', false, 'code', 'SELF');
  end if;
  select * into v_leader from public.irfan_leaders() l where l.user_id = p_recipient;
  if v_leader.user_id is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_LEADER');
  end if;
  if char_length(v_body) < 40 or char_length(v_body) > 500 then
    return jsonb_build_object('ok', false, 'code', 'LENGTH');
  end if;
  if coalesce(p_look, '') not in ('letter', 'aurora') then
    return jsonb_build_object('ok', false, 'code', 'LOOK');
  end if;
  if exists (
    select 1 from public.irfan_messages m
    where m.season_id = v_season.id and m.sender_id = v_self and m.recipient_id = p_recipient
  ) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY');
  end if;

  select p.full_name into v_sender_name from public.profiles p where p.id = v_self;
  select nullif(btrim(p.phone), '') into v_phone from public.profiles p where p.id = p_recipient;

  insert into public.irfan_messages (
    season_id, sender_id, recipient_id, sender_name, recipient_name, recipient_gender,
    role_name, unit_name, council_type, body, look
  ) values (
    v_season.id, v_self, p_recipient, coalesce(v_sender_name, ''), coalesce(v_leader.full_name, ''),
    v_leader.gender, v_leader.role_name, v_leader.unit_name, v_leader.council_type, v_body, p_look
  ) returning id, share_token into v_id, v_token;

  -- الإشعارُ والرسالةُ ينجحان معًا أو يسقطان معًا (NOTIFICATIONS-SYSTEM §٣أ)
  perform public.notify_event(
    'irfan.received',
    jsonb_build_object('messageId', v_id, 'recipientId', p_recipient, 'senderName', v_sender_name, 'season', v_season.title),
    v_self
  );
  -- الرمزُ لرابط البطاقة، والرقمُ لمحادثة واتساب: لمن أرسل وحده، ولا يُحفظ في الرسالة
  return jsonb_build_object('ok', true, 'id', v_id, 'token', v_token, 'phone', v_phone);
end;
$$;
grant execute on function public.send_irfan(uuid, text, text) to authenticated;
