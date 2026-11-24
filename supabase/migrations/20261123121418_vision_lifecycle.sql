-- دورةُ حياة الرؤية (محمد ٢٠٢٦-١١-٢٢: «نبني كل شيء من الآن»): الرؤيةُ عادةٌ إداريّة، تنتهي واحدةٌ فتبدأ أخرى.
-- مسوّدةٌ تكتبها إدارةُ الضمان والجودة (`draft_vision`) ← تُرسَل للرئيسين ← يوافقان معًا (أو يُعيدانها بملاحظة) ← تُطلَق
-- حين لا سارية ← تُغلق يدويًّا عند موعدها فتتجمّد. ولكلّ رؤيةٍ علامتُها: الهلالُ المبنيّ، أو ملفُّ SVG برسم المصمّم
-- (طبقةٌ لكلّ مسار، وقطعةٌ لكلّ هدف)، وحكايتُها («فكرة الشعار») بياناتٌ تُكتب في المحرّر لا نصٌّ في الكود.

-- ١) الرؤية: حالُ «بانتظار الموافقة»، والعلامةُ وحكايتُها، ومن فعل ماذا في دورتها
alter table public.visions drop constraint visions_status_check;
alter table public.visions add constraint visions_status_check check (status in ('draft', 'review', 'active', 'closed'));

alter table public.visions
  add column mark jsonb not null default '{"kind":"hilal"}'::jsonb,
  add column mark_noun text not null default 'العلامة',
  add column idea_deck text,
  add column horizon_note text,
  add column stories jsonb not null default '[]'::jsonb,
  add column created_by uuid references public.profiles(id) on delete set null,
  add column submitted_by uuid references public.profiles(id) on delete set null,
  add column submitted_at timestamptz,
  add column return_note text,
  add column launched_by uuid references public.profiles(id) on delete set null,
  add column launched_at timestamptz,
  add column closed_by uuid references public.profiles(id) on delete set null,
  add column closed_at timestamptz,
  -- نسخةُ المسوّدة: كلُّ حفظٍ يزيدها، ومن حفظ على نسخةٍ قديمة (كاتبان معًا) يُردّ ولا يمحو عملَ صاحبه
  add column plan_rev integer not null default 0;

alter table public.visions
  add constraint visions_mark_check check (
    jsonb_typeof(mark) = 'object' and mark->>'kind' in ('hilal', 'svg') and octet_length(mark::text) <= 400000
    and (mark->>'kind' = 'hilal' or (jsonb_typeof(mark->'layers') = 'array' and mark->>'viewBox' ~ '^-?[0-9.]+( -?[0-9.]+){3}$'))),
  add constraint visions_mark_noun_check check (char_length(btrim(mark_noun)) between 2 and 30),
  add constraint visions_idea_deck_check check (idea_deck is null or char_length(btrim(idea_deck)) between 2 and 200),
  add constraint visions_horizon_note_check check (horizon_note is null or char_length(btrim(horizon_note)) between 2 and 200),
  add constraint visions_stories_check check (jsonb_typeof(stories) = 'array' and jsonb_array_length(stories) <= 6),
  add constraint visions_return_note_check check (return_note is null or char_length(btrim(return_note)) between 2 and 500);

-- رؤيةُ الهلال: حكايتُها التي كانت في `lib/vision/stories.ts` صارت بياناتها، وكلماتُ علامتها معها
update public.visions set
  mark = '{"kind":"hilal"}'::jsonb,
  mark_noun = 'الهلال',
  idea_deck = 'هلال من فسيفساء، يكتمل بما يتحقق من أهداف الرؤية.',
  horizon_note = 'بتقويم أم القرى، وقد يتقدم يومًا أو يتأخر برؤية الهلال.',
  stories = jsonb_build_array(
    jsonb_build_object('title', 'لماذا الهلال؟', 'art', 'all',
      'text', 'تبدأ الرؤية في 1 نوفمبر 2026، وتنتهي حين يُرى هلال رمضان، فاسمها هو موعد نهايتها. و«الرؤية» هنا بمعنيين: ما نتطلع إليه، وما سنراه بأعيننا قبل رمضان.'),
    jsonb_build_object('title', 'لماذا الفسيفساء؟', 'art', 'layers',
      'text', 'الفسيفساء فن عريق في العمارة الإسلامية: قطع صغيرة تُرص واحدة بجانب الأخرى حتى تكتمل الصورة. وكذلك الرؤية، لا يبنيها شخص واحد، بل يضع كل عضو في أدِيب قطعته. وفي الهلال أربع طبقات، كل طبقة مسار من مسارات الرؤية.'),
    jsonb_build_object('title', 'كل قطعة هدف', 'art', 'one',
      'text', 'في الهلال {total} قطعة بعدد أهداف الرؤية، لكل هدف مسؤول ومؤشر، ولا تُضاء قطعته إلا حين يتحقق. وفي كل تقرير للمجلس الإداري يظهر الهلال كما هو: ما أُضيء تحقق، وما بقي باهتا لم يتحقق بعد.')
  ),
  launched_at = coalesce(launched_at, created_at)
