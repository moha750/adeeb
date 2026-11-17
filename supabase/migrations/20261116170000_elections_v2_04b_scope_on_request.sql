-- ════════════════════════════════════════════════════════════════════════════════════════════
-- الدفعة الرابعة-ب من إصلاح الانتخابات: الخروج من نطاق المقعد «بطلبه» و«بغير طلبه» (2026-11-16)
-- المرجع: نظام الانتخابات، المادة 17. وقرار محمد (2026-11-16): مُنفِّذ النقل هو الذي يُقرّ أهو
-- بطلب صاحبه أم لا، ويُقيَّد إقراره في السجلّ ويُبلَّغ به العضو.
--
-- ما تفعله:
--   (١) `assign_position` و`revoke_position` تأخذان `p_on_request` (اختياريّ)، والدفعة تأخذه في كلّ
--       نقلة (`onRequest`). يُحفظ الإقرار في إعداد المعاملة `adeeb.move_cause` لكلّ عضو.
--   (٢) فحص النطاق صار يجري عند ختام المعاملة (محفّز مؤجَّل)، لا عند كلّ تحديث. فالدفعة تُخلي المقاعد
--       كلّها ثم تُسند، والإزالة تُطفئ المنصب ثم تُعيد العضو إلى مقعده: كان الفحص الفوريّ يرى العضو بلا
--       مقعد في اللحظة الوسطى فيُنهي ترشّحه وهو لم يخرج من النطاق أصلًا.
--   (٣) عند الختام، لكلّ ترشّحٍ قائم خرج صاحبه من نطاقه:
--         انتهت عضويّته            ← ينتهي (membership_ended)، في كلّ مرحلة قبل الإعلان.
--         بطلبه                    ← ينتهي (left_scope)، في كلّ مرحلة قبل الإعلان، ومعه أثر المادة 16.
--         بغير طلبه، أو بلا إقرار  ← يبقى، ويُقيَّد ذلك ويُبلَّغ صاحبه.
--       فلا ينتهي ترشّح بنقلٍ إلا بإقرارٍ صريح أنّه بطلب صاحبه.
--   (٤) تجميد الأصيل بتكليفٍ على غير المقعد يبقى فوريًّا كما في الرابعة-أ.
--
-- لا يتّصل بخدمةٍ خارجيّة: الإشعارات صفوفٌ في القاعدة، يوزّعها الموزّع بعد الختام.
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- ── ١. إقرار المنفّذ ────────────────────────────────────────────────────────────────────────
-- خريطةٌ في إعداد المعاملة: { "<user uuid>": "own" | "not" }. لا يمحو إقرارًا سابقًا بلا قيمة.
create or replace function public._note_move_cause(p_user uuid, p_on_request boolean)
returns void
language plpgsql
set search_path = public
as $$
declare
  v jsonb := coalesce(nullif(current_setting('adeeb.move_cause', true), ''), '{}')::jsonb;
begin
  if p_user is null or p_on_request is null then return; end if;
  perform set_config('adeeb.move_cause',
    (v || jsonb_build_object(p_user::text, case when p_on_request then 'own' else 'not' end))::text, true);
end;
$$;
revoke all on function public._note_move_cause(uuid, boolean) from public, anon, authenticated;

-- ── ٢. البابان يأخذان الإقرار ───────────────────────────────────────────────────────────────
-- تُضاف المعامِلة في آخر القائمة بقيمةٍ افتراضيّة، فكلّ نداءٍ قائم بسبع (أو أربع) يبقى صالحًا.
do $patch$
declare
  d   text;
  i   int;
  sig text[][] := array[
    array['public.assign_position(uuid,uuid,text,integer,integer,boolean,text)',
          'p_notes text DEFAULT NULL::text)',
          'p_notes text DEFAULT NULL::text, p_on_request boolean DEFAULT NULL::boolean)'],
    array['public.revoke_position(uuid,uuid,text,integer)',
          'p_committee integer DEFAULT NULL::integer)',
          'p_committee integer DEFAULT NULL::integer, p_on_request boolean DEFAULT NULL::boolean)']];
  k   int;
begin
  for k in 1 .. 2 loop
    d := pg_get_functiondef(sig[k][1]::regprocedure);
    if (length(d) - length(replace(d, sig[k][2], ''))) / length(sig[k][2]) <> 1 then
      raise exception '%: رأس الدالّة على غير ما يُنتظر', sig[k][1];
    end if;
    d := replace(d, sig[k][2], sig[k][3]);
    i := strpos(d, chr(10) || 'begin' || chr(10));
    if i = 0 then raise exception '%: لا بداية للمتن', sig[k][1]; end if;
    d := overlay(d placing chr(10) || 'begin' || chr(10)
                 || '  perform public._note_move_cause(p_user, p_on_request);  -- إقرار المنفّذ (المادة 17)' || chr(10)
                 from i for 7);
    execute 'drop function ' || sig[k][1];
    execute d;
  end loop;
