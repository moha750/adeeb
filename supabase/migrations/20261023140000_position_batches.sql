-- دفعاتُ المناصب (٢٠٢٦-١٠-٢٣، قرار محمد): عدّةُ نقلاتٍ تُطبَّق معًا أو لا يُطبَّق منها شيء.
--
-- لماذا: كلُّ إسنادٍ اليومَ معاملةٌ وحده، فالتغييرُ المؤلَّفُ من نقلاتٍ يعتمد بعضُها على بعض
-- (تبديلُ قائدٍ ونائبه، دورةُ ثلاثةٍ بين مقاعدهم، التشكيلُ السنويّ) يفشل أو يحتاج إزالةً مؤقّتة:
-- المقعدُ الهدف مشغولٌ بمن سينتقل هو أيضًا، والاستبدالُ يترك المستبدَلَ بلا مقعدٍ فيردّه الحارس.
-- الدفعةُ تُخلي مقاعدَ المنتقلين كلَّهم أوّلًا ثمّ تُسنِد، في معاملةٍ واحدة، والحارسُ مؤجَّلٌ إلى
-- نهايتها (`trg_live_member_has_seat` DEFERRABLE INITIALLY DEFERRED).
--
-- • النقلةُ الواحدة تمرّ بـ`assign_position` نفسِها: قواعدُ السلطة والنطاق والتفرّد من مكانٍ واحد.
-- • تُفحص الدفعةُ كاملةً قبل التنفيذ: سلطةُ إخلاء كلِّ مقعدٍ قديم (بلقطةٍ قبل الإخلاء)، ومن يشغل
--   مقعدًا هدفًا وليس في الدفعة، والتكليف (لا يدخل الدفعةَ من منصبه مرتبطٌ بتكليف).
-- • إشعارٌ واحدٌ لكلّ منتقل بانتقاله النهائيّ: إشعاراتُ المناصب في أثناء الدفعة مكتومة
--   (`adeeb.batch_mute`)، ثمّ يُطلَق لكلٍّ «position.assigned» من مقعده قبلها إلى مقعده بعدها.
-- • «يسري في»: تاريخٌ لاحق يجعلها مجدولة، تُجرَّب الآن (وتُطوى) ثمّ تُطبَّق في يومها
--   (`run_due_position_batches`)، وتُفحص من جديد؛ فإن فسدت لم يُطبَّق منها شيء وأُبلغ منشئُها.
-- • «القرار أو السبب» سجلٌّ داخليّ في `position_batches` لا يصل العضوَ (قرار محمد)، وكلُّ مقعدٍ
--   جاء من دفعةٍ يحمل رقمَها (`user_roles.batch_id`).
-- • يلغي المجدولةَ منشئُها والرئيسان (قرار محمد).
-- • والبريدُ حين يكون المقعدُ الجديد أدنى من السابق بصيغةٍ محايدة لا تهنئة (قرار محمد): يُحمل
--   في الإشعار `down`، من الدفعة ومن `assign_position` كليهما.

-- ── ١) الجدول ─────────────────────────────────────────────────────────────────────────────
create table public.position_batches (
  id            bigint generated always as identity primary key,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  reason        text,
  effective_on  date,
  moves         jsonb not null,
  status        text not null check (status in ('scheduled', 'applied', 'failed', 'cancelled')),
  applied_at    timestamptz,
  failure       text,
  cancelled_by  uuid references public.profiles(id) on delete set null,
  cancelled_at  timestamptz
);
comment on table public.position_batches is
  'دفعاتُ المناصب: نقلاتٌ تُطبَّق معًا أو لا يُطبَّق منها شيء، فورًا أو في يومٍ لاحق. السببُ سجلٌّ داخليّ.';
alter table public.position_batches enable row level security;
revoke all on public.position_batches from anon, authenticated;
create index position_batches_due_idx on public.position_batches (effective_on) where status = 'scheduled';

alter table public.user_roles
  add column batch_id bigint references public.position_batches(id) on delete set null;
comment on column public.user_roles.batch_id is 'الدفعةُ التي جاء منها هذا المقعد، إن جاء من دفعة.';

