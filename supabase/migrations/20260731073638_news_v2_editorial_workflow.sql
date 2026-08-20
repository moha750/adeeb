-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260731073638   الاسم: news_v2_editorial_workflow

-- ════════════════════════════════════════════════════════════════════
--  منصّة أخبار أدِيب V2 — الترحيل الثالث: آلة الحالة التحريريّة
--
--  الأفعال التحريريّة أفعالُ **فاعلٍ يُسمّى**، فلا تُترك تحديثاتٍ حرّة على
--  الأعمدة: كلّ تحوّل دالّةٌ تعرف من فعله، وتتحقّق من أنّه يملكه، وتُسجّله.
--  ولوحة V2 تكتب بمفتاح الخدمة (يتجاوز RLS) — فالحراسة هنا لا هناك.
--
--      مسودّة ──تكليف──► مُكلَّف ──أوّل تحرير──► قيد الكتابة ──رفع──► جاهز للمراجعة
--                                        ▲                              │
--                                        └──────── إعادة بملاحظة ◄──────┘
--                                                                       │ نشر
--                                                        منشور ◄────────┘
--                                                          │ أرشفة
--                                                       مؤرشف
-- ════════════════════════════════════════════════════════════════════


-- ── ١) حقول التكليف — مفرداتٌ محروسة ─────────────────────────────────
--
-- «أيّ الحقول يملك هذا الكاتب؟» كان مكتوبًا في ثلاثة مواضع: `assigned_fields`
-- على صفّ التكليف، و`available_fields` على الخبر، وجدول `news_field_permissions`
-- كاملًا. ثلاثة مصادر لمعنًى واحد تنحرف عن بعضها حتمًا.
--
-- **المصدر الواحد: `news_writer_assignments.assigned_fields`** — مُلاصقٌ للتكليف
-- الذي يعنيه. والآخران مهجوران (٠ صفوف، لم يُستعملا قطّ) ومسجّلان في قائمة موت V1.

alter table news_writer_assignments alter column assigned_fields set default
  '["title","summary","content","tags","authors"]'::jsonb;
update news_writer_assignments set assigned_fields = '[]'::jsonb where assigned_fields is null;

alter table news_writer_assignments drop constraint if exists news_assigned_fields_known;
alter table news_writer_assignments add constraint news_assigned_fields_known check (
  jsonb_typeof(assigned_fields) = 'array'
  and assigned_fields <@ '["title","summary","content","tags","category","authors",
                           "image_url","gallery_images",
                           "cover_photographer","gallery_photographers"]'::jsonb
);


-- ── ٢) السجلّ — يُكتب من الدوالّ وحدها ───────────────────────────────

create or replace function public.news_log(
  p_news uuid, p_actor uuid, p_action text, p_details jsonb default '{}'::jsonb
) returns void
language sql
volatile
security definer
set search_path to 'public'
as $$
  insert into news_activity_log (news_id, user_id, action, details)
  values (p_news, p_actor, p_action, coalesce(p_details, '{}'::jsonb));
$$;


-- ── ٣) التكليف — فعلُ رئيس التحرير ───────────────────────────────────
--
-- استبدالٌ ذرّيّ لطاقم الخبر: من سقط من القائمة رُفع تكليفه، ومن بقي حُفظت
-- حالتُه (فلا يُعاد كاتبٌ بدأ العمل إلى «مُعلَّق»)، ومن أُضيف كُلِّف.

create or replace function public.news_assign_writers(
  p_news uuid,
  p_actor uuid,
  p_writers uuid[],
  p_fields jsonb default null,
  p_notes text default null
) returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  fields jsonb := coalesce(p_fields, '["title","summary","content","tags","authors"]'::jsonb);
  added int := 0;
  removed int := 0;
  w uuid;
