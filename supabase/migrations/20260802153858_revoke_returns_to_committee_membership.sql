-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260802153858   الاسم: revoke_returns_to_committee_membership

-- النزع يُرجع لا يُفرِغ.
--
-- كان `revoke_position` يُطفئ الصفّ ولا يكتب بديلًا، فيصير المنزوع بلا دورٍ إطلاقًا: عضوٌ
-- في السجلّ (`account_status='active'`) ولا شيءَ في الهيكل، ويسقط عنه مفتاح اللوحة نفسه
-- (`view_own_membership` قدرةُ الأدوار، ومن لا دورَ له لا يحملها). ستّة أعضاء في هذه الحال.
--
-- والقانون (المالك، 2026-08-02): من نُزع منصبُه عاد **عضوًا في لجنته السابقة**. فالعزل
-- نزعُ قيادةٍ لا إخراجٌ من النادي.
--
-- ولجنتُه السابقة تُعرف بوجهين:
--   · إن كان المنصب المنزوع مقيّدًا بلجنةٍ مقعدُ عضوها `committee_member` (قائدٌ أو نائب)
--     فهي لجنتُه — بلا تاريخ، وإن لم يكن عضوًا فيها قطّ.
--   · وإلّا (منسّق قسم · عضو إداريّ · مناصب بلا نطاق) فآخرُ عضويّة لجنةٍ أُطفئت له —
--     وهي التي خرج منها حين رُقّي، فيعود إليها.
--   · ومن لا هذا ولا ذاك (عضو لجنةٍ يُخرَج من لجنته) يبقى بلا دور، فليس تحته ما يُرَدّ إليه.
create or replace function public.revoke_position(p_actor uuid, p_user uuid, p_role_name text, p_committee integer default null::integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_removed integer;
  v_back    integer;
  v_row     integer;
  v_name    text;
begin
  if p_role_name = 'club_president' then
    return jsonb_build_object('ok', false, 'code', 'PROTECTED', 'message', 'لا يمكن إزالة رئيس النادي من هنا.');
  end if;

  if not can_assign_role(p_actor, p_role_name, p_committee) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ هذا المنصب.');
  end if;

  -- إلغاء تفعيل لا حذف صلب (تريغر القاعدة قد يسحب ترشّحًا انتخابيًّا نشطًا)
  update user_roles
  set is_active = false
  where user_id = p_user and role_name = p_role_name and is_active
    and committee_id is not distinct from p_committee;
  get diagnostics v_removed = row_count;

  if v_removed = 0 then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا تعيين نشطًا بهذه الصفة.');
  end if;

  -- الرجوع: لجنتُه السابقة — مقعدُها الأصليّ أوّلًا، ثمّ آخرُ عضويّةٍ أُطفئت له.
  if p_role_name <> 'committee_member' then
    select c.id into v_back
    from committees c
    where c.id = p_committee and c.member_role_name = 'committee_member' and c.is_active;

    if v_back is null then
      select ur.committee_id into v_back
      from user_roles ur
      join committees c on c.id = ur.committee_id
      where ur.user_id = p_user and not ur.is_active
        and ur.role_name = 'committee_member' and c.is_active
      order by ur.assigned_at desc nulls last
      limit 1;
    end if;
  end if;

  if v_back is not null then
    select id into v_row from user_roles
    where user_id = p_user and role_name = 'committee_member' and committee_id = v_back
    limit 1;

    if v_row is not null then
      update user_roles set is_active = true, assigned_by = p_actor, assigned_at = now(),
             notes = 'عاد عضوًا بعد نزع منصبه.'
      where id = v_row;
    else
      insert into user_roles (user_id, role_name, committee_id, department_id, is_active, assigned_by, notes)
      values (p_user, 'committee_member', v_back, null, true, p_actor, 'عاد عضوًا بعد نزع منصبه.');
    end if;

    select committee_name_ar into v_name from committees where id = v_back;
    return jsonb_build_object('ok', true, 'code', 'RETURNED',
      'message', 'أُزيل من المنصب — وعاد عضوًا في ' || coalesce(v_name, 'لجنته السابقة') || '.',
      'removed', v_removed, 'returned_committee_id', v_back);
  end if;

  return jsonb_build_object('ok', true, 'message', 'تمّت الإزالة.', 'removed', v_removed);
end;
$function$;

comment on function public.revoke_position(uuid, uuid, text, integer) is
  'نزعُ منصب. والمنزوع يعود عضوًا في لجنته السابقة (مقعدُ اللجنة المنزوع منها، أو آخرُ عضويّةٍ أُطفئت له) — العزل نزعُ قيادةٍ لا إخراجٌ من النادي.';
