-- **عضوُ أدِيب في الاستبيانات هو عضوُ أدِيب في الموقع** (قرار محمد ٢٠٢٦-١٠-٢٠، طُبّق في اليوم نفسه).
-- كان استبيان «للأعضاء» يقيس بـ`survey_is_active_member`: انضمّ **وحالُه active**، فيردّ العضوَ غيرَ
-- النشط (inactive) وهو عند الموقع كلّه «عضو أدِيب» (`is_adeeb_member`: انضمّ ولم يُوقَف). فللعضويّة
-- معنيان، وما يُكتب على الاستبيان «لأعضاء أدِيب» لا يطابق من يسمّيه الموقع عضوًا. توحّد الحدّ هنا.
--
-- وتسقط `survey_is_active_member(p_user)` معه: كانت مفتوحةً لـanon/authenticated بمعرّفٍ يمرّره المتّصل،
-- فتجيب عن «هل فلانٌ عضو؟» لأيّ uuid. وبديلُها للسياسات `survey_viewer_is_member()` بلا معامل:
-- تقرأ `auth.uid()` وحدها («الجلسةُ هي الحقيقة»)، فلا يُسأل بها عن غير صاحب الجلسة.

create or replace function public.survey_viewer_is_member()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select auth.uid() is not null and public.is_adeeb_member(auth.uid());
$$;
-- تناديها سياستا القراءة أدناه، والثانيةُ لـanon أيضًا: والدالّةُ تولد مغلقةً منذ ٢٠٢٦-١٠-١٠
grant execute on function public.survey_viewer_is_member() to anon, authenticated;

drop policy if exists surveys_read_members on public.surveys;
create policy surveys_read_members on public.surveys
  for select to authenticated
  using (status = 'active' and access_type = 'members_only' and archived_at is null and deleted_at is null
         and public.survey_viewer_is_member());

drop policy if exists survey_questions_read on public.survey_questions;
create policy survey_questions_read on public.survey_questions
  for select to anon, authenticated
  using (exists (
    select 1 from public.surveys s
    where s.id = survey_questions.survey_id and s.status = 'active'
      and s.archived_at is null and s.deleted_at is null
      and (s.access_type = 'public' or (s.access_type = 'members_only' and public.survey_viewer_is_member()))
  ));