where slug = 'hilal';

-- ٢) موافقتا الرئيسين: مقعدٌ لا قدرة (كالأنظمة): لكلّ مقعدٍ موافقةٌ واحدة، ولا يقوم المكلَّفُ مقام الأصيل
create table public.vision_approvals (
  vision_id bigint not null references public.visions(id) on delete cascade,
  seat text not null check (seat in ('club_president', 'executive_council_president')),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (vision_id, seat)
);
alter table public.vision_approvals enable row level security;
revoke all on public.vision_approvals from anon, authenticated;

-- ٣) السجلّ يروي دورةَ الرؤية كلَّها: من أُرسلت إلى أن أُغلقت (ولا يُكتب ما قبل الإرسال: مسوّدةٌ لم يرها أحدٌ تُحذف بلا أثر)
alter table public.vision_log drop constraint vision_log_action_check;
alter table public.vision_log add constraint vision_log_action_check check (action in (
  'status', 'reported', 'withdrawn', 'confirmed', 'returned', 'unconfirmed', 'edited', 'team',
  'saved', 'submitted', 'recalled', 'approved', 'unapproved', 'sent_back', 'launched', 'closed'));
alter table public.vision_log drop constraint vision_log_note_check;
alter table public.vision_log add constraint vision_log_note_check check (note is null or char_length(note) <= 500);

-- ٤) القدرة: «إعداد الرؤى» لإدارة الضمان والجودة والرئيسين
insert into public.permissions (permission_key, permission_name_ar, description, category)
values ('draft_vision', 'إعداد الرؤى', 'كتابةُ مسوّدة رؤيةٍ جديدة بمساراتها وأهدافها وعلامتها، وإرسالُها للرئيسين، في /dashboard/vision/plans', 'admin')
on conflict (permission_key) do nothing;
insert into public.role_permissions (role_name, permission_id)
select r, p.id from public.permissions p, unnest(array['qa_committee_leader', 'qa_admin_member', 'club_president', 'executive_council_president']) r
where p.permission_key = 'draft_vision'
on conflict do nothing;

update public.permissions
   set description = 'مشتقّة: لمن له مقعدٌ في فريق الرؤية السارية، وللرئيسين (manage_vision)، ولمن يُعدّ الرؤى (draft_vision) — غرفةُ «متابعة الرؤية». لا تُمنح بدور.'
 where permission_key = 'work_vision';

-- مقعدُ الرئاسة الأصيلُ القائم لصاحبه (لا المكلَّف ولا المجمَّد): الموافقةُ توقيعُ صاحبها
create or replace function public.vision_president_seat(p_user uuid)
returns text language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select role_name from public.user_roles
   where user_id = p_user and is_active and not coalesce(is_acting, false) and frozen_by is null
     and role_name in ('club_president', 'executive_council_president')
   order by role_name limit 1;
$$;

create or replace function public.vision_access(p_user uuid, p_vision bigint)
returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select jsonb_build_object(
    'president', coalesce(public.check_user_permission(p_user, 'manage_vision'), false),
    'drafter', coalesce(public.check_user_permission(p_user, 'draft_vision'), false),
    'seat', public.vision_president_seat(p_user),
    'supervisor', exists (select 1 from public.vision_team where vision_id = p_vision and role = 'supervisor' and profile_id = p_user),
    'leader', exists (select 1 from public.vision_team where vision_id = p_vision and role = 'leader' and profile_id = p_user),
    'tracks', coalesce((select jsonb_agg(track_id order by track_id) from public.vision_team
                        where vision_id = p_vision and role = 'track' and profile_id = p_user), '[]'::jsonb)
  );
$$;

