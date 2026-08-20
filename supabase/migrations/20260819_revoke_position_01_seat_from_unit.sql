-- ============================================================================
-- نزعُ المنصب: مقعدُ العودة يُقرأ من الوحدة، لا يُفترَض في الكود
--
-- العِلّة (2026-08-19): نزعُ أرياف من قيادة الموارد البشرية كان **يفشل كلَّه**:
--
--     23514: هذه الوحدة لا تُصرّح بهذا المقعد: «committee_member» لا يُجلَس في الوحدة رقم 22.
--
-- والسببُ أنّ `revoke_position` لا تكتفي بالنزع، بل تُعيد المنزوعَ عضوًا في وحدته —
-- وتفعل ذلك باسمِ مقعدٍ **محفوظٍ في نصّها**: `committee_member`. وهو صحيحٌ في كلّ لجنةٍ
-- إلّا الإدارتين العليين: مقعدُ العضو في الموارد البشرية `hr_admin_member` وفي الضمان
-- `qa_admin_member`. فتُحاول الدالّةُ إجلاسه على مقعدٍ لا وجود له في وحدته، فيردّها حارسُ
-- `enforce_seat_belongs_to_unit`، ويصعد الاستثناءُ بلا التقاطٍ فيُسقِط المعاملةَ كلَّها —
-- حتى إطفاءُ القيادة الذي كان قد نجح قبل سطر. فالنتيجةُ: لا يُنزَع أحدٌ منهما أبدًا.
--
-- والعلاجُ جذرُه لا عرَضُه: **اسمُ المقعد بيانٌ لا نصّ**. `committees.member_role_name`
-- يقوله لكلّ وحدةٍ بعينها، فتسأله الدالّةُ بدل أن تفترضه. فتُصلح الإدارتين اليوم، وكلَّ
-- وحدةٍ تُنشأ غدًا لمقعد عضوها اسمٌ خاصّ.
--
-- التحقّق قبل الكتابة: نُفِّذ الفعلان على الإنتاج داخل معاملةٍ أُلغيت، فنجحا:
--   أرياف ← hr_admin_member في الموارد البشرية · غادة ← qa_admin_member في الضمان.
-- ============================================================================

begin;

-- ١) الدالّة — لا يتغيّر منها إلّا مصدرُ اسم المقعد (والحرّاسُ والحمايةُ كما هي).
create or replace function public.revoke_position(
  p_actor uuid, p_user uuid, p_role_name text, p_committee integer default null
)
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

  -- الرجوع: من نُزع منصبُه يعود عضوًا. وشرطُه ألّا يكون المنزوعُ هو مقعدَ العضو نفسَه —
  -- فمن خرج من العضويّة لا يُعاد إليها. (كان الشرطُ `<> 'committee_member'` باسمٍ محفوظ.)
  if not exists (
    select 1 from committees c where c.id = p_committee and c.member_role_name = p_role_name
  ) then
    -- (أ) وحدتُه نفسُها أوّلًا — ومقعدُها باسمِه الذي تقوله هي.
    select c.id, c.member_role_name into v_back, v_seat
    from committees c
    where c.id = p_committee and c.is_active and c.member_role_name is not null;

    -- (ب) وإلّا فآخرُ عضويّةٍ أُطفئت له — والعضويّةُ تُعرَف بأنّ اسمَ صفِّها هو مقعدُ
    --     عضو تلك الوحدة، لا بأنّه `committee_member` (فالقيادةُ المطفأةُ ليست عضويّة).
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

  return jsonb_build_object('ok', true, 'message', 'تمّت الإزالة.', 'removed', v_removed);
end;
$function$;

-- ٢) تنظيفٌ لا علاج — صفوفٌ ميّتةٌ مرحَّلةٌ من نتائج العضوية (2026-06-30) تقول
--    `committee_member` في الإدارتين، وهو مقعدٌ لا يُجلَس فيهما. نُسمّيها بمقعدها الصحيح
--    فيصدُق السجلّ (والدالّةُ الجديدة تتجاهلها أصلًا، فهذا تصحيحُ تاريخٍ لا شرطُ عمل).
--
--    وشرطُ `not exists` ليس زينة: أربعةٌ من السبعة لأصحابها صفٌّ بالاسم الصحيح في
--    الوحدة نفسِها، فتسميتُها تصطدم بـ`user_roles_user_role_name_committee_key`
--    وتُسقِط الترحيل. فتُترَك على حالها (توأمٌ ميّتٌ لا يقرؤه أحد)، ولا تُحذَف ههنا:
--    الحذفُ إذنٌ يُطلب. والمسمّى فعلًا ثلاثةٌ: عايض وأرياف وغادة.
--
--    وكلُّها `is_active = false`، فلا يمسّ التصحيحُ منصبًا قائمًا.
update user_roles ur
set role_name = c.member_role_name
from committees c
where c.id = ur.committee_id
  and not ur.is_active
  and ur.role_name = 'committee_member'
  and c.member_role_name is distinct from 'committee_member'
  and not exists (
    select 1 from user_roles x
    where x.user_id = ur.user_id
      and x.role_name = c.member_role_name
      and x.committee_id = ur.committee_id
  );

commit;
