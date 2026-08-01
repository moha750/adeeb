-- ============================================================
-- نظام الاستبيانات V2 — الجزء ٢: إعادة تشكيل الجداول الحيّة
-- حذف الأعمدة التي لم تُكتب قطّ (بعضها مسؤوليّة PII كامنة)، تقليص
-- المفردات إلى الحيّ منها، هُويّات ثابتة للخيارات مع ترحيل الإجابات
-- التاريخيّة، وقيد «عمود إجابة واحد للصفّ».
-- كلّ حذفٍ هنا تحقّقنا قبله أنّ العمود فارغ أو لا قارئ له (2026-07-16).
-- ============================================================

-- ٠) إسقاط كلّ السياسات القائمة أوّلًا — بعضها يعتمد على أعمدة ستسقط
--    (سياسات anon القديمة كانت أصلًا ثغرة P0)، والجزء ٣ يبنيها من صفر
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('surveys', 'survey_questions', 'survey_responses', 'survey_answers')
  loop
    execute format('drop policy %I on %I', p.policyname, p.tablename);
  end loop;
end $$;

-- ١) surveys: أعمدة لم يكتبها أحد قطّ + عدّادات متقاعدة
alter table surveys
  drop column if exists survey_type,          -- كانت 'general' دائمًا (المفردات الثماني حبر على ورق)
  drop column if exists committee_id,         -- لم تُسند لأيّ استبيان
  drop column if exists target_role_level,    -- اتجاه رقميّ يناقض مسار RBAC القدراتيّ
  drop column if exists require_authentication,
  drop column if exists collect_email,
  drop column if exists collect_phone,
  drop column if exists theme_color,          -- افتراضه '#3d8fd6' الدخيل على الهويّة أصلًا
  drop column if exists randomize_questions,
  drop column if exists total_responses,      -- تُحسب حيّة
  drop column if exists total_completed,      -- تُحسب حيّة
  drop column if exists permanent_delete_at;  -- وعدُ «حذف بعد 30 يومًا» بلا منفّذ — الحذف النهائيّ يدويّ

-- مفردات الوصول: الحيّ منها فقط (كلّ الصفوف public أو members_only)
alter table surveys drop constraint if exists surveys_access_type_check;
alter table surveys add constraint surveys_access_type_check
  check (access_type in ('public', 'members_only'));

-- ٢) survey_questions: أعمدة نصف-مبنيّة بلا محرّر ولا مقيّم
alter table survey_questions
  drop column if exists allow_other_option,   -- لم يُنفَّذ في أيّ واجهة
  drop column if exists validation_rules,     -- كانت تُقرأ ولا تُكتب وتسقط عند كلّ حفظ
  drop column if exists conditional_logic;    -- لا محرّر ولا مقيّم

-- مفردات الأنواع: كان القيد يسمح بـ 27 نوعًا والواقع يستعمل 10 —
-- نُبقي 15 نوعًا عمليًّا (المستعملة + مكمّلاتها النصيّة/الزمنيّة الرخيصة)
alter table survey_questions drop constraint if exists survey_questions_question_type_check;
alter table survey_questions add constraint survey_questions_question_type_check
  check (question_type in (
    'short_text', 'long_text', 'single_choice', 'multiple_choice', 'dropdown',
    'yes_no', 'rating_stars', 'linear_scale', 'number',
    'date', 'time', 'datetime', 'email', 'phone', 'url'
  ));

-- ٣) survey_responses: نموذج V2 بلا أشباح — الصفّ يُنشأ عند الإرسال
--    مكتملًا، فتسقط أعمدة التقدّم الجزئيّ والـ PII الفارغة كلّها
alter table survey_responses
  drop column if exists is_anonymous,         -- 400 صفّ كلّها خاطئة؛ الهويّة = user_id نفسه
  drop column if exists respondent_email,     -- فارغ 100%
  drop column if exists respondent_phone,     -- فارغ 100%
  drop column if exists respondent_name,      -- فارغ 100%
  drop column if exists progress_percentage,  -- لا معنى له في نموذج الإرسال الواحد
  drop column if exists started_at,           -- created_at يكفي (الفارق الأقصى تاريخيًّا ~4 دقائق بلا قيمة تحليليّة)
  drop column if exists ip_address,           -- كُتب null دائمًا — مسؤوليّة PII كامنة
  drop column if exists user_agent,           -- فارغ 100%
  drop column if exists metadata;             -- فارغ 100%

