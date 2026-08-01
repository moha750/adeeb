-- ============================================================
-- نظام الاستبيانات V2 — الجزء ٣: الوصول (RLS + الامتيازات + RPC الإرسال)
-- المبدأ: القراءة العامّة للنشط العامّ فقط، قراءة الأعضاء بعضويّة حيّة،
-- ولا كتابة من المتصفّح إطلاقًا — الإرسال كلّه عبر دالّة واحدة ذرّية
-- هي نقطة الفرض الوحيدة، تُستدعى من خادم V2 بمفتاح الخدمة.
-- يُغلق بهذا: قراءة/تعديل anon لاستجابات الغير (P0)، وتجاهل access_type،
-- والامتيازات الشاملة (حتى TRUNCATE) الممنوحة لـ anon.
-- ============================================================

-- ١) السياسات القديمة أُسقطت في الجزء ٢ (كانت تعتمد على أعمدة ساقطة)

-- ٢) عضويّة حيّة؟ — SECURITY DEFINER كي لا تتشابك سياساتنا مع RLS جدول profiles
create or replace function survey_is_active_member(p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = p_user and p.account_status = 'active'
  );
$$;
revoke execute on function survey_is_active_member(uuid) from public;
grant execute on function survey_is_active_member(uuid) to anon, authenticated;

-- ٣) سياسات القراءة الجديدة
create policy surveys_read_public on surveys
  for select to anon, authenticated
  using (status = 'active' and access_type = 'public');

create policy surveys_read_members on surveys
  for select to authenticated
  using (
    status = 'active' and access_type = 'members_only'
    and survey_is_active_member((select auth.uid()))
  );

create policy survey_questions_read on survey_questions
  for select to anon, authenticated
  using (exists (
    select 1 from surveys s
    where s.id = survey_id and s.status = 'active'
      and (
        s.access_type = 'public'
        or (s.access_type = 'members_only' and survey_is_active_member((select auth.uid())))
      )
  ));

-- العضو يرى استجاباته هو فقط؛ لا قراءة مجهولة للاستجابات إطلاقًا
create policy survey_responses_read_own on survey_responses
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy survey_answers_read_own on survey_answers
  for select to authenticated
  using (exists (
    select 1 from survey_responses r
    where r.id = response_id and r.user_id = (select auth.uid())
  ));

-- ٤) الامتيازات: كانت شاملة (حتى TRUNCATE لـ anon) — تُقلَّص إلى القراءة
revoke all on table surveys, survey_questions, survey_responses, survey_answers
  from anon, authenticated;
grant select on table surveys, survey_questions to anon, authenticated;
grant select on table survey_responses, survey_answers to authenticated;
revoke all on sequence surveys_id_seq, survey_questions_id_seq,
                        survey_responses_id_seq, survey_answers_id_seq
  from anon, authenticated;

-- ٥) دالّة الإرسال — نقطة الفرض الوحيدة لكلّ استجابة
-- p_answers: كائن {"<question_id>": <قيمة بحسب النوع>}
-- ترجع id الاستجابة. قفل صفّ الاستبيان يسلسل الإرسال فيمنع سباق
-- «استجابة واحدة». الأخطاء برموز ثابتة يترجمها الخادم للعربيّة.
create or replace function submit_survey_response(
  p_survey_id integer,
  p_user_id uuid,
  p_answers jsonb,
  p_time_spent_seconds integer default null,
  p_device_type text default null
) returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_survey surveys%rowtype;
  v_user uuid;
  v_response_id integer;
  v_q record;
  v_val jsonb;
  v_choice_ids text[];
  v_answered integer := 0;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'invalid_answers';
  end if;

  select * into v_survey from surveys where id = p_survey_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_survey.status <> 'active' then raise exception 'not_active'; end if;
  if v_survey.start_date is not null and v_survey.start_date > now() then raise exception 'not_started'; end if;
  if v_survey.end_date is not null and v_survey.end_date < now() then raise exception 'ended'; end if;

  if v_survey.access_type = 'members_only'
     and (p_user_id is null or not survey_is_active_member(p_user_id)) then
    raise exception 'members_only';
  end if;

  -- استبيان مجهول الهويّة: تُجرَّد الهويّة حتى عن المسجّلين
  v_user := case when v_survey.allow_anonymous then null else p_user_id end;

  if not v_survey.allow_multiple_responses and v_user is not null and exists (
    select 1 from survey_responses r
    where r.survey_id = p_survey_id and r.user_id = v_user and r.status = 'completed'
  ) then
    raise exception 'already_answered';
  end if;

  -- مفاتيح غريبة: إجابة لسؤال ليس من هذا الاستبيان (مقارنة نصيّة تتحاشى أخطاء cast)
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

      when 'date' then
        insert into survey_answers (response_id, question_id, answer_date)
        values (v_response_id, v_q.id, (v_val #>> '{}')::date);

      when 'time' then
        insert into survey_answers (response_id, question_id, answer_time)
        values (v_response_id, v_q.id, (v_val #>> '{}')::time);

      when 'datetime' then
        insert into survey_answers (response_id, question_id, answer_datetime)
        values (v_response_id, v_q.id, (v_val #>> '{}')::timestamptz);

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
end $$;

-- الإرسال من خادم V2 وحده — لا anon ولا authenticated
revoke execute on function submit_survey_response(integer, uuid, jsonb, integer, text) from public, anon, authenticated;
grant execute on function submit_survey_response(integer, uuid, jsonb, integer, text) to service_role;

-- ٦) عدّ المشاهدات: يبقى لكن من الخادم وحده
revoke execute on function increment_survey_views(integer) from public, anon, authenticated;
grant execute on function increment_survey_views(integer) to service_role;

-- ٧) تثبيت search_path لدالّتين على مسار الاستبيانات كانتا بلا تثبيت
alter function update_updated_at_column() set search_path = public;
alter function is_admin_user(uuid) set search_path = public;