-- ٥) إنشاءُ المسوّدة — ومساراتُ رؤيةٍ سابقة إن طُلبت (أسماؤها وتعريفاتها ورموزها، بلا أهداف)
create or replace function public.vision_plan_create(p_actor uuid, p_name text, p_slug text, p_starts date, p_horizon date, p_label text, p_from bigint default null)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v_id bigint;
begin
  if not coalesce(public.check_user_permission(p_actor, 'draft_vision'), false) then
    return jsonb_build_object('ok', false, 'message', 'إعداد الرؤى لإدارة الضمان والجودة والرئيسين.');
  end if;
  if exists (select 1 from public.visions where slug = lower(btrim(p_slug))) then
    return jsonb_build_object('ok', false, 'message', 'هذا المعرّف لرؤيةٍ أخرى، اختر غيره.');
  end if;
  insert into public.visions (slug, name, starts_on, horizon_label, horizon_on, status, created_by, mark)
  values (lower(btrim(p_slug)), btrim(p_name), p_starts, btrim(p_label), p_horizon, 'draft', p_actor, '{"kind":"hilal"}'::jsonb)
  returning id into v_id;
  if p_from is not null then
    insert into public.vision_tracks (vision_id, position, name, summary, icon)
    select v_id, position, name, summary, icon from public.vision_tracks where vision_id = p_from order by position;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when check_violation then return jsonb_build_object('ok', false, 'message', 'تحقّق من الاسم والمعرّف والتاريخين: موعدُ النهاية بعد البداية.');
  when unique_violation then return jsonb_build_object('ok', false, 'message', 'هذا المعرّف لرؤيةٍ أخرى، اختر غيره.');
end;
$$;

-- ٦) حفظُ المسوّدة دفعةً واحدة: حقولُها، وعلامتُها، وحكايتُها، ومساراتُها بأهدافها (تُستبدل كلُّها: لا سجلَّ ولا فريقَ يتعلّق بها قبل الإطلاق)
create or replace function public.vision_plan_save(p_vision bigint, p_actor uuid, p_plan jsonb, p_rev integer)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v record;
  t jsonb; g jsonb; s jsonb; d jsonb;
  v_tid bigint; v_tp int := 0; v_gp int;
  v_goals int := 0;
begin
  if not coalesce(public.check_user_permission(p_actor, 'draft_vision'), false) then
    return jsonb_build_object('ok', false, 'message', 'إعداد الرؤى لإدارة الضمان والجودة والرئيسين.');
  end if;
  select * into v from public.visions where id = p_vision for update;
  if not found then return jsonb_build_object('ok', false, 'message', 'المسوّدة غير موجودة.'); end if;
  if v.status <> 'draft' then
    return jsonb_build_object('ok', false, 'message', case when v.status = 'review' then 'المسوّدة عند الرئيسين: اسحبها أولًا لتعدّلها.' else 'الرؤية أُطلقت، فلا تُعدَّل من هنا.' end);
  end if;
  if v.plan_rev <> coalesce(p_rev, -1) then
    return jsonb_build_object('ok', false, 'message', 'حُفظت المسوّدة من مكانٍ آخر بعد أن فتحتها: انسخ ما كتبت، ثمّ أعد تحميل الصفحة.');
  end if;
  if jsonb_typeof(p_plan->'tracks') <> 'array' or jsonb_array_length(p_plan->'tracks') > 8 then
    return jsonb_build_object('ok', false, 'message', 'المسارات من واحد إلى ثمانية.');
  end if;
  for s in select * from jsonb_array_elements(coalesce(p_plan->'stories', '[]'::jsonb)) loop
    if coalesce(s->>'art', '') not in ('all', 'layers', 'one')
       or char_length(btrim(coalesce(s->>'title', ''))) not between 2 and 60
       or char_length(btrim(coalesce(s->>'text', ''))) not between 2 and 600 then
      return jsonb_build_object('ok', false, 'message', 'بطاقةٌ في «فكرة الشعار» ناقصة: عنوانٌ ونصٌّ لكلّ بطاقة.');
    end if;
  end loop;
  if p_plan->'mark'->>'kind' = 'svg' then
    for d in select * from jsonb_array_elements(p_plan->'mark'->'layers') loop
      if jsonb_typeof(d) <> 'array' or exists (select 1 from jsonb_array_elements_text(d) x where x !~ '^[MmLlHhVvCcSsQqTtAaZz0-9eE.,[:space:]+-]{2,}$') then
        return jsonb_build_object('ok', false, 'message', 'ملفُّ العلامة فيه شكلٌ غير صالح، أعد رفعه.');
      end if;
    end loop;
  end if;

  update public.visions set
    name = btrim(p_plan->>'name'),
    slug = lower(btrim(p_plan->>'slug')),
    starts_on = (p_plan->>'starts_on')::date,
    horizon_on = (p_plan->>'horizon_on')::date,
    horizon_label = btrim(p_plan->>'horizon_label'),
    horizon_note = nullif(btrim(coalesce(p_plan->>'horizon_note', '')), ''),
    mark = case when p_plan->'mark'->>'kind' = 'svg'
                then jsonb_build_object('kind', 'svg', 'viewBox', p_plan->'mark'->>'viewBox', 'layers', p_plan->'mark'->'layers', 'file', left(coalesce(p_plan->'mark'->>'file', ''), 120))
                else '{"kind":"hilal"}'::jsonb end,
    mark_noun = btrim(coalesce(p_plan->>'mark_noun', 'العلامة')),
    idea_deck = nullif(btrim(coalesce(p_plan->>'idea_deck', '')), ''),
    stories = coalesce((select jsonb_agg(jsonb_build_object('title', btrim(x->>'title'), 'text', btrim(x->>'text'), 'art', x->>'art'))
                        from jsonb_array_elements(coalesce(p_plan->'stories', '[]'::jsonb)) x), '[]'::jsonb),
    return_note = null,
    plan_rev = plan_rev + 1
  where id = p_vision;

  delete from public.vision_tracks where vision_id = p_vision;
  for t in select * from jsonb_array_elements(p_plan->'tracks') loop
    v_tp := v_tp + 1;
    insert into public.vision_tracks (vision_id, position, name, summary, icon)
    values (p_vision, v_tp, btrim(t->>'name'), btrim(coalesce(t->>'summary', '')), coalesce(nullif(t->>'icon', ''), 'target'))
    returning id into v_tid;
    v_gp := 0;
    for g in select * from jsonb_array_elements(coalesce(t->'goals', '[]'::jsonb)) loop
      v_gp := v_gp + 1;
      v_goals := v_goals + 1;
      insert into public.vision_goals (track_id, position, cluster, title, detail, target, owner, baseline, due_on, status, updated_by)
      values (v_tid, v_gp, nullif(btrim(coalesce(g->>'cluster', '')), ''), btrim(g->>'title'), nullif(btrim(coalesce(g->>'detail', '')), ''),
              btrim(g->>'target'), btrim(g->>'owner'), nullif(btrim(coalesce(g->>'baseline', '')), ''), nullif(g->>'due_on', '')::date, 'pending', p_actor);
    end loop;
  end loop;

  -- ما رآه الرئيسان (أُرسل مرّةً) يُروى بعد ذلك كلُّ حفظٍ فيه
  if exists (select 1 from public.vision_log where vision_id = p_vision) then
    insert into public.vision_log (vision_id, actor, action, details)
    values (p_vision, p_actor, 'saved', jsonb_build_object('tracks', v_tp, 'goals', v_goals));
  end if;
  return jsonb_build_object('ok', true, 'slug', lower(btrim(p_plan->>'slug')), 'rev', v.plan_rev + 1);