-- الحالة: مكتملة عند الإرسال؛ in_progress تبقى في المفردات للصفوف
-- التاريخيّة (لا صفّ abandoned في الواقع فسقطت من القيد)
alter table survey_responses drop constraint if exists survey_responses_status_check;
alter table survey_responses add constraint survey_responses_status_check
  check (status in ('in_progress', 'completed'));
alter table survey_responses alter column status set default 'completed';

-- ٤) survey_answers: عمود قيمة واحد لكلّ صفّ (تحقّقنا: 0 صفّ مخالف)
alter table survey_answers
  drop column if exists answer_file_url,      -- file_upload خارج نطاق V2 (لم يعمل في V1 أصلًا)
  drop column if exists time_spent_seconds;   -- لم يُقرأ قطّ

alter table survey_answers add constraint survey_answers_single_value_check
  check (num_nonnulls(answer_text, answer_number, answer_date, answer_time,
                      answer_datetime, answer_boolean, answer_json) = 1);

-- ٥) هُويّات ثابتة للخيارات + ترحيل الإجابات التاريخيّة
-- V1 خزّن الخيارات نصوصًا ["أ","ب"] والإجابات بنصّ العرض — إعادة تسمية
-- خيارٍ تُيتّم إجاباته في التجميع. الشكل الجديد:
--   options.choices = [{id:'c1', label:'أ'}, …]  والإجابة تخزّن الـ id.
-- النصوص التاريخيّة التي لا تطابق خيارًا قائمًا (أُعيدت تسميته يومًا)
-- تُلحق خيارًا متقاعدًا {retired:true} فيبقى تجميعها صادقًا.
-- آمنة التكرار: السؤال المرحَّل (خياره الأوّل كائن) يُتخطّى بإجاباته.
do $$
declare
  q record;
  a record;
  c jsonb;
  new_choices jsonb;
  choice_map jsonb;  -- label → id
  idx int;
  next_idx int;
  lbl text;
  mapped jsonb;
begin
  for q in
    select id, options from survey_questions
    where question_type in ('single_choice', 'multiple_choice', 'dropdown')
  loop
    if q.options is null or jsonb_typeof(q.options -> 'choices') <> 'array'
       or jsonb_array_length(q.options -> 'choices') = 0 then
      continue;
    end if;
    -- مُرحَّل سلفًا؟ الخيار الأوّل كائن لا نصّ
    if jsonb_typeof(q.options -> 'choices' -> 0) = 'object' then
      continue;
    end if;

    new_choices := '[]'::jsonb;
    choice_map := '{}'::jsonb;
    idx := 0;
    for c in select value from jsonb_array_elements(q.options -> 'choices')
    loop
      idx := idx + 1;
      lbl := c #>> '{}';
      new_choices := new_choices || jsonb_build_array(jsonb_build_object('id', 'c' || idx, 'label', lbl));
      choice_map := choice_map || jsonb_build_object(lbl, 'c' || idx);
    end loop;
    next_idx := idx;

    for a in
      select id, answer_json from survey_answers
      where question_id = q.id and answer_json is not null
    loop
      if jsonb_typeof(a.answer_json) = 'string' then
        lbl := a.answer_json #>> '{}';
        if not (choice_map ? lbl) then
          next_idx := next_idx + 1;
          new_choices := new_choices || jsonb_build_array(jsonb_build_object('id', 'c' || next_idx, 'label', lbl, 'retired', true));
          choice_map := choice_map || jsonb_build_object(lbl, 'c' || next_idx);
        end if;
        update survey_answers set answer_json = to_jsonb(choice_map ->> lbl) where id = a.id;
      elsif jsonb_typeof(a.answer_json) = 'array' then
        mapped := '[]'::jsonb;
        for c in select value from jsonb_array_elements(a.answer_json)
        loop
          lbl := c #>> '{}';
          if not (choice_map ? lbl) then
            next_idx := next_idx + 1;
            new_choices := new_choices || jsonb_build_array(jsonb_build_object('id', 'c' || next_idx, 'label', lbl, 'retired', true));
            choice_map := choice_map || jsonb_build_object(lbl, 'c' || next_idx);
          end if;
          mapped := mapped || jsonb_build_array(to_jsonb(choice_map ->> lbl));
        end loop;
        update survey_answers set answer_json = mapped where id = a.id;
      end if;
    end loop;

    update survey_questions
      set options = jsonb_set(coalesce(options, '{}'::jsonb), '{choices}', new_choices)
      where id = q.id;
  end loop;
end $$;
