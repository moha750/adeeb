-- إنهاء العضوية: بابٌ واحد وحَكَمٌ واحد
--
-- كان `account_status` عمودًا يُكتب مباشرةً، وحارسه الوحيد سياسة RLS تسأل عن **المستدعي**
-- (`manage_member_data`) ولا تسأل عن **المقصود** — فلا شيء يمنع صاحب القدرة من إنهاء عضويّة
-- نفسه ولا عضويّة من يعلوه. وثلاثةٌ من مساراتنا تكتب بمفتاح الخدمة فتتجاوز RLS أصلًا.
--
-- القاعدة الآن: **لا تُنهي عضويّة من لا تملك نزع مناصبه.** جملةٌ واحدة تُغني عن ترقيم الرتب
-- (`role_level` محظورٌ ومصيره الحذف): «الأعلى» = من لا تبلغه سلطتك في الهيكلة، والحَكَم الذي
-- يقيسها موجودٌ ومجرَّب — `can_assign_role` التي تقرؤها `assign_position` و`revoke_position`.
-- فمن وسّع سلطة قائدٍ في الهيكلة وسّعها في الإنهاء معًا، ولا يفترق البابان يومًا.

-- ═══ ١) الحَكَم: هل تبلغ سلطتُك عضويّةَ هذا العضو؟ ═══
create or replace function public.can_end_membership(p_actor uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    p_actor is not null and p_target is not null
    -- المانع الأوّل: لا يُنهي أحدٌ عضويّة نفسه — ولو ملك القدرة كاملةً
    and p_actor <> p_target
    -- المانع الثاني: رئيس النادي لا تُنهى عضويّته من اللوحة (كما يحميه revoke_position)
    and not exists (
      select 1 from user_roles ur
      where ur.user_id = p_target and ur.is_active and ur.role_name = 'club_president'
    )
    -- أرضيّة القدرة: سلطةُ بيانات الأعضاء أو قيادةُ وحدة. سلطةُ الهيكلة وحدها
    -- (`manage_positions`) تحرّك المناصب ولا تُنهي عضويّة — فعلان مختلفان لا يُخلطان.
    and (
      check_user_permission(p_actor, 'manage_member_data')
      or check_user_permission(p_actor, 'assign_unit_members')
    )
    -- المانع الثالث — المدى: لا تبلغ عضويّةً إلّا إن بلغتَ **كلّ** مناصب صاحبها.
    -- فمن يحمل منصبًا واحدًا خارج سلطتك خرجت عضويّته كلّها عن مدّك (أضيق آمنًا).
    and case
      when exists (select 1 from user_roles ur where ur.user_id = p_target and ur.is_active)
        then not exists (
          select 1 from user_roles ur
          where ur.user_id = p_target and ur.is_active
            and not can_assign_role(p_actor, ur.role_name, ur.committee_id)
        )
      -- بلا منصبٍ لا هيكلةَ تُقاس بها القرابة، فلا يبلغه إلّا صاحب سلطة الأعضاء كاملةً
      else check_user_permission(p_actor, 'manage_member_data')
    end;
$$;

comment on function public.can_end_membership(uuid, uuid) is
  'حَكَم إنهاء العضوية وإعادتها: لا نفسك، ولا رئيس النادي، ولا من لا تملك نزع كلّ مناصبه.';

-- ═══ ٢) القفل: لا يُكتب `suspended` إلّا من الباب ═══
-- تريغرٌ لا سياسة RLS: مساراتنا الخادميّة تكتب بمفتاح الخدمة فتتجاوز السياسات، والتريغر
-- يسري عليها كما يسري على غيرها. والعلَم محلّيٌّ بالمعاملة تفتحه الدالّتان وحدهما.
create or replace function public.guard_membership_status_gate()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  -- لا يعني هذا الحارسَ إلّا عبورُ حدّ «منتهية»: تفعيلُ الملتحق (pending_onboarding ← active) يمرّ كما كان
  if new.account_status is not distinct from old.account_status then return new; end if;
  if old.account_status is distinct from 'suspended'
     and new.account_status is distinct from 'suspended' then return new; end if;

  if coalesce(current_setting('app.membership_gate', true), '') = 'open' then return new; end if;

  raise exception 'إنهاء العضوية وإعادتها لا يكونان بكتابةٍ مباشرة — نادِ terminate_membership أو restore_membership (العضو %).', old.id
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_guard_membership_status_gate on public.profiles;
create trigger trg_guard_membership_status_gate
  before update of account_status on public.profiles
  for each row execute function public.guard_membership_status_gate();

