-- فئةُ سبب الخروج (قرار المالك ٢٠٢٦-١٠-٠٩)
--
-- صار الأعضاءُ السابقون قسمًا داخل تبويب «أعضاء أدِيب»، وفي رأسه حلقةُ «أسباب الخروج». والسببُ
-- نصٌّ حرٌّ: ٧٨ عضوًا سابقًا بسبعٍ وعشرين صياغة، والسببُ الواحدُ بصيغٍ عدّة («لا تتفاعل» و«مش موجود
-- بولا قروب»). فلا يُجمَّع النصُّ كما هو. فصار لكلّ إنهاءٍ **فئةٌ** من خمس بجانب نصّه، والنصُّ باقٍ
-- تفصيلًا لها:
--   idle   عدم التفاعل والغياب
--   silent خروج دون إبلاغ
--   asked  بطلب العضو
--   breach مخالفة أو إساءة
--   other  أسباب أخرى
--
-- الفئةُ تُكتب مع الإنهاء في كتابةٍ واحدة داخل `_apply_termination`، ومن طريقين:
--   - بابا السلطة (`terminate_membership` و`move_member_to_volunteers`) يحملانها صراحةً في توقيعٍ
--     رباعيّ جديد، ويضعانها في `app.termination_kind` قبل النداء (على سنّة `app.membership_gate`).
--   - الأبوابُ التي يخرج فيها العضوُ بإرادته (طلب الخروج، والخروج بنفسه، وحذف الحساب) فئتُها
--     معروفةٌ من مصدرها: «بطلب العضو».
-- والتوقيعان الثلاثيّان القديمان باقيان حتى تُنشر الواجهةُ الجديدة، ثمّ يُسقطان. ومن نادى أحدَهما
-- كُتبت فئتُه «أسباب أخرى».
--
-- والفئةُ تلازم الحال: تُمحى حين تعود العضويّة (`set_terminated_at`، كما يُمحى تاريخُ الإنهاء)، وقيدٌ
-- يمنع عضويّةً منتهيةً بلا فئة أو حيّةً بفئة.

alter table public.profiles add column termination_kind text
  constraint profiles_termination_kind_check
  check (termination_kind in ('idle', 'silent', 'asked', 'breach', 'other'));

-- التصنيفُ الأوّل للأعضاء السابقين (٧٨)، من نصوص أسبابهم كما هي يوم الترحيل.
-- الحارسُ يمنع تحرير عضويّةٍ منتهية، فيُرفع للتصنيف وحده ثمّ يعود في المعاملة نفسها.
alter table public.profiles disable trigger trg_guard_terminated_membership_profile;

update public.profiles p
set termination_kind = case
  when p.termination_reason like 'أنهى عضويّتَه بطلبه:%'
    or p.termination_reason like 'أنهى عضويّتَه بنفسه:%'
    or p.termination_reason = 'حذفَ صاحبُها حسابَه'
    or p.termination_reason in (
      'تقدّم العضو بطلب إنهاء عضويته',
      'طلب العضو إنهاء العضوية',
      'طلبت الانسحاب من النادي',
      'اعتذرت عن الاستمرار بالنادي لأسباب شخصية',
      'طلبت أنها تنسحب',
      'تقدم العضو بإنهاء عضويته لإنشغاله بحياته الوظيفية',
      'لأسباب أكاديمية أو شخصية')
    then 'asked'
  when p.termination_reason like 'خروج العضو من مجتمع أدِيب دون إبلاغ%'
    or p.termination_reason = 'خروج دون إبلاغ الـ HR'
    then 'silent'
  when p.termination_reason in (
      'تطاول على الأعضاء الإداريين والخروج من دون إبلاغ ال HR',
      'مُخالفة أنظمة وسياسات النادي المذكورة بالدستور',
      'إساءة التعامل أو التطاول على الإدارة',
      'تسريب معلومات أو ملفات داخلية')
    then 'breach'
  when p.termination_reason in (
      'لا تتفاعل',
      'لا يتفاعل',
      'عدم الالتزام بمتطلبات العضوية و المشاركة',
      'الغياب المُستمر عن مهام اللجنة الموكلة',
      'عدم التفاعل و المشاركة في أعمال اللجنه',
      'عدم التفاعل مع أنشطة ومهام النادي خلال الفترة الماضية',
      'عدم المُشاركة بأعمال اللجنة',
      'مادخلت القروبات',
      'مش موجود بولا قروب',
      'مش موجودة بولا قروب',
      'مش موجودة في قروبات ومجتمع أدِيب',
      'عدم الانضمام لقروب الجنة',
      'عدم الانضمام لقروب اللجنة',
      'ماانضمت لأي قروب',
      'آخر تفاعل كان في رمضان',
      'عدم استكمال مُتطلبات الانضمام',
      'عدم تفعيل الحساب خلال المُهلة المُحددة',
      'عدم التجاوب مع قادة اللجنة أو الإدارة')
    then 'idle'
  else 'other'
end
where p.account_status = 'suspended';

alter table public.profiles enable trigger trg_guard_terminated_membership_profile;

alter table public.profiles add constraint profiles_termination_kind_state_check
  check ((coalesce(account_status, '') = 'suspended') = (termination_kind is not null));

