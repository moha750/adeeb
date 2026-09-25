-- «ركضة وطن» — التسجيلُ بلا رمز استرجاع (قرارُ المالك ٢٠٢٦-٠٩-٢٥: «يُزال رمز الاسترجاع بشكلٍ نهائيٍّ وجذريّ،
-- ونكتفي بإنشاء حسابٍ من أدِيب»). إضافةٌ لا حذف: الدالّةُ بأربعة معاملات تعيش بجانب القديمة ذات الخمسة
-- حتّى ينزل الموقعُ الذي يناديها، ثمّ يُحذف القديمُ ومعه الرمزُ كلُّه في `watan_05b`.
-- ✅ مطبَّقٌ على الإنتاج بهذه النسخة (20260925132617).
create or replace function public.watan_register(p_token_hash text, p_user uuid, p_nickname text, p_key text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  v_id := watan_pid(p_token_hash, p_user);
  if v_id is not null then
    update watan_players set nickname = p_nickname, nickname_key = p_key, last_seen_at = now()
     where id = v_id;
    return jsonb_build_object('id', v_id, 'created', false);
  end if;
  insert into watan_players (nickname, nickname_key, token_hash, user_id)
  values (p_nickname, p_key,
          case when p_user is not null and exists (select 1 from watan_players where token_hash = p_token_hash)
               then null else p_token_hash end,
          p_user)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'created', true);
exception when unique_violation then
  raise exception 'watan_name_taken';
end $$;

revoke execute on function public.watan_register(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.watan_register(text, uuid, text, text) to service_role;