-- ── ٢) كتمُ إشعارات المناصب في أثناء الدفعة ──────────────────────────────────────────────
create or replace function public.notify_event(p_kind text, p_facts jsonb default '{}'::jsonb, p_actor uuid default null::uuid)
 returns bigint
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id bigint;
begin
  -- الدفعةُ تُطلق لكلّ منتقلٍ إشعارًا واحدًا بانتقاله النهائيّ، فتكتم ما تُطلقه نقلاتُها في أثنائها.
  if p_kind like 'position.%' and current_setting('adeeb.batch_mute', true) = 'on' then
    return null;
  end if;
  insert into public.notification_events (kind, facts, actor_id)
  values (p_kind, coalesce(p_facts, '{}'::jsonb), p_actor)
  returning id into v_id;
  return v_id;
end;
$function$;

-- ── ٣) `assign_position` يحمل `down` في إشعار الإسناد ─────────────────────────────────────
do $do$
declare
  d text := pg_get_functiondef('public.assign_position(uuid,uuid,text,integer,integer,boolean,text)'::regprocedure);
  o text := $o$(v_vacated->0->>'department_id')::integer) end),$o$;
  n text := $n$(v_vacated->0->>'department_id')::integer) end,
             -- المقعدُ الجديد أدنى ممّا نُقل منه: يُبلَّغ بصيغةٍ محايدة لا تهنئة (٢٠٢٦-١٠-٢٣).
             'down', coalesce((select max(r.role_level) from jsonb_array_elements(v_vacated) e
                                 join roles r on r.role_name = e->>'role_name'), 0)
                     > coalesce((select r.role_level from roles r where r.role_name = v_role_name), 0)),$n$;
begin
  if (length(d) - length(replace(d, o, ''))) / length(o) <> 1 then
    raise exception 'assign_position: موضعُ الإشعار لم يُعثَر عليه مرّةً واحدة';
  end if;
  execute replace(d, o, n);
end;
$do$;