-- دالّةُ الإرسال (خادميّةٌ وحدها) تقيس بحدّ الموقع نفسه — هو السطرُ الوحيد الذي تبدّل فيها
CREATE OR REPLACE FUNCTION public.submit_survey_response(p_survey_id integer, p_user_id uuid, p_answers jsonb, p_time_spent_seconds integer DEFAULT NULL::integer, p_device_type text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_survey surveys%rowtype;
  v_user uuid;
  v_response_id integer;
  v_q record;
  v_val jsonb;
  v_text text;
  v_choice_ids text[];
  v_answered integer := 0;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'invalid_answers';
  end if;

  select * into v_survey from surveys where id = p_survey_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_survey.status <> 'active' then raise exception 'not_active'; end if;
  -- الأرشفة/الحذف صارا عَلَمين متعامدين يُبقيان status='active'؛ فبوّابة الحالة وحدها لم تعد تكفي
  if v_survey.archived_at is not null or v_survey.deleted_at is not null then raise exception 'not_active'; end if;
  if v_survey.start_date is not null and v_survey.start_date > now() then raise exception 'not_started'; end if;
  if v_survey.end_date is not null and v_survey.end_date < now() then raise exception 'ended'; end if;

  if v_survey.access_type = 'members_only'
     and (p_user_id is null or not is_adeeb_member(p_user_id)) then
    raise exception 'members_only';
  end if;

  v_user := case when v_survey.allow_anonymous then null else p_user_id end;

  if not v_survey.allow_multiple_responses and v_user is not null and exists (
    select 1 from survey_responses r
    where r.survey_id = p_survey_id and r.user_id = v_user and r.status = 'completed'
  ) then
    raise exception 'already_answered';
  end if;

  if exists (
    select 1 from jsonb_object_keys(p_answers) k
    where not exists (
      select 1 from survey_questions q
      where q.survey_id = p_survey_id and q.id::text = k
    )
  ) then
    raise exception 'foreign_question';
  end if;

  insert into survey_responses (survey_id, user_id, status, completed_at, time_spent_seconds, device_type)
  values (p_survey_id, v_user, 'completed', now(),
          greatest(p_time_spent_seconds, 0), nullif(p_device_type, ''))
  returning id into v_response_id;

  for v_q in
    select id, question_type, is_required, options
    from survey_questions
    where survey_id = p_survey_id
  loop
    v_val := p_answers -> (v_q.id::text);
    if v_val is null or jsonb_typeof(v_val) = 'null' then
      if v_q.is_required then raise exception 'required_missing:%', v_q.id; end if;
      continue;
    end if;

    case v_q.question_type
      when 'short_text', 'long_text', 'email', 'phone', 'url' then
        if jsonb_typeof(v_val) <> 'string'
           or length(btrim(v_val #>> '{}')) = 0
           or length(v_val #>> '{}') > 10000 then
          raise exception 'bad_answer:%', v_q.id;
        end if;
        -- صيغةُ البريد والجوّال: طبقةٌ ثانية تحت المتصفّح، لا نسخةٌ منه تفترق عنه
        v_text := btrim(v_val #>> '{}');
        if v_q.question_type = 'email'
           and v_text !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' then
          raise exception 'bad_email:%', v_q.id;
        end if;
        if v_q.question_type = 'phone' and v_text !~ '^05[0-9]{8}$' then
          raise exception 'bad_phone:%', v_q.id;
        end if;
        insert into survey_answers (response_id, question_id, answer_text)
        values (v_response_id, v_q.id, v_val #>> '{}');

      when 'number' then
        if jsonb_typeof(v_val) <> 'number' then raise exception 'bad_answer:%', v_q.id; end if;
        insert into survey_answers (response_id, question_id, answer_number)
        values (v_response_id, v_q.id, (v_val #>> '{}')::numeric);

      when 'rating_stars', 'linear_scale' then
        if jsonb_typeof(v_val) <> 'number'
           or (v_val #>> '{}')::numeric < coalesce((v_q.options #>> '{scale,min}')::numeric, 1)
           or (v_val #>> '{}')::numeric > coalesce((v_q.options #>> '{scale,max}')::numeric, 5) then
          raise exception 'bad_answer:%', v_q.id;
        end if;
        insert into survey_answers (response_id, question_id, answer_number)
        values (v_response_id, v_q.id, (v_val #>> '{}')::numeric);

      when 'yes_no' then
        if jsonb_typeof(v_val) <> 'boolean' then raise exception 'bad_answer:%', v_q.id; end if;
        insert into survey_answers (response_id, question_id, answer_boolean)
        values (v_response_id, v_q.id, (v_val #>> '{}')::boolean);

      -- التاريخ/الوقت/التاريخ‑والوقت: كبقيّة الأنواع — نصٌّ أوّلًا ثمّ تحويلٌ محروسٌ يرفع bad_answer النظيف
      -- (بدل انهيار cast خامٍّ «invalid input syntax» يصل المستخدمَ رسالةً مبهمة)
      when 'date' then
        if jsonb_typeof(v_val) <> 'string' then raise exception 'bad_answer:%', v_q.id; end if;
        begin
          insert into survey_answers (response_id, question_id, answer_date)
          values (v_response_id, v_q.id, (v_val #>> '{}')::date);
        exception when others then raise exception 'bad_answer:%', v_q.id;
        end;

      when 'time' then
        if jsonb_typeof(v_val) <> 'string' then raise exception 'bad_answer:%', v_q.id; end if;
        begin
          insert into survey_answers (response_id, question_id, answer_time)
          values (v_response_id, v_q.id, (v_val #>> '{}')::time);
        exception when others then raise exception 'bad_answer:%', v_q.id;
        end;

      when 'datetime' then
        if jsonb_typeof(v_val) <> 'string' then raise exception 'bad_answer:%', v_q.id; end if;
        begin
          insert into survey_answers (response_id, question_id, answer_datetime)
          values (v_response_id, v_q.id, (v_val #>> '{}')::timestamptz);
        exception when others then raise exception 'bad_answer:%', v_q.id;
        end;

      when 'single_choice', 'dropdown' then
        select array_agg(c ->> 'id') into v_choice_ids
        from jsonb_array_elements(coalesce(v_q.options -> 'choices', '[]'::jsonb)) c
        where coalesce((c ->> 'retired')::boolean, false) = false;
        if jsonb_typeof(v_val) <> 'string'
           or v_choice_ids is null
           or not ((v_val #>> '{}') = any (v_choice_ids)) then
          raise exception 'bad_answer:%', v_q.id;
        end if;
        insert into survey_answers (response_id, question_id, answer_json)
        values (v_response_id, v_q.id, v_val);

      when 'multiple_choice' then
        select array_agg(c ->> 'id') into v_choice_ids
        from jsonb_array_elements(coalesce(v_q.options -> 'choices', '[]'::jsonb)) c
        where coalesce((c ->> 'retired')::boolean, false) = false;
        if jsonb_typeof(v_val) <> 'array'
           or jsonb_array_length(v_val) = 0
           or v_choice_ids is null
           or exists (
             select 1 from jsonb_array_elements(v_val) e
             where jsonb_typeof(e.value) <> 'string'
                or not ((e.value #>> '{}') = any (v_choice_ids))
           )
           or (select count(distinct e.value #>> '{}') from jsonb_array_elements(v_val) e)
              <> jsonb_array_length(v_val) then
          raise exception 'bad_answer:%', v_q.id;
        end if;
        insert into survey_answers (response_id, question_id, answer_json)
        values (v_response_id, v_q.id, v_val);

      else
        raise exception 'unknown_type:%', v_q.question_type;
    end case;

    v_answered := v_answered + 1;
  end loop;

  if v_answered = 0 then raise exception 'empty_response'; end if;

  return v_response_id;
end $function$;

drop function if exists public.survey_is_active_member(uuid);
