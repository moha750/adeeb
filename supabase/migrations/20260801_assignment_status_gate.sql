-- عتبةُ الحالة في التكليف — «المعلَّق يُضمّ ولا يُسنَد، والموقوف لا شيء» (قرار المالك 2026-08-01)
--
-- **العطل المرصود:** لم يكن في النظام كلِّه حارسٌ يربط `account_status` بالتكليف.
-- `assign_position` تفحص وجود الملفّ وحده (`select 1 from profiles where id = p_user`)،
-- و`is_user_eligible_to_run` تفحص الأدوار والقدرة والنطاق ولا تسأل عن الحالة، و`check_user_permission`
-- عمياء عنها بطبعها. فبُرهن حيًّا (بلجنةٍ غير موجودة، فلا كتابة): «قيد الإكمال» و«موقوف»
-- كلاهما يعبر فحصَ العضو ويسقط عند فحص اللجنة — أيْ لا شيء يردّهما.
-- والحدُّ محترَمٌ في نصف النظام (منسّق الفعاليّة · أهل المجلس · بوّابة الاستبيان · كتّاب الأخبار ·
-- مذيعو الإذاعة · منتقي الصلاحيات · أعياد الميلاد)، وغائبٌ عن نصفه — والغائب هو نصفُ الهيكلة.
--
-- **لماذا تريغرٌ لا `create or replace` لـ`assign_position`:** الحارس يقع على الجدول فيمسك
-- **كلّ** طريقٍ إليه — الدالّة، ومنحَ الفائز الآليّ، وأيّ كتابةٍ بمفتاح الخدمة. واستبدالُ جسم
-- الدالّة كان سيخاطر بابتلاع تغييرٍ لاحقٍ لا نراه (وقع نظيرُه اليوم: `member_within_reach`
-- بقيت على الشكل القديم بعد فصل الإشراف).

-- ============================================================
-- (١) التكليف بدور — user_roles
-- ============================================================
create or replace function public.enforce_assignment_status()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_status text;
  v_council text;
  v_member_role text;
  v_name text;
  v_role text;
begin
  -- الصفّ الحيّ وحده يعني تكليفًا. إطفاءُ دورٍ أو مسُّ صفٍّ معطّل لا يُنشئ سلطةً فلا يُحرَس،
  -- وإلّا لتعذّر **نزعُ** منصبٍ عن موقوفٍ — وهو أوّل ما يُفعَل به.
  if not new.is_active then return new; end if;

  -- تعديلٌ لا يُنشئ تكليفًا جديدًا (الصفّ كان حيًّا بدوره ونطاقه) يمرّ — فلا يتعطّل
  -- ترميمٌ أو تحديثُ طابعٍ زمنيّ على صفٍّ قائم.
  if tg_op = 'UPDATE'
     and old.is_active
     and old.role_id is not distinct from new.role_id
     and old.role_name is not distinct from new.role_name
     and old.committee_id is not distinct from new.committee_id
     and old.department_id is not distinct from new.department_id then
    return new;
  end if;

  select account_status, full_name into v_status, v_name from profiles where id = new.user_id;
  if v_status = 'active' then return new; end if;

  -- الدور بالاسم — و**لا يُؤخَذ من `new.role_name` وحده**: بعض المسارات تُدرج `role_id` فقط
  -- (منحُ الفائز الآليّ نموذجًا) ويملأ الاسمَ تريغرُ مزامنةٍ قد يلي هذا في الترتيب الأبجديّ.
  -- فيُشتقّ من الكتالوج عند غيابه، وإلّا لرُدّ ضمٌّ مشروعٌ لأنّ الاسم لم يصل بعد.
  v_role := coalesce(new.role_name, (select r.role_name from roles r where r.id = new.role_id));

  -- «قيد الإكمال»: يُضمّ إلى لجنةٍ تنفيذيّة **عضوًا عاديًّا** ولا يُسنَد منصبًا.
  -- والعضويّة العاديّة تقولها اللجنة عن نفسها (`committees.member_role_name`) — لا اسمٌ محفور
  -- هنا يفترق عنها يوم يتغيّر.
  if v_status = 'pending_onboarding' then
    select c.council_id, c.member_role_name into v_council, v_member_role
    from committees c where c.id = new.committee_id;

    if v_council = 'executive' and v_member_role = v_role then
      return new;
    end if;

    raise exception 'لا يُسنَد منصبٌ لعضوٍ قيد الإكمال (%). يُضمّ إلى لجنةٍ عضوًا، وحين يُكمل بياناته يُسنَد.', coalesce(v_name, '—')
      using errcode = 'check_violation';
  end if;

  -- الموقوف (منتهية عضويّته) وغيرُ النشط: لا تكليف بحال.
  raise exception 'لا يُسنَد دورٌ لعضوٍ غير نشط (% — الحالة %). أعِد عضويّته أوّلًا.', coalesce(v_name, '—'), v_status
    using errcode = 'check_violation';
end;
$function$;

drop trigger if exists trg_enforce_assignment_status on public.user_roles;
create trigger trg_enforce_assignment_status
  before insert or update on public.user_roles
  for each row execute function public.enforce_assignment_status();

-- ============================================================
-- (٢) الترشّح — election_candidates
-- ============================================================
-- تريغرٌ ثانٍ لا تعديلٌ في `is_user_eligible_to_run`: تلك تُقرأ في ستّة مواضع لعرض
-- «ما أنت مؤهَّلٌ له»، والحارس الحقيقيّ يجب أن يقع عند الكتابة.
create or replace function public.enforce_candidacy_status()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_status text;
begin
  -- الانسحاب والمراجعة والتعديل تمرّ: الحارس على **تقديم** ترشّحٍ جديد وحده
  if tg_op = 'UPDATE' then return new; end if;

  select account_status into v_status from profiles where id = new.user_id;
  if v_status is distinct from 'active' then
    raise exception 'لا يترشّح إلّا العضو النشط (الحالة الآن: %).', coalesce(v_status, 'غير معروفة')
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_enforce_candidacy_status on public.election_candidates;
create trigger trg_enforce_candidacy_status
  before insert on public.election_candidates
  for each row execute function public.enforce_candidacy_status();

-- ============================================================
-- ملاحظةٌ لا تُنفَّذ — حالةٌ قائمة تحتاج قرارًا بشريًّا
-- ============================================================
-- «نوره عبدالله الشواكر» مرشّحةٌ **معتمدة** لنيابة قيادة لجنة التصوير (قدّمت 2026-07-11 وكانت
-- نشطة، ثمّ صارت «قيد الإكمال» في 16)، والانتخاب ما زال قائمًا (`voting_closed`). هذا التريغر
-- لا يمسّ صفَّها (يحرس الإدراج لا التحديث)، لكنّ تريغر (١) **سيردّ منحَها المنصب** إن فازت،
-- فيتعثّر `declare_winner`. القرار للمالك: إمّا تُكمل بياناتها قبل الإعلان، وإمّا يُسحَب ترشّحُها.