-- ── ٤) المنفّذ ─────────────────────────────────────────────────────────────────────────────
-- يرفع `ADBTC` برسالةٍ تُقرأ، فيطوي المستدعي ما جرى. لا يُنادى إلّا من الدوالّ أدناه.
create or replace function public._run_position_batch(p_actor uuid, p_moves jsonb, p_batch bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  m        record;
  v_r      jsonb;
  v_name   text;
  v_label  text;
  v_cnt    integer := 0;
begin
  if p_moves is null or jsonb_typeof(p_moves) <> 'array' or jsonb_array_length(p_moves) = 0 then
    raise exception using errcode = 'ADBTC', message = 'لا نقلات في الدفعة.';
  end if;

  drop table if exists pg_temp._pb;
  drop table if exists pg_temp._pb_before;
  create temp table _pb on commit drop as
    select (e->>'userId')::uuid as u,
           e->>'roleName' as r,
           nullif(e->>'committeeId', '')::integer as c,
           nullif(e->>'departmentId', '')::integer as d,
           t.ord
    from jsonb_array_elements(p_moves) with ordinality as t(e, ord);

  -- (أ) سلامةُ الدفعة نفسِها
  if exists (select 1 from _pb where u is null or r is null) then
    raise exception using errcode = 'ADBTC', message = 'في الدفعة نقلةٌ ناقصة: عضوٌ ومنصبٌ لكلّ نقلة.';
  end if;
  if exists (select 1 from _pb b where not exists (select 1 from profiles p where p.id = b.u)) then
    raise exception using errcode = 'ADBTC', message = 'في الدفعة عضوٌ غير موجود.';
  end if;

  select p.full_name into v_name
  from (select u from _pb group by u having count(*) > 1) x join profiles p on p.id = x.u limit 1;
  if v_name is not null then
    raise exception using errcode = 'ADBTC', message = 'لـ«' || v_name || '» أكثرُ من نقلةٍ في الدفعة.';
  end if;

  select coalesce(r.role_name_ar, b.r) || coalesce(' ' || c.committee_name_ar, ' ' || d.name_ar, '') into v_label
  from _pb b
  join roles r on r.role_name = b.r
  left join committees c on c.id = b.c
  left join departments d on d.id = b.d
  where r.holder_uniqueness is distinct from 'multi'
  group by b.r, b.c, b.d, r.role_name_ar, c.committee_name_ar, d.name_ar
  having count(*) > 1
  limit 1;
  if v_label is not null then
    raise exception using errcode = 'ADBTC', message = '«' || v_label || '» مقعدٌ واحد، ونُقل إليه أكثرُ من عضوٍ في الدفعة.';
  end if;

  -- (ب) التكليف لا يدخل الدفعة: له أبوابُه (تجميدٌ وأجلٌ وعودة)
  select p.full_name into v_name
  from _pb b join profiles p on p.id = b.u
  where exists (select 1 from user_roles ur where ur.user_id = b.u
                  and ((ur.is_active and ur.is_acting) or ur.frozen_by is not null))
  limit 1;
  if v_name is not null then
    raise exception using errcode = 'ADBTC', message = 'منصبُ «' || v_name || '» مرتبطٌ بتكليف: أنهِ التكليفَ أوّلًا ثمّ أدخِله في الدفعة.';
  end if;

  -- (ج) سلطةُ إخلاء المقاعد القديمة — بلقطةٍ قبل الإخلاء، على قواعد `assign_position` (٤) و(٤أ)
  for m in
    select ur.user_id, ur.role_name, ur.committee_id, p.full_name,
           coalesce(rl.role_name_ar, ur.role_name) || coalesce(' ' || c.committee_name_ar, ' ' || d.name_ar, '') as label,
           coalesce(rl.removal_needs_club_president, false) as needs_cp
    from _pb b
    join user_roles ur on ur.user_id = b.u and ur.is_active and not ur.is_acting
    join profiles p on p.id = b.u
    left join roles rl on rl.role_name = ur.role_name
    left join committees c on c.id = ur.committee_id
    left join departments d on d.id = ur.department_id
    where not (ur.role_name = b.r and ur.committee_id is not distinct from b.c
               and (b.c is not null or ur.department_id is not distinct from b.d))
  loop
    if not can_take_position_from(p_actor, m.user_id) then
      raise exception using errcode = 'ADBTC', message = '«' || m.full_name || '» في موضعٍ لا تطوله يدُك، فلا يُنقل إلّا بيد من يملك نزعه.';
    end if;
    if m.role_name <> 'committee_member' then
      if m.needs_cp and not is_club_president(p_actor) then
        raise exception using errcode = 'ADBTC', message = '«' || m.full_name || '» ' || m.label || '، ولا يعزل قائدَ الإدارة إلّا رئيسُ أدِيب.';
      end if;
      if not can_assign_role(p_actor, m.role_name, m.committee_id) then
        raise exception using errcode = 'ADBTC', message = '«' || m.full_name || '» يشغل «' || m.label || '»، ولا يُخلي مقعدَه إلّا من يملك التعيين فيه.';
      end if;
    end if;
  end loop;

  -- (د) مقعدٌ هدفٌ يشغله من ليس في الدفعة: لا يُستبدَل ضمنًا، فالمستبدَلُ يبقى بلا مقعد
  select coalesce(r.role_name_ar, b.r) || coalesce(' ' || c.committee_name_ar, ' ' || d.name_ar, ''), p.full_name
    into v_label, v_name
  from _pb b
  join roles r on r.role_name = b.r
  join user_roles ur on ur.role_name = b.r and ur.is_active
  join profiles p on p.id = ur.user_id
  left join committees c on c.id = b.c
  left join departments d on d.id = b.d
  where r.holder_uniqueness is distinct from 'multi'
    and not exists (select 1 from _pb b2 where b2.u = ur.user_id)
    and (r.holder_uniqueness = 'global'
         or (r.holder_uniqueness = 'per_committee'  and ur.committee_id  is not distinct from b.c)
         or (r.holder_uniqueness = 'per_department' and ur.department_id is not distinct from b.d))
  order by b.ord
  limit 1;
  if v_label is not null then
    raise exception using errcode = 'ADBTC',
      message = '«' || v_label || '» يشغله «' || v_name || '» وليس في الدفعة: أضف له نقلةً، أو اختر مقعدًا آخر.';
  end if;

  -- (هـ) التنفيذ
  perform set_config('adeeb.batch_mute', 'on', true);

  -- لقطةُ «قبل»: أعلى مقعدٍ أصيلٍ لكلّ منتقل، لإشعاره بما نُقل منه
  create temp table _pb_before on commit drop as
    select distinct on (ur.user_id)
           ur.user_id as u, ur.role_name as r, ur.committee_id as c, ur.department_id as d, rl.role_level as lvl
    from user_roles ur
    join _pb b on b.u = ur.user_id
    join roles rl on rl.role_name = ur.role_name
    where ur.is_active and not ur.is_acting
    order by ur.user_id, rl.role_level desc, ur.id;

  -- الإخلاءُ كلُّه أوّلًا: فالدورةُ لا تحتاج استبدالًا، ومقعدُ كلِّ منتقلٍ فارغٌ لمن بعده
  update user_roles ur set is_active = false
  from _pb b
  where ur.user_id = b.u and ur.is_active and not ur.is_acting
    and not (ur.role_name = b.r and ur.committee_id is not distinct from b.c
             and (b.c is not null or ur.department_id is not distinct from b.d));

  for m in select * from _pb order by ord loop
    v_r := assign_position(p_actor, m.u, m.r, m.c, m.d, false, null);
    if not coalesce((v_r->>'ok')::boolean, false) then
      select full_name into v_name from profiles where id = m.u;
      raise exception using errcode = 'ADBTC',
        message = coalesce(v_name, 'عضو') || ': ' || coalesce(v_r->>'message', 'تعذّر الإسناد.');
    end if;
    if p_batch is not null then
      update user_roles set batch_id = p_batch where id = (v_r->>'user_role_id')::integer;
    end if;
  end loop;

  perform set_config('adeeb.batch_mute', 'off', true);

  -- (و) إشعارٌ واحدٌ لكلّ منتقل: من مقعده قبل الدفعة إلى مقعده بعدها
  for m in
    select b.u, b.r, b.c, b.d, rl.role_level as tlvl, bf.r as fr, bf.c as fc, bf.d as fd, bf.lvl as flvl
    from _pb b
    join roles rl on rl.role_name = b.r
    left join _pb_before bf on bf.u = b.u
    order by b.ord
  loop
    continue when m.fr is not null and m.fr = m.r and m.fc is not distinct from m.c
                  and (m.c is not null or m.fd is not distinct from m.d);
    perform notify_event('position.assigned',
      _position_facts(m.r, m.c, m.d)
        || jsonb_build_object(
             'userId', m.u,
             'from', case when m.fr is not null then _position_facts(m.fr, m.fc, m.fd) end,
             'down', coalesce(m.flvl, 0) > coalesce(m.tlvl, 0)),
      p_actor);
    v_cnt := v_cnt + 1;
  end loop;

  return jsonb_build_object('ok', true, 'changed', v_cnt);
end;
$function$;

-- ── ٥) الإنشاء: فوريّة تُطبَّق، ومجدولةٌ تُجرَّب وتُطوى ثمّ تُحفظ ─────────────────────────────
create or replace function public.create_position_batch(p_actor uuid, p_moves jsonb, p_reason text default null, p_effective_on date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id    bigint;
  v_r     jsonb;
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
begin
  if not exists (
    select 1 from user_roles ur
    join position_authority pa on pa.role_name = ur.role_name
    where ur.user_id = p_actor and ur.is_active
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'لا تملك صلاحية إدارة الهيكلة.');
  end if;

  p_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if p_effective_on is not null and p_effective_on <= v_today then
    p_effective_on := null;
  end if;

  if p_effective_on is null then
    begin
      insert into position_batches (created_by, reason, effective_on, moves, status, applied_at)
      values (p_actor, p_reason, null, p_moves, 'applied', now())
      returning id into v_id;
      v_r := _run_position_batch(p_actor, p_moves, v_id);
    exception when sqlstate 'ADBTC' then
      return jsonb_build_object('ok', false, 'code', 'BATCH', 'message', sqlerrm);
    end;
    return jsonb_build_object('ok', true, 'status', 'applied', 'batch_id', v_id, 'changed', v_r->'changed');
  end if;

  -- مجدولة: تُجرَّب على الهيكل الآن ثمّ يُطوى ما جرى، فيُعرف خطؤها قبل يومها
  begin
    perform _run_position_batch(p_actor, p_moves, null);
    raise exception using errcode = 'ADDRY', message = 'dry';
  exception
    when sqlstate 'ADDRY' then null;
    when sqlstate 'ADBTC' then
      return jsonb_build_object('ok', false, 'code', 'BATCH', 'message', sqlerrm);
  end;

  insert into position_batches (created_by, reason, effective_on, moves, status)
  values (p_actor, p_reason, p_effective_on, p_moves, 'scheduled')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'status', 'scheduled', 'batch_id', v_id, 'effective_on', p_effective_on);