exception
  when unique_violation then return jsonb_build_object('ok', false, 'message', 'هذا المعرّف لرؤيةٍ أخرى، اختر غيره.');
  when check_violation or not_null_violation or invalid_datetime_format or datetime_field_overflow then
    return jsonb_build_object('ok', false, 'message', 'في المسوّدة حقلٌ ناقص أو أطولُ من حدّه، ولم يُحفظ شيء.', 'detail', sqlerrm);
end;
$$;

-- ٧) أفعالُ الدورة. كلُّ فعلٍ يُكتب في السجلّ بفاعله، ويُرجع من يُشعَر به
create or replace function public.vision_plan_act(p_vision bigint, p_actor uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v record;
  v_seat text := public.vision_president_seat(p_actor);
  v_drafter boolean := coalesce(public.check_user_permission(p_actor, 'draft_vision'), false);
  v_manager boolean := coalesce(public.check_user_permission(p_actor, 'manage_vision'), false);
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_tracks int; v_bad int; v_goals int; v_done int; v_waiting int;
  v_presidents jsonb;
  v_n int;
begin
  select * into v from public.visions where id = p_vision for update;
  if not found then return jsonb_build_object('ok', false, 'message', 'الرؤية غير موجودة.'); end if;

  select coalesce(jsonb_agg(distinct user_id), '[]'::jsonb) into v_presidents from public.user_roles
   where is_active and not coalesce(is_acting, false) and frozen_by is null
     and role_name in ('club_president', 'executive_council_president') and user_id <> p_actor;

  if p_action = 'submit' then
    if not v_drafter then return jsonb_build_object('ok', false, 'message', 'الإرسال لمن يُعدّ الرؤى.'); end if;
    if v.status <> 'draft' then return jsonb_build_object('ok', false, 'message', 'المسوّدة ليست قيد الكتابة.'); end if;
    select count(*) into v_tracks from public.vision_tracks where vision_id = p_vision;
    select count(*) into v_bad from public.vision_tracks t where t.vision_id = p_vision and not exists (select 1 from public.vision_goals g where g.track_id = t.id);
    if v_tracks = 0 then return jsonb_build_object('ok', false, 'message', 'لا مسارَ في المسوّدة بعد.'); end if;
    if v_bad > 0 then return jsonb_build_object('ok', false, 'message', 'في المسوّدة مسارٌ بلا هدف: لكلّ مسارٍ هدفٌ واحدٌ على الأقلّ.'); end if;
    -- العلامةُ المرسومةُ تطابق الأهدافَ: طبقةٌ لكلّ مسار، وقطعةٌ لكلّ هدف بترتيبه
    if v.mark->>'kind' = 'svg' then
      if jsonb_array_length(v.mark->'layers') <> v_tracks or exists (
        select 1 from public.vision_tracks t
         where t.vision_id = p_vision
           and jsonb_array_length(v.mark->'layers'->(t.position - 1)) <> (select count(*) from public.vision_goals g where g.track_id = t.id)) then
        return jsonb_build_object('ok', false, 'message', 'العلامةُ لا تطابق الأهداف: طبقةٌ لكلّ مسار، وفي كلّ طبقةٍ قطعٌ بعدد أهداف مساره.');
      end if;
    end if;
    update public.visions set status = 'review', submitted_by = p_actor, submitted_at = now(), return_note = null where id = p_vision;
    delete from public.vision_approvals where vision_id = p_vision;
    insert into public.vision_log (vision_id, actor, action, from_status, to_status) values (p_vision, p_actor, 'submitted', 'draft', 'review');
    return jsonb_build_object('ok', true, 'slug', v.slug, 'name', v.name, 'notify', v_presidents);

  elsif p_action = 'recall' then
    if not v_drafter then return jsonb_build_object('ok', false, 'message', 'السحب لمن يُعدّ الرؤى.'); end if;
    if v.status <> 'review' then return jsonb_build_object('ok', false, 'message', 'المسوّدة ليست عند الرئيسين.'); end if;
    update public.visions set status = 'draft' where id = p_vision;
    delete from public.vision_approvals where vision_id = p_vision;
    insert into public.vision_log (vision_id, actor, action, from_status, to_status) values (p_vision, p_actor, 'recalled', 'review', 'draft');
    return jsonb_build_object('ok', true, 'slug', v.slug, 'name', v.name);

  elsif p_action = 'approve' then
    if v_seat is null then return jsonb_build_object('ok', false, 'message', 'الموافقةُ لرئيس أدِيب والرئيس التنفيذي بمقعديهما.'); end if;
    if v.status <> 'review' then return jsonb_build_object('ok', false, 'message', 'المسوّدة ليست بانتظار الموافقة.'); end if;
    insert into public.vision_approvals (vision_id, seat, user_id) values (p_vision, v_seat, p_actor) on conflict do nothing;
    get diagnostics v_n = row_count;
    if v_n > 0 then
      insert into public.vision_log (vision_id, actor, action, details) values (p_vision, p_actor, 'approved', jsonb_build_object('seat', v_seat));
    end if;
    select count(*) into v_n from public.vision_approvals where vision_id = p_vision;
    return jsonb_build_object('ok', true, 'slug', v.slug, 'name', v.name, 'both', v_n >= 2,
      'notify', case when v_n >= 2 and v.submitted_by is not null and v.submitted_by <> p_actor then jsonb_build_array(v.submitted_by) else '[]'::jsonb end);

  elsif p_action = 'unapprove' then
    if v_seat is null or v.status <> 'review' then return jsonb_build_object('ok', false, 'message', 'لا موافقةَ لك تُسحب.'); end if;
    delete from public.vision_approvals where vision_id = p_vision and seat = v_seat;
    get diagnostics v_n = row_count;
    if v_n > 0 then
      insert into public.vision_log (vision_id, actor, action, details) values (p_vision, p_actor, 'unapproved', jsonb_build_object('seat', v_seat));
    end if;
    return jsonb_build_object('ok', true, 'slug', v.slug, 'name', v.name);

  elsif p_action = 'send_back' then
    if v_seat is null then return jsonb_build_object('ok', false, 'message', 'الإعادةُ لرئيس أدِيب والرئيس التنفيذي.'); end if;
    if v.status <> 'review' then return jsonb_build_object('ok', false, 'message', 'المسوّدة ليست بانتظار الموافقة.'); end if;
    if v_note is null or char_length(v_note) < 2 then return jsonb_build_object('ok', false, 'message', 'اكتب ما يُصلَح فيها.'); end if;
    -- تصل الملاحظةُ من أرسلها، ومن كان وافق (سقطت موافقتُه)
    select coalesce(jsonb_agg(distinct u), '[]'::jsonb) into v_presidents from (
      select v.submitted_by u where v.submitted_by is not null
      union select user_id from public.vision_approvals where vision_id = p_vision
    ) x where u <> p_actor;
    update public.visions set status = 'draft', return_note = left(v_note, 500) where id = p_vision;
    delete from public.vision_approvals where vision_id = p_vision;
    insert into public.vision_log (vision_id, actor, action, from_status, to_status, note) values (p_vision, p_actor, 'sent_back', 'review', 'draft', left(v_note, 500));
    return jsonb_build_object('ok', true, 'slug', v.slug, 'name', v.name, 'notify', v_presidents);

  elsif p_action = 'launch' then
    if v_seat is null and not v_drafter then return jsonb_build_object('ok', false, 'message', 'الإطلاقُ للرئيسين ولمن يُعدّ الرؤى.'); end if;
    if v.status <> 'review' then return jsonb_build_object('ok', false, 'message', 'لا تُطلَق إلا مسوّدةٌ وافق عليها الرئيسان.'); end if;
    select count(*) into v_n from public.vision_approvals where vision_id = p_vision;
    if v_n < 2 then return jsonb_build_object('ok', false, 'message', 'لا تُطلَق حتى يوافق الرئيسان معًا.'); end if;
    if exists (select 1 from public.visions where status = 'active') then
      return jsonb_build_object('ok', false, 'message', 'في أدِيب رؤيةٌ سارية: تُطلَق هذه حين تُغلق تلك.');
    end if;
    update public.visions set status = 'active', launched_by = p_actor, launched_at = now() where id = p_vision;
    insert into public.vision_log (vision_id, actor, action, from_status, to_status) values (p_vision, p_actor, 'launched', 'review', 'active');
    return jsonb_build_object('ok', true, 'slug', v.slug, 'name', v.name);

  elsif p_action = 'close' then
    if v.status <> 'active' then return jsonb_build_object('ok', false, 'message', 'الرؤية ليست سارية.'); end if;
    if not (v_manager or exists (select 1 from public.vision_team where vision_id = p_vision and role in ('supervisor', 'leader') and profile_id = p_actor)) then
      return jsonb_build_object('ok', false, 'message', 'الإغلاقُ للمشرف العام وقائد الرؤية والرئيسين.');
    end if;
    select count(*) into v_waiting from public.vision_goals g join public.vision_tracks t on t.id = g.track_id where t.vision_id = p_vision and g.status = 'reported';
    if v_waiting > 0 then
      return jsonb_build_object('ok', false, 'message', 'في الرؤية «أُنجز» بانتظار التأكيد: أكّده أو أرجعه قبل الإغلاق.');
    end if;
    select count(*), count(*) filter (where g.status = 'done') into v_goals, v_done
      from public.vision_goals g join public.vision_tracks t on t.id = g.track_id where t.vision_id = p_vision;
    update public.visions set status = 'closed', closed_by = p_actor, closed_at = now() where id = p_vision;
    insert into public.vision_log (vision_id, actor, action, from_status, to_status, details)
    values (p_vision, p_actor, 'closed', 'active', 'closed', jsonb_build_object('done', v_done, 'total', v_goals));
    return jsonb_build_object('ok', true, 'slug', v.slug, 'name', v.name);

  elsif p_action = 'discard' then
    if not v_drafter then return jsonb_build_object('ok', false, 'message', 'الحذفُ لمن يُعدّ الرؤى.'); end if;
    if v.status <> 'draft' or exists (select 1 from public.vision_log where vision_id = p_vision) then
      return jsonb_build_object('ok', false, 'message', 'ما أُرسل للرئيسين مرّةً لا يُحذف: يبقى بسجلّه.');
    end if;
    delete from public.visions where id = p_vision;
    return jsonb_build_object('ok', true, 'slug', v.slug, 'name', v.name);
  end if;
  return jsonb_build_object('ok', false, 'message', 'فعلٌ غير معروف.');
exception
  -- إطلاقان معًا: يسبق أحدُهما، ويردّ الفهرسُ الفريد (`visions_one_active`) الآخر
  when unique_violation then return jsonb_build_object('ok', false, 'message', 'في أدِيب رؤيةٌ سارية: تُطلَق هذه حين تُغلق تلك.');
end;
$$;

revoke all on function public.vision_president_seat(uuid) from public, anon, authenticated;
revoke all on function public.vision_access(uuid, bigint) from public, anon, authenticated;
revoke all on function public.vision_plan_create(uuid, text, text, date, date, text, bigint) from public, anon, authenticated;
revoke all on function public.vision_plan_save(bigint, uuid, jsonb, integer) from public, anon, authenticated;
revoke all on function public.vision_plan_act(bigint, uuid, text, text) from public, anon, authenticated;
grant execute on function public.vision_president_seat(uuid) to service_role;
grant execute on function public.vision_access(uuid, bigint) to service_role;
grant execute on function public.vision_plan_create(uuid, text, text, date, date, text, bigint) to service_role;
grant execute on function public.vision_plan_save(bigint, uuid, jsonb, integer) to service_role;
grant execute on function public.vision_plan_act(bigint, uuid, text, text) to service_role;

-- ٨) مفتاحُ الغرفة المشتقّ يشمل من يُعدّ الرؤى (يدخلها ليصل إلى «الرؤى» ويرى السارية كلَّها بلا فعل)
create or replace function public.get_user_permissions(p_user_id uuid)
 returns table(permission_key text, permission_name_ar text, category text)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
    return query
    select distinct perm.permission_key, perm.permission_name_ar, perm.category
    from user_roles ur
    join role_permissions rp on rp.role_name = ur.role_name
    join permissions perm    on perm.id = rp.permission_id
    where ur.user_id  = p_user_id
      and ur.is_active = true

    union

    select distinct perm.permission_key, perm.permission_name_ar, perm.category
    from user_specific_permissions usp
    join permissions perm on perm.id = usp.permission_id
    where usp.user_id   = p_user_id
      and usp.is_granted = true
      and (usp.expires_at is null or usp.expires_at > now())

    union

    select perm.permission_key, perm.permission_name_ar, perm.category
    from permissions perm
    where (perm.permission_key = 'use_portal'
           and exists (select 1 from auth.users u where u.id = p_user_id))
       or (perm.permission_key = 'view_own_volunteering'
           and public.adeeb_standing(p_user_id) = 'volunteer')
       or (perm.permission_key = 'work_vision'
           and (exists (select 1 from public.vision_team vt join public.visions v on v.id = vt.vision_id
                        where vt.profile_id = p_user_id and v.status = 'active')
                or public.check_user_permission(p_user_id, 'manage_vision')
                or public.check_user_permission(p_user_id, 'draft_vision')))

    except

    select distinct perm.permission_key, perm.permission_name_ar, perm.category
    from user_specific_permissions usp
    join permissions perm on perm.id = usp.permission_id
    where usp.user_id   = p_user_id
      and usp.is_granted = false
      and (usp.expires_at is null or usp.expires_at > now());
