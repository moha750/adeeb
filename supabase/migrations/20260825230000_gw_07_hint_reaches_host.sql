-- خمّن الكلمة — المعنى يبلغ المضيفَ وحدَه (م٠و)
-- طُبِّق ٢٠٢٦-٠٨-٢٥ بإذن المالك.
--
-- ## العلّة: حقلٌ يُكتَب ولا يُقرأ
-- بنكُ الكلمات يحمل `hint` — معنى الكلمة، مرجعُ المضيف حين يجيء الجوابُ بالمعنى لا
-- بالحرف. وكان يُكتَب ولا يصل أحدًا: `gw_create_session` تنسخ **النصّ وحدَه** إلى
-- `guess_word_words`، ولقطةُ المضيف تقرأ من المنسوخ. فالمضيفُ يحكم من ذاكرته،
-- والحقلُ حبرٌ في جدولٍ لا يُفتَح.
--
-- ## ولماذا لا يُنسَخ المعنى كما نُسخ النصّ
-- `guess_word_words` **مقروءٌ لـ`anon`** للكلمة الجارية، و**منشورٌ على realtime**.
-- فعمودُ معنًى فيه يُبَثّ إلى جوّال كلّ لاعبٍ مع الكلمة — أي أنّ الجوابَ يُسلَّم لمن
-- يُفترض أن يخمّنه. (وحراسةُ العمود لا تنفع: realtime يبثّ الصفَّ بحكم RLS لا بحكم
-- امتيازات الأعمدة — درسُ م٠أ نفسُه.)
--
-- فيُقرأ المعنى **في دالّة المضيف وحدها**، ضمًّا إلى البنك عبر `source_word_id`.
-- الدالّةُ محروسةٌ بـ`gw_is_admin` ولا يبثّها realtime، فلا يبلغ المعنى لاعبًا أبدًا.
--
-- ## وهذا استثناءٌ مقصودٌ من «الكلماتُ تُنسَخ لا يُشار إليها»
-- النسخُ يحفظ **تاريخَ ما لُعِب**: نصُّ الكلمة لا يتغيّر بتغيّر البنك. أمّا المعنى
-- فليس تاريخًا بل **أداةُ حُكمٍ لحظةَ الحكم**؛ فإن صُحِّح في البنك غدًا فالأصوبُ أن
-- يرى المضيفُ المصحَّح. ولذلك يُشار إليه ولا يُنسَخ. وكلمةُ الغرفة الخاصّة
-- (`source_word_id is null`) لا معنى لها أصلًا — كتبها المضيفُ فهو يعرفها.

create or replace function public.gw_get_admin_session_data(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_session jsonb;
  v_words   jsonb;
  v_players jsonb;
  v_answers jsonb;
  v_current uuid;
begin
  if not gw_is_admin(auth.uid()) then
    raise exception 'GW_FORBIDDEN';
  end if;

  select to_jsonb(s.*) into v_session from guess_word_sessions s where s.id = p_session_id;
  if v_session is null then
    raise exception 'GW_SESSION_NOT_FOUND';
  end if;

  v_current := (v_session ->> 'current_word_id')::uuid;

  -- المعنى يُضمّ هنا ولا يُنسَخ في الجدول: الجدولُ يُبَثّ إلى اللاعبين، وهذه لا.
  select coalesce(jsonb_agg(
           (to_jsonb(w.*) || jsonb_build_object('hint', b.hint)) order by w.position
         ), '[]'::jsonb) into v_words
  from guess_word_words w
  left join guess_word_bank b on b.id = w.source_word_id
  where w.session_id = p_session_id;

  select coalesce(jsonb_agg((to_jsonb(p.*) - 'token_hash') order by p.joined_at), '[]'::jsonb)
    into v_players
  from guess_word_players p where p.session_id = p_session_id;

  -- إجاباتُ الجولة الجارية وحدها، مرتَّبةً بالأسرع: الترتيبُ هو نصفُ حُكم المضيف.
  if v_current is not null then
    select coalesce(jsonb_agg(
             jsonb_build_object(
               'id', a.id, 'player_id', a.player_id, 'player_name', pl.name,
               'answer', a.answer, 'response_ms', a.response_ms, 'submitted_at', a.submitted_at
             ) order by a.response_ms asc), '[]'::jsonb)
      into v_answers
    from guess_word_answers a
    join guess_word_players pl on pl.id = a.player_id
    where a.word_id = v_current;
  else
    v_answers := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'session', v_session,
    'words',   v_words,
    'players', v_players,
    'answers', v_answers,
    'server_now', now()
  );
end;
$fn$;

revoke all on function public.gw_get_admin_session_data(uuid) from public, anon;
grant execute on function public.gw_get_admin_session_data(uuid) to authenticated, service_role;
