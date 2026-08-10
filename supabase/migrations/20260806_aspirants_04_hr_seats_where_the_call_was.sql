-- ══════════════════════════════════════════════════════════════════════════════
-- **من يُجلس الطامحَ المقبول؟** — حدٌّ في اللائحة ظهر عند أوّل تجربة
--
-- `accept_aspirant` رفضت وأعادت التاريخَ كما كان («لا عضويّةَ بلا موضع»)، والسببُ في
-- `position_authority`: قائدُ الموارد يُسنِد المنسّقين والقادة والنوّاب — **لا أعضاء اللجان**.
-- فالموارد تملك قرارَ العضويّة ولا تملك إجلاسَ العضو. وهذا رسمُكم لا سهوُكم.
--
-- **قرار المالك (٢٠٢٦-٠٨-٠٦)**: يُمنح قائدُ الموارد إجلاسَ «عضو لجنة». وأثرُه أوسعُ من هذا
-- المسار (يستطيعه من تبويب التعيينات كذلك) — وهو متّسقٌ مع كونه سلطةَ العضويّة.
--
-- **والقيدُ الذي يجعله آمنًا**: اللجنةُ **تُشتقّ من النداء الذي اختير فيه** لا تُختار. فيُجلَس
-- الطامحُ حيث عمل، لا حيث شاء أحد — والقائدُ الذي رشّحه هو من حدّد مقعدَه بعملٍ لا برأي.
-- ومن لا نداءَ له يُردّ (`NO_CALL_HISTORY`): العضويّةُ ثمرةُ عملٍ في هذا الباب، ومن أراد
-- استثناءً فبابُه تبويبُ التعيينات بسلطته المعروفة.
-- ══════════════════════════════════════════════════════════════════════════════

update public.position_authority
set target_roles = array_append(target_roles, 'committee_member'),
    note = 'قائد إدارة الموارد — المنسّقون والقادة والنوّاب في كلّ النادي، والعضو الإداريّ في إدارته، وأعضاءُ اللجان (٢٠٢٦-٠٨-٠٦: لأجل قبول الطامحين).'
where role_name = 'hr_committee_leader'
  and not ('committee_member' = any(target_roles));

create or replace function public.accept_aspirant(p_user uuid, p_role text default 'committee_member')
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor     uuid := auth.uid();
  v_joined    date;
  v_committee integer;
  v_res       jsonb;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not check_user_permission(v_actor, 'manage_membership_applications') then raise exception 'NOT_AUTHORIZED'; end if;

  select joined_date into v_joined from profiles where id = p_user;
  if not found then raise exception 'NO_PROFILE'; end if;
  if v_joined is not null then raise exception 'ALREADY_MEMBER'; end if;
  if not exists (select 1 from membership_applications where user_id = p_user and status = 'waiting') then
    raise exception 'NO_WAITING_APPLICATION';
  end if;

  select t.committee_id into v_committee
  from task_assignments a
  join tasks t on t.id = a.task_id
  where a.user_id = p_user and a.selected_at is not null and t.kind = 'open_call'
  order by a.selected_at desc
  limit 1;

  if v_committee is null then raise exception 'NO_CALL_HISTORY'; end if;

  -- العضويّةُ أوّلًا (هي حدُّها في القاعدة)، ثمّ المنصب. وإن تعذّر المنصبُ رُدَّ التاريخ،
  -- فلا يبقى عضوٌ معلّقٌ بلا موضعٍ ولا مفتاحِ لوحة.
  update profiles set joined_date = current_date where id = p_user;

  v_res := assign_position(v_actor, p_user, p_role, v_committee, null, false, 'قبولُ طامحٍ بعد عملٍ حقيقيّ');
  if not coalesce((v_res ->> 'ok')::boolean, false) then
    update profiles set joined_date = null where id = p_user;
    raise exception 'ASSIGN_FAILED: %', coalesce(v_res ->> 'message', 'تعذّر إسناد المنصب');
  end if;

  update membership_applications
  set status = 'joined', decided_by = v_actor, decided_at = now()
  where user_id = p_user;

  return v_res;
end;
$$;

-- ولا `member_details` يُنشأ هنا عمدًا: من صار عضوًا ولا سجلَّ له تسوقه بوّابةُ اللوحة إلى
-- `/complete` عند أوّل دخول — والبابُ مبنيٌّ من م٢، فلا يُبنى ثانيًا.

revoke execute on function public.accept_aspirant(uuid, integer, text) from public, anon, authenticated;
drop function if exists public.accept_aspirant(uuid, integer, text);
grant execute on function public.accept_aspirant(uuid, text) to authenticated;