end;
$function$;

-- ── ٦) الإلغاء: منشئُها والرئيسان ─────────────────────────────────────────────────────────
create or replace function public.cancel_position_batch(p_actor uuid, p_batch bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_b position_batches%rowtype;
begin
  select * into v_b from position_batches where id = p_batch for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'الدفعة غير موجودة.');
  end if;
  if v_b.status <> 'scheduled' then
    return jsonb_build_object('ok', false, 'code', 'NOT_SCHEDULED', 'message', 'هذه الدفعة لم تعد مجدولة.');
  end if;
  if not (v_b.created_by = p_actor
          or exists (select 1 from user_roles ur where ur.user_id = p_actor and ur.is_active
                       and ur.role_name in ('club_president', 'executive_council_president'))) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'لا يلغي الدفعةَ إلّا منشئُها أو الرئيسان.');
  end if;
  update position_batches set status = 'cancelled', cancelled_by = p_actor, cancelled_at = now() where id = p_batch;
  return jsonb_build_object('ok', true, 'message', 'أُلغيت الدفعة.');
end;
$function$;

-- ── ٧) المجدولة في يومها ──────────────────────────────────────────────────────────────────
create or replace function public.run_due_position_batches()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  b     record;
  v_n   integer := 0;
  v_err text;
begin
  for b in
    select * from position_batches
    where status = 'scheduled' and effective_on <= (now() at time zone 'Asia/Riyadh')::date
    order by effective_on, id
    for update skip locked
  loop
    begin
      if b.created_by is null then
        raise exception using errcode = 'ADBTC', message = 'منشئ الدفعة لم يعد موجودًا.';
      end if;
      perform _run_position_batch(b.created_by, b.moves, b.id);
      update position_batches set status = 'applied', applied_at = now() where id = b.id;
      v_n := v_n + 1;
    exception when others then
      v_err := sqlerrm;
      update position_batches set status = 'failed', failure = v_err where id = b.id;
      if b.created_by is not null then
        perform notify_event('position.batch_failed',
          jsonb_build_object('batchId', b.id, 'userId', b.created_by,
                             'effectiveOn', b.effective_on, 'failure', v_err),
          null);
      end if;
    end;
  end loop;
  return v_n;
end;
$function$;

-- ── ٨) الأبواب: مفتاحُ الخدمة وحده ────────────────────────────────────────────────────────
revoke all on function public._run_position_batch(uuid, jsonb, bigint) from public, anon, authenticated;
revoke all on function public.create_position_batch(uuid, jsonb, text, date) from public, anon, authenticated;
revoke all on function public.cancel_position_batch(uuid, bigint) from public, anon, authenticated;
revoke all on function public.run_due_position_batches() from public, anon, authenticated;
grant execute on function public.create_position_batch(uuid, jsonb, text, date) to service_role;
grant execute on function public.cancel_position_batch(uuid, bigint) to service_role;

-- ── ٩) الكرون: الدقيقة ٤ من كلّ ساعة ──────────────────────────────────────────────────────
select cron.schedule('position-batches-sweep', '4 * * * *', 'select public.run_due_position_batches();');