begin
  if news_role(p_actor, p_news) <> 'chief' then
    raise exception 'news_denied' using hint = 'التكليف لرئيس التحرير وحده.';
  end if;

  -- من سقط من القائمة
  with gone as (
    delete from news_writer_assignments a
    where a.news_id = p_news
      and not (a.writer_id = any(coalesce(p_writers, '{}'::uuid[])))
    returning 1
  ) select count(*) into removed from gone;

  -- من بقي أو أُضيف — الحقول والملاحظة تُحدَّثان دائمًا، والحالة تُصان
  foreach w in array coalesce(p_writers, '{}'::uuid[]) loop
    insert into news_writer_assignments
      (news_id, writer_id, assigned_by, assigned_fields, assignment_notes, status)
    values (p_news, w, p_actor, fields, p_notes, 'pending')
    on conflict (news_id, writer_id) do update
      set assigned_fields  = excluded.assigned_fields,
          assignment_notes = excluded.assignment_notes,
          assigned_by      = excluded.assigned_by;
    added := added + 1;

    -- **التكليف هو المفتاح**: من كُلِّف فُتحت له غرفة التحرير. ولا يُسحب المفتاح
    -- آليًّا عند رفع التكليف — من كتب مرّةً فهو من أهلها، ورئيس التحرير يسحبه
    -- صراحةً من تبويب الصلاحيات إن أراد.
    insert into user_specific_permissions (user_id, permission_id, is_granted, granted_by)
    select w, p.id, true, p_actor from permissions p where p.permission_key = 'write_news'
      and not exists (
        select 1 from user_specific_permissions u
        where u.user_id = w and u.permission_id = p.id
      );
  end loop;

  -- الخبر يدخل مرحلة التكليف — ولا يُنزَل من مرحلةٍ أبعد بلغها بالفعل
  update news
     set workflow_status = case
           when added > 0 and workflow_status = 'draft' then 'assigned'
           when added = 0 and workflow_status = 'assigned' then 'draft'
           else workflow_status end,
         assigned_by = case when added > 0 then p_actor else assigned_by end,
         assigned_at = case when added > 0 then now() else assigned_at end
   where id = p_news;

  perform news_log(p_news, p_actor, 'assign',
    jsonb_build_object('writers', to_jsonb(coalesce(p_writers, '{}'::uuid[])),
                       'fields', fields, 'removed', removed));
  return format('كُلِّف %s كاتبًا، ورُفع %s تكليفًا.', added, removed);
end $$;


-- ── ٤) أفعال الكاتب ──────────────────────────────────────────────────

/** أوّل حفظٍ من الكاتب ينقل الخبر من «مُكلَّف» إلى «قيد الكتابة» — بلا زرّ يُضغط. */
create or replace function public.news_writer_touch(p_news uuid, p_actor uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  update news_writer_assignments
     set status = case when status = 'pending' then 'in_progress' else status end,
         started_at = coalesce(started_at, now()),
         last_edited_at = now()
   where news_id = p_news and writer_id = p_actor;

  update news set workflow_status = 'in_progress'
   where id = p_news and workflow_status = 'assigned';
end $$;

/** الكاتب يرفع عملَه إلى المراجعة. */
create or replace function public.news_submit_for_review(p_news uuid, p_actor uuid)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  cur text;
begin
  if news_role(p_actor, p_news) = 'none' then
    raise exception 'news_denied' using hint = 'لست من كتّاب هذا الخبر.';
  end if;

  select workflow_status into cur from news where id = p_news;
  if cur not in ('draft', 'assigned', 'in_progress') then
    raise exception 'news_bad_transition' using hint = 'هذا الخبر ليس قيد الكتابة.';
  end if;

  update news
     set workflow_status = 'ready_for_review',
         submitted_at = now(),
         rejection_reason = null
   where id = p_news;

  update news_writer_assignments
     set status = 'completed', completed_at = now()
   where news_id = p_news and writer_id = p_actor;

  perform news_log(p_news, p_actor, 'submit', jsonb_build_object('from', cur));
  return 'رُفع الخبر إلى المراجعة.';
end $$;


-- ── ٥) أفعال رئيس التحرير ────────────────────────────────────────────