end;
$function$;

-- ٩) الصفحةُ العلنيّة: العلامةُ وكلماتُها وحكايتُها من الرؤية نفسِها
create or replace function public.get_public_vision(p_slug text default null::text)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with v as (
    select * from public.visions
    where status in ('active', 'closed') and (p_slug is null or slug = p_slug)
    order by (status = 'active') desc, starts_on desc
    limit 1
  )
  select (
    select jsonb_build_object(
      'slug', v.slug,
      'name', v.name,
      'starts_on', v.starts_on,
      'horizon_label', v.horizon_label,
      'horizon_on', v.horizon_on,
      'horizon_note', v.horizon_note,
      'status', v.status,
      'mark', v.mark - 'file',
      'mark_noun', v.mark_noun,
      'idea_deck', v.idea_deck,
      'stories', v.stories,
      'tracks', coalesce((
        select jsonb_agg(jsonb_build_object(
          'position', t.position,
          'name', t.name,
          'summary', t.summary,
          'icon', t.icon,
          'goals', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', g.id, 'cluster', g.cluster, 'title', g.title, 'detail', g.detail,
              'target', g.target, 'owner', g.owner, 'due_on', g.due_on,
              'status', case when g.status = 'reported' then 'active' else g.status end, 'done_at', g.done_at
            ) order by g.position)
            from public.vision_goals g where g.track_id = t.id
          ), '[]'::jsonb)
        ) order by t.position)
        from public.vision_tracks t where t.vision_id = v.id
      ), '[]'::jsonb),
      'team', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'role', m.role,
          'track', t.position,
          'name', coalesce(p.full_name, m.name),
          'gender', coalesce(p.gender, m.gender),
          'avatar', case when p.account_status = 'active' and p.joined_date is not null then p.avatar_url end,
          'slug', case when p.account_status = 'active' and p.joined_date is not null then p.public_slug end
        ) order by m.id)
        from public.vision_team m
        left join public.vision_tracks t on t.id = m.track_id
        left join public.profiles p on p.id = m.profile_id
        where m.vision_id = v.id
      ), '[]'::jsonb),
      'archive', coalesce((
        select jsonb_agg(jsonb_build_object(
          'slug', o.slug, 'name', o.name, 'starts_on', o.starts_on,
          'horizon_label', o.horizon_label, 'status', o.status,
          'total', (select count(*) from public.vision_goals g join public.vision_tracks t on t.id = g.track_id where t.vision_id = o.id),
          'done', (select count(*) from public.vision_goals g join public.vision_tracks t on t.id = g.track_id where t.vision_id = o.id and g.status = 'done')
        ) order by o.starts_on desc)
        from public.visions o where o.status in ('active', 'closed') and o.id <> v.id
      ), '[]'::jsonb)
    )
    from v
  );
