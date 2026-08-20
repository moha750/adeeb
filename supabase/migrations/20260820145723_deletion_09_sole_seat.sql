-- **المقعدُ الوحيد يُنقَل أو يُنهى، ولا يُنزَع في الهواء** — عطبٌ أمسكه المالكُ بيده.
--
-- حاول إزالةَ «مستشار رئيس النادي» من منصبه، فردّه حارسُ «لا عضويّةَ حيّةٌ بلا مقعد» برسالةٍ
-- خام عند ختم المعاملة: `تعذّرت الإزالة: لا عضويّةَ حيّةٌ بلا مقعد (...)`.
--
-- **والحارسُ مصيب، والرسالةُ في غير موضعها.** فـ`revoke_position` تُعيد صاحبَ المنصب **عضوًا
-- في لجنته** بعد نزعه — وذلك يكفي لمن كان في لجنة. أمّا من لا لجنةَ له (المستشار، والرئيسان،
-- ومنسّقُ القسم) فلا مقعدَ يرجع إليه، فيقع بلا مقعدٍ وهو عضوٌ حيّ: حالٌ لا يعرفها دستورُ
-- النادي (قرارُ المالك ٢٠٢٦-٠٨-٢٠).
--
-- **فالعلاجُ أن يُقال قبل الفعل لا بعده**: تُجرَّب الإزالةُ في معاملةٍ داخليّة، فإن انتهت
-- بصاحبها بلا مقعدٍ رُدَّت كلُّها وعاد جوابٌ عربيٌّ يسمّي الطريقين: **انقله إلى مقعدٍ آخر**
-- (إسنادٌ ينقل بنفسه)، **أو أنهِ عضويّتَه** (والإنهاءُ يُفرِّغ المقعد منذ اليوم).
--
-- ولا يُكرَّر منطقُ الرجوع ههنا: يُنادى الأصلُ نفسُه داخل الكتلة، فإن فشل الشرطُ رجعت
-- المعاملةُ الداخليّةُ بما فيها. مصدرٌ واحدٌ للرجوع، وحكمٌ واحدٌ عليه.

create or replace function public.revoke_position(p_actor uuid, p_user uuid, p_role_name text, p_committee integer default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_removed integer;
  v_back    integer;
  v_seat    text;
  v_row     integer;
  v_name    text;
  v_live    boolean;
begin
  if p_role_name = 'club_president' then
    return jsonb_build_object('ok', false, 'code', 'PROTECTED', 'message', 'لا يمكن إزالة رئيس النادي من هنا.');
  end if;

  if not can_assign_role(p_actor, p_role_name, p_committee) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ هذا المنصب.');
  end if;

  select (p.joined_date is not null and p.account_status = 'active') into v_live
  from profiles p where p.id = p_user;

  -- إلغاء تفعيل لا حذف صلب (تريغر القاعدة قد يسحب ترشّحًا انتخابيًّا نشطًا)
  update user_roles
  set is_active = false
  where user_id = p_user and role_name = p_role_name and is_active
    and committee_id is not distinct from p_committee;
  get diagnostics v_removed = row_count;

  if v_removed = 0 then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا تعيين نشطًا بهذه الصفة.');
  end if;

  -- الرجوع: من نُزع منصبُه يعود عضوًا. وشرطُه ألّا يكون المنزوعُ هو مقعدَ العضو نفسَه.
  if not exists (
    select 1 from committees c where c.id = p_committee and c.member_role_name = p_role_name
  ) then
    select c.id, c.member_role_name into v_back, v_seat
    from committees c
    where c.id = p_committee and c.is_active and c.member_role_name is not null;

    if v_back is null then
      select ur.committee_id, c.member_role_name into v_back, v_seat
      from user_roles ur
      join committees c on c.id = ur.committee_id
      where ur.user_id = p_user and not ur.is_active
        and c.is_active and ur.role_name = c.member_role_name
      order by ur.assigned_at desc nulls last
      limit 1;
    end if;
  end if;

  if v_back is not null and v_seat is not null then
    select id into v_row from user_roles
    where user_id = p_user and role_name = v_seat and committee_id = v_back
    limit 1;

    if v_row is not null then
      update user_roles set is_active = true, assigned_by = p_actor, assigned_at = now(),
             notes = 'عاد عضوًا بعد نزع منصبه.'
      where id = v_row;
    else
      insert into user_roles (user_id, role_name, committee_id, department_id, is_active, assigned_by, notes)
      values (p_user, v_seat, v_back, null, true, p_actor, 'عاد عضوًا بعد نزع منصبه.');
    end if;

    select committee_name_ar into v_name from committees where id = v_back;
    return jsonb_build_object('ok', true, 'code', 'RETURNED',
      'message', 'أُزيل من المنصب، وعاد عضوًا في ' || coalesce(v_name, 'لجنته السابقة') || '.',
      'removed', v_removed, 'returned_committee_id', v_back);
  end if;

  -- **المقعدُ الوحيد**: عضوٌ حيٌّ لم يبقَ له مقعد. يُردّ الفعلُ كلُّه ويُسمّى الطريقان.
  if v_live and not exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active) then
    raise exception using errcode = 'ADEEB', message = 'SOLE_SEAT';
  end if;

  return jsonb_build_object('ok', true, 'message', 'تمّت الإزالة.', 'removed', v_removed);
exception when sqlstate 'ADEEB' then
  return jsonb_build_object('ok', false, 'code', 'SOLE_SEAT',
    'message', 'هذا مقعدُه الوحيد، ولا عضويّةَ في أديب بلا مقعد: انقله إلى مقعدٍ آخر بالإسناد، أو أنهِ عضويّتَه من تبويب الأعضاء.');
end;
$function$;

comment on function public.revoke_position(uuid, uuid, text, integer) is
  'نزعُ منصبٍ: يُعيد صاحبَه عضوًا في لجنته إن كانت له لجنة، ويردّ SOLE_SEAT إن كان مقعدَه الوحيد (2026-08-20).';