-- ═══ ٣) البابان ═══
create or replace function public.terminate_membership(p_actor uuid, p_user uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
begin
  select account_status into v_status from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status = 'suspended' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY', 'message', 'عضويّته منتهية أصلًا.');
  end if;

  -- المانعان يُقالان بصريح اسمهما: رسالةٌ تُفهَم خيرٌ من «ممنوع» مبهمة
  if p_actor = p_user then
    return jsonb_build_object('ok', false, 'code', 'SELF', 'message', 'لا تُنهي عضويّتك بنفسك.');
  end if;
  if not can_end_membership(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ عضويّة هذا العضو — لا تُنهي إلّا عضويّة من تملك نزع مناصبه.');
  end if;

  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اذكر سبب إنهاء العضوية (خمسة أحرف فأكثر).');
  end if;

  perform set_config('app.membership_gate', 'open', true);
  update profiles
  set account_status = 'suspended', termination_reason = v_reason, updated_at = now()
  where id = p_user;
  perform set_config('app.membership_gate', '', true);

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'terminate_membership', 'profile', p_user::text, jsonb_build_object('reason', v_reason));

  return jsonb_build_object('ok', true, 'message', 'أُنهيت العضوية.');
end;
$$;

-- إعادة العضوية — نظيرةُ الإنهاء بالحَكَم نفسه. وجودها لازمٌ لا زائد: القفل أعلاه يمنع
-- الكتابة المباشرة، فلولاها لصار الإنهاء بابًا بلا رجعة. وتاريخُ الإنهاء يمحوه تريغر
-- `set_terminated_at`، فيُمحى سببُه معه ويُحفظ الاثنان في سجلّ النشاط.
create or replace function public.restore_membership(p_actor uuid, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_status text;
  v_reason text;
  v_at timestamptz;
begin
  select account_status, termination_reason, terminated_at into v_status, v_reason, v_at
  from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status is distinct from 'suspended' then
    return jsonb_build_object('ok', false, 'code', 'NOT_TERMINATED', 'message', 'عضويّته ليست منتهية.');
  end if;
  if not can_end_membership(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ عضويّة هذا العضو.');
  end if;

  perform set_config('app.membership_gate', 'open', true);
  update profiles
  set account_status = 'active', termination_reason = null, updated_at = now()
  where id = p_user;
  perform set_config('app.membership_gate', '', true);

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'restore_membership', 'profile', p_user::text,
          jsonb_build_object('previous_reason', v_reason, 'previous_terminated_at', v_at));

  return jsonb_build_object('ok', true, 'message', 'أُعيدت العضوية.');
end;
$$;

-- ═══ ٤) مرآة الواجهة ═══
-- كي تُخفي اللوحةُ الزرّ حيث تمنعه القاعدة — إخفاءٌ **فوق** منعٍ لا بدلًا منه. تقرأ الحَكَم
-- نفسه، فلا تُكتب قاعدةُ المدى مرّتين في لسانين ثمّ تفترقان.
create or replace function public.members_i_may_end(p_actor uuid)
returns table (user_id uuid)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id from profiles p where can_end_membership(p_actor, p.id);
$$;

grant execute on function public.can_end_membership(uuid, uuid) to authenticated, service_role;
grant execute on function public.terminate_membership(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.restore_membership(uuid, uuid) to authenticated, service_role;
grant execute on function public.members_i_may_end(uuid) to authenticated, service_role;
