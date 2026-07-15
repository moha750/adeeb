-- الوزن الانتخابيّ: من جدولٍ مفتاحه نصٌّ حرّ إلى تصريحٍ في الدور نفسه.
--
-- ═══ العلّة: الغياب يُحسم صامتًا ═══
--
-- election_vote_weights جدولٌ منفصل مفتاحه role_name نصًّا بلا FK ولا CHECK.
-- ومن لا صفَّ له يسقط صامتًا إلى وزن العضو المبتدئ عبر:
--     SELECT COALESCE(MAX(evw.weight), 1.0) ... LEFT JOIN election_vote_weights
-- فلا فرق في القاعدة بين «وزنه 1.0 سياسةً» و«نُسي صفُّه» — والصمت واحد.
--
-- ═══ العلاج: الوزن عمودٌ مُلزِم في roles ═══
--
-- roles.vote_weight بلا DEFAULT بعد الملء ⇒ كلّ دورٍ جديد مُلزَمٌ بالتصريح
-- بوزنه وإلّا رفضته القاعدة. فيصير النسيان مستحيلًا لا صامتًا.
--
-- ═══ الضمان والجودة: 1.0 سياسةٌ قائمة موثَّقة — لا قيمة افتراضيّة ═══
--
-- هذا الترحيل **ينقل القائم كما هو، ولا يصادق عليه**.
--
-- إقصاء الضمان من الوزن الانتخابيّ مكتوبٌ صراحةً، لا منسيّ:
--
--   1) 20260422000001_elections_01_schema.sql:15 يقول حرفيًّا:
--        «الأوزان حسب المواصفات الجديدة (QA غير مذكور عمداً — يسقط إلى 1.0 افتراضياً)»
--   2) is_top_admin_role و is_user_eligible_to_vote تعدّان أربعة أدوار
--      تصوّت في كلّ انتخاب: club_president و executive_council_president
--      و president_advisor و hr_committee_leader — والضمان ليس منها.
--   3) صفّا الموارد (3.0 و2.5) مكتوبان، وتوأماهما في الضمان متروكان.
--
-- وسطرٌ منسيّ واحد لا يُسقِط الدورَ نفسه من دالّتين أُخريَين. فالنمط سياسة:
-- الضمان جهةُ رقابة، وحيادُ المدقّق يأبى أن يزن صوته أثقل ممّن يدقّق عليه.
--
-- وسؤال «هل يستحقّ المدقّق وزنًا انتخابيًّا؟» قرار حوكمة مؤجَّل — لا يُحسم
-- في ترحيلٍ تقنيّ. فنكتب 1.0 لأنّها وزن الضمان الفعليّ اليوم، ونجعلها
-- مكتوبةً مقصودة بدل أن تكون مستنتَجة من غياب صفّ.

alter table roles
  add column if not exists vote_weight numeric(3,1);

-- (١) الأوزان المُصرَّح بها اليوم تُنقَل كما هي
update roles r
   set vote_weight = w.weight
  from election_vote_weights w
 where w.role_name = r.role_name
   and r.vote_weight is distinct from w.weight;

-- (٢) الأدوار بلا صفّ: وزنها الفعليّ اليوم 1.0 بحكم COALESCE — تُكتب صراحةً.
--     qa_committee_leader و qa_admin_member: سياسة موثَّقة (انظر أعلاه).
--     activity_coordinator: لا شاغل له ولا سياسة مكتوبة — يُحفظ القائم
--     ولا تُخترع له سياسة.
update roles
   set vote_weight = 1.0
 where role_name in ('qa_committee_leader', 'qa_admin_member', 'activity_coordinator')
   and vote_weight is null;

-- (٣) لا نخمّن لدورٍ لم نتوقّعه: إن ظهر دورٌ بلا وزن، يفشل الترحيل صائحًا
--     بدل أن يمنحه 1.0 صامتًا — وهي العلّة نفسها التي نعالجها.
do $$
declare v_missing text;
begin
  select string_agg(role_name, '، ') into v_missing from roles where vote_weight is null;
  if v_missing is not null then
    raise exception 'أدوار بلا وزن مُصرَّح: %. صرِّح بوزن كلّ دور — لا افتراض هنا.', v_missing;
  end if;
end $$;

-- (٤) بلا DEFAULT: التصريح واجبٌ على كلّ دورٍ جديد
alter table roles
  alter column vote_weight set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'roles_vote_weight_check') then
    alter table roles
      add constraint roles_vote_weight_check check (vote_weight > 0);
  end if;
end $$;

comment on column roles.vote_weight is
  'الوزن الانتخابيّ للدور. NOT NULL بلا DEFAULT: كلّ دورٍ جديد يُصرّح بوزنه صراحةً. مصدر الوزن الوحيد — election_vote_weights مُجمَّد.';

-- ═══ get_vote_weight: يقرأ التصريح ═══
--
-- COALESCE(...,1.0) يبقى لحالةٍ واحدة فقط: عضوٌ بلا أيّ دور نشط (MAX على
-- مجموعة خالية = NULL). أمّا الدور فوزنه مُصرَّح دائمًا الآن.
-- السلوك مطابق للقائم حرفيًّا: من كان وزنه 1.0 أمس فوزنه 1.0 اليوم.

create or replace function public.get_vote_weight(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $function$
    select coalesce(max(r.vote_weight), 1.0)
    from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = p_user
      and ur.is_active = true;
$function$;

comment on function public.get_vote_weight is
  'وزن تصويت العضو = أعلى وزن بين أدواره النشطة (roles.vote_weight). الافتراض 1.0 لمن لا دور نشط له.';

-- ═══ election_vote_weights: مُجمَّد لا مُسقَط ═══
--
-- «أضِف ولا تحذف»: يبقى الجدول، ولا يقرؤه أحد بعد اليوم (get_vote_weight
-- كانت قارئه الوحيد في القاعدة كلّها، ولا يذكره أيّ سطر تطبيقيّ).
--
-- وتُسحب صلاحية الكتابة: جدولٌ ميّت يقبل الكتابة فخٌّ — من يعدّل وزنًا فيه
-- يظنّ أنّه غيّر انتخابًا وهو لم يغيّر شيئًا. فليصرخ الرفض بدل أن يصمت
-- اللاأثر. والقراءة تبقى مفتوحة (سجلّ تاريخيّ).

drop policy if exists vote_weights_modify_admin on election_vote_weights;

comment on table election_vote_weights is
  'مُجمَّد (2026-07-15): مصدر الوزن صار roles.vote_weight ولا يقرأ هذا الجدول أحد. أُبقي سجلًّا تاريخيًّا ولم يُسقَط. الكتابة مسحوبة — لا أثر لها.';