-- العرضُ يحمل الفئة (يُضاف العمودُ في آخره، فلا يتغيّر ترتيبُ ما قبله)
create or replace view public.members with (security_invoker = on) as
 select id, full_name, email, phone, avatar_url, bio, username, gender, account_status, joined_date,
    termination_reason, terminated_at, city, created_at, updated_at, termination_kind
   from profiles
  where joined_date is not null;

-- الفئةُ تُمحى حين تعود العضويّة، كتاريخ الإنهاء
create or replace function public.set_terminated_at()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
BEGIN
    IF NEW.account_status = 'suspended'
       AND (OLD.account_status IS DISTINCT FROM 'suspended') THEN
        NEW.terminated_at := now();
    ELSIF NEW.account_status IS DISTINCT FROM 'suspended' THEN
        NEW.terminated_at := NULL;
        NEW.termination_kind := NULL;
    END IF;
    RETURN NEW;
END;
$function$;

create or replace function public._apply_termination(p_actor uuid, p_user uuid, p_reason text, p_source text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  -- الفئةُ من باب السلطة إن حملها، وإلّا فمن مصدر الإنهاء: من خرج بإرادته فبطلبه
  v_kind text := coalesce(
    nullif(current_setting('app.termination_kind', true), ''),
    case when p_source in ('exit_request', 'self_exit', 'account_deletion') then 'asked' else 'other' end);
begin
  perform set_config('app.membership_gate', 'open', true);
  update profiles
  set account_status = 'suspended', termination_reason = p_reason, termination_kind = v_kind, updated_at = now()
  where id = p_user;
  perform set_config('app.membership_gate', '', true);
  perform set_config('app.termination_kind', '', true);

  -- والمقعدُ يخلو مع صاحبه (2026-08-20): من خرج من النادي لا يبقى اسمُه في الهيكل
  update user_roles set is_active = false
  where user_id = p_user and is_active;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'terminate_membership', 'profile', p_user::text,
          jsonb_build_object('reason', p_reason, 'source', p_source, 'kind', v_kind));
end;
$function$;

-- بابُ السلطة بفئته
create or replace function public.terminate_membership(p_actor uuid, p_user uuid, p_reason text, p_kind text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  if p_actor = p_user then
    return jsonb_build_object('ok', false, 'code', 'SELF', 'message', 'لا تُنهي عضويّتك بنفسك.');
  end if;
  if not can_end_membership(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ عضويّة هذا العضو، فلا تُنهي إلّا عضويّة من تملك نزع مناصبه.');
  end if;

  if p_kind is null or p_kind not in ('idle', 'silent', 'asked', 'breach', 'other') then
    return jsonb_build_object('ok', false, 'code', 'KIND_REQUIRED', 'message', 'اختر فئة السبب.');
  end if;
  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اذكر سبب إنهاء العضوية (خمسة أحرف فأكثر).');
  end if;

  perform set_config('app.termination_kind', p_kind, true);
  perform _apply_termination(p_actor, p_user, v_reason, 'authority');

  return jsonb_build_object('ok', true, 'message', 'أُنهيت العضوية.');
end;
$function$;

-- النقلُ إلى المتطوّعين بفئته. والمخالفةُ والخروجُ دون إبلاغ لا يُختمان بتطوّع، كما أنّ أسبابَ
-- النقل أربعةٌ فقط في الواجهة (`VOLUNTEER_MOVE_REASONS`).
create or replace function public.move_member_to_volunteers(p_actor uuid, p_user uuid, p_reason text, p_kind text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
  if p_actor = p_user then
    return jsonb_build_object('ok', false, 'code', 'SELF', 'message', 'لا تُنهي عضويّتك بنفسك.');
  end if;
  if not can_end_membership(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ عضويّة هذا العضو، فلا تُنهي إلّا عضويّة من تملك نزع مناصبه.');
  end if;
  if p_kind is null or p_kind not in ('idle', 'asked', 'other') then
    return jsonb_build_object('ok', false, 'code', 'KIND_REQUIRED', 'message', 'اختر فئة السبب.');
  end if;
  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اذكر سبب إنهاء العضوية (خمسة أحرف فأكثر).');
  end if;

  perform set_config('app.termination_kind', p_kind, true);
  perform _apply_termination(p_actor, p_user, v_reason, 'to_volunteer');

  -- من كان متطوّعًا قبل عضويّته يعود صفُّه نفسُه نشطًا، ويبقى خبرُ انتهائه السابق كما هو
  insert into volunteers (user_id, status, applied_at)
  values (p_user, 'active', now())
  on conflict (user_id) do update
    set status = 'active',
        returned_at = now();

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'member_to_volunteer', 'profile', p_user::text, jsonb_build_object('reason', v_reason, 'kind', p_kind));

  return jsonb_build_object('ok', true, 'message', 'انتهت عضويّتُه، وصار متطوّعًا.');
end;
$function$;

-- يُناديان بمفتاح الخدمة وحده، كأخويهما الثلاثيّين
revoke all on function public.terminate_membership(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.move_member_to_volunteers(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.terminate_membership(uuid, uuid, text, text) to service_role;
grant execute on function public.move_member_to_volunteers(uuid, uuid, text, text) to service_role;

notify pgrst, 'reload schema';