end
$patch$;
revoke all on function public.assign_position(uuid, uuid, text, integer, integer, boolean, text, boolean) from public, anon, authenticated;
revoke all on function public.revoke_position(uuid, uuid, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.assign_position(uuid, uuid, text, integer, integer, boolean, text, boolean) to service_role;
grant execute on function public.revoke_position(uuid, uuid, text, integer, boolean) to service_role;

-- والدفعة: `onRequest` في كلّ نقلة، يُقيَّد قبل الإخلاء.
do $patch$
declare
  d text := pg_get_functiondef('public._run_position_batch(uuid,jsonb,bigint)'::regprocedure);
  rep text[][] := array[
    array['           t.ord' || chr(10) || '    from jsonb_array_elements(p_moves) with ordinality as t(e, ord);',
          '           t.ord,' || chr(10) || '           (e->>''onRequest'')::boolean as oreq' || chr(10)
          || '    from jsonb_array_elements(p_moves) with ordinality as t(e, ord);'],
    array['  -- الإخلاءُ كلُّه أوّلًا',
          '  -- إقرارُ المنفّذ لكلّ نقلة: أبطلب صاحبها أم لا (المادة 17)' || chr(10)
          || '  perform public._note_move_cause(b.u, b.oreq) from _pb b where b.oreq is not null;' || chr(10) || chr(10)
          || '  -- الإخلاءُ كلُّه أوّلًا']];
  i int;
begin
  for i in 1 .. array_length(rep, 1) loop
    if (length(d) - length(replace(d, rep[i][1], ''))) / length(rep[i][1]) <> 1 then
      raise exception '_run_position_batch: لم يقع الاستبدال %', i;
    end if;
    d := replace(d, rep[i][1], rep[i][2]);
  end loop;
  execute d;
end
$patch$;

-- ── ٣. هل العضو في نطاق المقعد؟ ─────────────────────────────────────────────────────────────
-- مقعد اللجنة: منصبٌ حيّ (أو أصيلٌ مجمَّد) في اللجنة نفسها. مقعد منسّق القسم: منصبٌ في القسم أو
-- في إحدى لجانه.
create or replace function public._in_candidacy_scope(p_user uuid, p_election uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from elections e
    join user_roles o on o.user_id = p_user and (o.is_active or o.frozen_by is not null)
    where e.id = p_election
      and ((e.target_role_name <> 'department_head' and e.target_committee_id is not null
            and o.committee_id = e.target_committee_id)
        or (e.target_role_name = 'department_head'
            and (o.department_id = e.target_department_id
                 or o.committee_id in (select c.id from committees c where c.department_id = e.target_department_id)))));
$$;
revoke all on function public._in_candidacy_scope(uuid, uuid) from public, anon, authenticated;

-- ── ٤. التجميد بتكليف: فوريّ كما كان ────────────────────────────────────────────────────────
create or replace function public.cascade_membership_loss_to_candidacy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r     record;
  v_act user_roles%rowtype;
begin
  -- الخروج من النطاق وانتهاء العضويّة انتقلا إلى `check_candidacy_scope` عند ختام المعاملة.
  if new.frozen_by is not null and old.frozen_by is null then
    select * into v_act from user_roles where id = new.frozen_by;
    for r in
      select ec.id from election_candidates ec join elections e on e.id = ec.election_id
      where ec.user_id = new.user_id and public._is_live_candidacy(ec.status)
        and e.archived_at is null and e.winner_candidate_id is null
        and e.status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed')
        and not (e.target_role_name = v_act.role_name
                 and e.target_committee_id is not distinct from v_act.committee_id
                 and e.target_department_id is not distinct from v_act.department_id)
    loop
      perform public._end_candidacy(r.id, 'frozen_by_acting', null, jsonb_build_object('acting_row', new.frozen_by));
    end loop;
  end if;
  return new;
end;
$$;

-- ── ٥. فحص النطاق عند ختام المعاملة ─────────────────────────────────────────────────────────
create or replace function public.check_candidacy_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r        record;
  v_member boolean;
  v_cause  text;
begin
  if not (old.is_active and not new.is_active and new.frozen_by is null) then return null; end if;
  v_member := coalesce(public.is_adeeb_member(new.user_id), false);
  v_cause  := coalesce(nullif(current_setting('adeeb.move_cause', true), ''), '{}')::jsonb ->> new.user_id::text;

  for r in
    select ec.id, ec.election_id
    from election_candidates ec join elections e on e.id = ec.election_id
    where ec.user_id = new.user_id and public._is_live_candidacy(ec.status)
      and e.archived_at is null and e.winner_candidate_id is null
      and e.status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed')
      -- المقاعد التي كان المنصبُ المُطفأ يُدخله في نطاقها، أو كلّها إن انتهت عضويّته
      and (not v_member
        or (old.committee_id is not null and e.target_committee_id = old.committee_id)
        or (e.target_role_name = 'department_head'
            and (e.target_department_id = old.department_id
                 or e.target_department_id = (select c.department_id from committees c where c.id = old.committee_id))))
  loop
    continue when v_member and public._in_candidacy_scope(new.user_id, r.election_id);

    if not v_member then
      perform public._end_candidacy(r.id, 'membership_ended', null, jsonb_build_object('role_row', new.id));
    elsif v_cause = 'own' then
      perform public._end_candidacy(r.id, 'left_scope', null, jsonb_build_object('role_row', new.id, 'on_request', true));
    elsif not exists (
      select 1 from election_audit_log l
      where l.election_id = r.election_id and l.event_type = 'candidacy_kept_after_move'
        and l.payload->>'candidate_id' = r.id::text and l.payload->>'role_row' = new.id::text
    ) then
      insert into election_audit_log (election_id, actor_id, event_type, payload)
      values (r.election_id, null, 'candidacy_kept_after_move',
              jsonb_build_object('candidate_id', r.id, 'role_row', new.id, 'declared', v_cause is not null));
      perform public._send_election_notification(
        r.election_id, 'specific_users', 'بقي ترشّحك',
        'نُقل منصبك خارج نطاق ' || public._election_target_label(r.election_id)
          || ' بغير طلبك، فبقي ترشّحك له (المادة 17).',
        'info', 'normal', array[new.user_id], jsonb_build_object('event', 'candidacy_kept_after_move'));
    end if;
  end loop;
  return null;
end;
$$;

create constraint trigger trg_candidacy_scope
  after update of is_active on public.user_roles
  deferrable initially deferred
  for each row execute function public.check_candidacy_scope();