$function$;

-- ١٠) فريقُ الرؤية للسارية وحدها (المراجعةُ المستقلّة ٢٠٢٦-١١-٢٢): كان يُسمّى لمنتهيةٍ أو لمسوّدةٍ بنداءٍ مصنوع
create or replace function public.save_vision_team(p_vision_id bigint, p_actor uuid, p_seats jsonb)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_new jsonb;
  v_sup text;
  v_lead text;
begin
  if not coalesce(public.check_user_permission(p_actor, 'manage_vision'), false) then
    return jsonb_build_object('ok', false, 'message', 'تسمية فريق الرؤية للرئيسين.');
  end if;
  -- الفريقُ للسارية وحدها: المسوّدةُ لا فريقَ لها بعد، والمنتهيةُ تجمّد فريقُها معها
  if coalesce((select status from public.visions where id = p_vision_id), '') <> 'active' then
    return jsonb_build_object('ok', false, 'message', 'يُسمّى الفريقُ للرؤية السارية وحدها.');
  end if;

  select coalesce(s->>'profile_id', btrim(s->>'name')) into v_sup from jsonb_array_elements(coalesce(p_seats, '[]'::jsonb)) s where s->>'role' = 'supervisor' limit 1;
  select coalesce(s->>'profile_id', btrim(s->>'name')) into v_lead from jsonb_array_elements(coalesce(p_seats, '[]'::jsonb)) s where s->>'role' = 'leader' limit 1;
  if nullif(v_sup, '') is not null and v_sup = v_lead then
    return jsonb_build_object('ok', false, 'message', 'المشرف العام وقائد الرؤية شخصان: من رفع «أُنجز» يؤكّده الآخر.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('role', role, 'track_id', track_id, 'profile_id', profile_id, 'name', name, 'gender', gender) order by role, track_id), '[]'::jsonb)
    into v_before from public.vision_team where vision_id = p_vision_id;

  delete from public.vision_team where vision_id = p_vision_id;
  insert into public.vision_team (vision_id, role, track_id, profile_id, name, gender, updated_by)
  select p_vision_id,
         s->>'role',
         nullif(s->>'track_id', '')::bigint,
         nullif(s->>'profile_id', '')::uuid,
         nullif(btrim(s->>'name'), ''),
         nullif(s->>'gender', ''),
         p_actor
  from jsonb_array_elements(coalesce(p_seats, '[]'::jsonb)) s;

  select coalesce(jsonb_agg(jsonb_build_object('role', role, 'track_id', track_id, 'profile_id', profile_id, 'name', name, 'gender', gender) order by role, track_id), '[]'::jsonb)
    into v_after from public.vision_team where vision_id = p_vision_id;

  select coalesce(jsonb_agg(jsonb_build_object('profile_id', m.profile_id, 'role', m.role, 'track', t.position, 'track_name', t.name)), '[]'::jsonb)
    into v_new
    from public.vision_team m left join public.vision_tracks t on t.id = m.track_id
   where m.vision_id = p_vision_id and m.profile_id is not null
     and not exists (select 1 from jsonb_array_elements(v_before) b
                     where b->>'role' = m.role and coalesce(b->>'track_id', '') = coalesce(m.track_id::text, '')
                       and b->>'profile_id' = m.profile_id::text);

  if v_before is distinct from v_after then
    insert into public.vision_log (vision_id, actor, action, details)
    values (p_vision_id, p_actor, 'team', jsonb_build_object('before', v_before, 'after', v_after));
  end if;
  return jsonb_build_object('ok', true, 'assigned', v_new);
end;
$$;


revoke all on function public.save_vision_team(bigint, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_vision_team(bigint, uuid, jsonb) to service_role;
