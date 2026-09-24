-- «ركضة وطن» — رمزُ الاسترجاع: اسمُك من متصفّحٍ آخر بلا حسابٍ ولا رقمِ جوّال
--
-- **طُبِّق ٢٠٢٦-٠٩-٢٤** (النسخةُ في السجلّ الحيّ 20260924141725) بإقرار المالك («نعم» على رمز الاسترجاع
-- قبل النشر). وما طُبِّق هذا النصُّ نفسُه بلا ترويسته وبلا begin/commit.
--
-- ## العلّة
-- اللاعبُ رمزٌ في **متصفّحه** لا في جوّاله. والإعلانُ عن اللعبة بمنشور، ومن ضغط الرابطَ
-- في إنستقرام أو إكس أو سناب فتحه في متصفّح التطبيق، وهو منفصلٌ عن سفاري. فمن لعب هناك
-- ثمّ فتح اللعبةَ من سفاري صار لاعبًا جديدًا، واسمُه الأوّل محجوزٌ باسمه ولا يصل إليه.
--
-- ## الحلّ: رمزٌ من عشرة أرقام
-- يُعطى عند التسجيل، ومن أدخله في متصفّحٍ آخر **انتقل إليه اسمُه ونتائجُه**. أرقامٌ لا
-- حروف: لوحةُ الأرقام تفتح في كلّ جوّالٍ بلا تبديل لغة. والقاعدةُ لا ترى الرمزَ بل بصمتَه
-- (`sha256("wr" ‖ الرمز ‖ الملح)`)، كرمز الجهاز تمامًا.
--
-- **والانتقالُ لا النسخ:** يتبدّل رمزُ الجهاز في صفّ اللاعب، فالمتصفّحُ الأوّل يخرج منه.
-- جدولُ أجهزةٍ يُبقي الاثنين أثقلُ ممّا تحتاجه لعبةُ موسم، وفي الانتقال فائدة: من أخذ رمزَ
-- غيره أخرجه، فيُرى ذلك ولا يخفى، وصاحبُه يستردّه بالرمز نفسِه.
--
-- ## والتخمين محدود
-- عشرةُ أرقامٍ عشرةُ آلاف مليون احتمال، ومع ذلك تُعَدّ المحاولاتُ الخاطئةُ لكلّ زائرٍ
-- (بصمتُه اليوميّة `lib/visitor`): عشرون في الساعة. وقاعةٌ على شبكة الجامعة لا تبلغها،
-- فالمحاولةُ الصحيحةُ لا تُعَدّ أصلًا.

begin;

alter table public.watan_players
  add column if not exists recovery_hash text unique check (recovery_hash ~ '^[0-9a-f]{64}$');

create table if not exists public.watan_restore_tries (
  fp  text not null,
  at  timestamptz not null default now()
);
create index if not exists watan_restore_tries_idx on public.watan_restore_tries (fp, at desc);

alter table public.watan_restore_tries enable row level security;
revoke all on public.watan_restore_tries from public, anon, authenticated;

-- التسجيلُ يأخذ بصمةَ الرمز لمن يولد، ويخبر أهو جديدٌ ليُعرَض رمزُه مرّةً.
drop function if exists public.watan_register(text, text, text);
create or replace function public.watan_register(
  p_token_hash text, p_nickname text, p_key text, p_recovery_hash text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  update watan_players
     set nickname = p_nickname, nickname_key = p_key, last_seen_at = now()
   where token_hash = p_token_hash
  returning id into v_id;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'created', false);
  end if;
  insert into watan_players (nickname, nickname_key, token_hash, recovery_hash)
  values (p_nickname, p_key, p_token_hash, p_recovery_hash)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'created', true);
exception when unique_violation then
  raise exception 'watan_name_taken';
end $$;

-- رمزٌ جديدٌ لمن فقد رمزَه وما زال في متصفّحه (والقديمُ يسقط).
create or replace function public.watan_set_code(p_token_hash text, p_recovery_hash text)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  update watan_players set recovery_hash = p_recovery_hash where token_hash = p_token_hash;
  return found;
end $$;

-- الاسترجاع: ينقل اللاعبَ إلى رمز هذا المتصفّح، أو يعدّ محاولةً خاطئة.
create or replace function public.watan_restore(p_recovery_hash text, p_token_hash text, p_fp text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_n integer; v_name text;
begin
  delete from watan_restore_tries where at < now() - interval '1 day';
  select count(*) into v_n from watan_restore_tries
   where fp = p_fp and at > now() - interval '1 hour';
  if v_n >= 20 then return jsonb_build_object('status', 'slow'); end if;

  update watan_players
     set token_hash = p_token_hash, last_seen_at = now()
   where recovery_hash = p_recovery_hash
  returning nickname into v_name;

  if v_name is null then
    insert into watan_restore_tries (fp) values (p_fp);
    return jsonb_build_object('status', 'wrong');
  end if;
  return jsonb_build_object('status', 'ok', 'name', v_name);
end $$;

revoke execute on function
  public.watan_register(text, text, text, text),
  public.watan_set_code(text, text),
  public.watan_restore(text, text, text)
from public, anon, authenticated;

grant execute on function
  public.watan_register(text, text, text, text),
  public.watan_set_code(text, text),
  public.watan_restore(text, text, text)
to service_role;

commit;