/** إعادةٌ بملاحظة — لا رفضٌ مبهم: الملاحظة شرطٌ لا خيار. */
create or replace function public.news_return_for_edits(p_news uuid, p_actor uuid, p_notes text)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  if news_role(p_actor, p_news) <> 'chief' then
    raise exception 'news_denied' using hint = 'المراجعة لرئيس التحرير وحده.';
  end if;
  if p_notes is null or btrim(p_notes) = '' then
    raise exception 'news_notes_required' using hint = 'اكتب ما ينبغي تعديله — الإعادة بلا ملاحظة لا تُفيد الكاتب.';
  end if;

  update news
     set workflow_status = 'in_progress',
         rejection_reason = btrim(p_notes),
         reviewed_by = p_actor,
         reviewed_at = now(),
         submitted_at = null
   where id = p_news;

  update news_writer_assignments
     set status = 'in_progress', completed_at = null
   where news_id = p_news and status = 'completed';

  perform news_log(p_news, p_actor, 'return', jsonb_build_object('notes', btrim(p_notes)));
  return 'أُعيد الخبر إلى الكاتب مع ملاحظتك.';
end $$;

/** النشر والأرشفة وإلغاء النشر — والقاعدة تحرس الاكتمال (news_publish_guard). */
create or replace function public.news_set_status(p_news uuid, p_actor uuid, p_op text)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  cur text;
begin
  if news_role(p_actor, p_news) <> 'chief' then
    raise exception 'news_denied' using hint = 'النشر لرئيس التحرير وحده.';
  end if;
  select workflow_status into cur from news where id = p_news;

  if p_op = 'publish' then
    update news set workflow_status = 'published',
                    reviewed_by = p_actor, reviewed_at = now(), rejection_reason = null
     where id = p_news;
  elsif p_op = 'unpublish' then
    update news set workflow_status = 'draft' where id = p_news;
  elsif p_op = 'archive' then
    update news set workflow_status = 'archived' where id = p_news;
  elsif p_op = 'restore' then
    update news set workflow_status = 'draft' where id = p_news;
  else
    raise exception 'news_bad_op' using hint = 'فعلٌ غير معروف.';
  end if;

  perform news_log(p_news, p_actor, p_op, jsonb_build_object('from', cur));
  return case p_op
    when 'publish'   then 'نُشِر الخبر.'
    when 'unpublish' then 'أُلغي النشر — عاد مسودّةً.'
    when 'archive'   then 'أُرشف الخبر.'
    else 'أُعيد الخبر مسودّةً.' end;
end $$;


-- ── ٦) الميلاد ───────────────────────────────────────────────────────

create or replace function public.news_create(
  p_actor uuid, p_title text, p_committee int default null, p_category text default 'coverage'
) returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  new_id uuid;
begin
  if not can_open_newsroom(p_actor) then
    raise exception 'news_denied' using hint = 'لست من أهل غرفة التحرير.';
  end if;
  if p_title is null or btrim(p_title) = '' then
    raise exception 'news_title_required' using hint = 'عنوان الخبر مطلوب.';
  end if;

  -- يُولَد مسودّةً دائمًا؛ والمتن فارغٌ ينتظر كاتبه (والعمود NOT NULL فيُملأ بفراغ).
  insert into news (title, content, workflow_status, category, committee_id, created_by)
  values (btrim(p_title), '', 'draft', coalesce(p_category, 'coverage'), p_committee, p_actor)
  returning id into new_id;

  perform news_log(new_id, p_actor, 'create', jsonb_build_object('title', btrim(p_title)));
  return new_id;
end $$;


-- ── ٧) التعليق الداخليّ ──────────────────────────────────────────────

create or replace function public.news_comment(
  p_news uuid, p_actor uuid, p_text text, p_parent uuid default null
) returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  new_id uuid;
begin
  if news_role(p_actor, p_news) = 'none' then
    raise exception 'news_denied' using hint = 'لا شأن لك بهذا الخبر.';
  end if;
  if p_text is null or btrim(p_text) = '' then
    raise exception 'news_empty_comment' using hint = 'التعليق فارغ.';
  end if;

  insert into news_collaboration_comments (news_id, user_id, comment_text, parent_comment_id)
  values (p_news, p_actor, btrim(p_text), p_parent)
  returning id into new_id;
  return new_id;
end $$;

