-- committees.leader_role_name — كلّ وحدة تُصرّح بالدور الذي يقودها.
--
-- ═══ المشكلة ═══
--
-- أرياف القحطاني تقود «إدارة الموارد البشرية»، وغادة العتيبي تقود «إدارة
-- الضمان والجودة». والقاعدة لا تعرف ذلك: صفّاهما في user_roles حاملان
-- committee_id = NULL.
--
-- ولم يكن ذلك نسيانًا — القاعدة تمنعه. assign_position تصنّفهما:
--   v_no_scope := v_role_name in (..., 'hr_committee_leader', 'qa_committee_leader', ...);
--   if v_no_scope then p_committee := null; end if;
-- أي أنّ أيّ محاولة لربطهما بإدارتيهما تُمحى قسرًا.
--
-- فكيف يعرف V2 قائدة الإدارة؟ بمطابقة نصّ الاسم العربيّ:
--   model.ts:137  if (name.includes("موارد")) return firstOf(R.hrLeader);
--   model.ts:139  if (name.includes("ضمان") || name.includes("جودة")) ...
-- غيّر اسم الإدارة في القاعدة — تفقد قائدتها.
--
-- ═══ الحلّ: تعميم ما نجح مع المجالس ═══
--
-- councils.head_role_name يقول من يرأس المجلس. وبالمنطق نفسه:
--   committees.leader_role_name يقول أيّ دور يقود هذه الوحدة.
--     22 (إدارة الموارد)  -> hr_committee_leader
--     23 (إدارة الضمان)   -> qa_committee_leader
--     اللجان التسع        -> committee_leader
--
-- فالقيادة صفةُ الوحدة لا استنتاجًا من اسمها. وV2 يقرأ العمود بدل أن
-- يخمّن من نصّ عربيّ.
--
-- الدور لا الشخص: من يقود الإدارة اليوم قد يتغيّر، والدور يبقى.
-- والشاغل يُقرأ من user_roles عبر (الدور + اللجنة).
--
-- ═══ وملء الصفّين ═══
--
-- بعد أن صار للوحدة قائدٌ مُصرَّح، نربط الشاغلتين الحقيقيّتين بإدارتيهما.
-- (رفع v_no_scope من assign_position يأتي في ترحيل تالٍ — هذا يُثبّت
--  الحقيقة في البيانات أوّلًا.)

alter table committees
  add column if not exists leader_role_name text;

update committees set leader_role_name = 'hr_committee_leader'
 where id = 22 and leader_role_name is distinct from 'hr_committee_leader';

update committees set leader_role_name = 'qa_committee_leader'
 where id = 23 and leader_role_name is distinct from 'qa_committee_leader';

update committees set leader_role_name = 'committee_leader'
 where council_id = 'executive' and leader_role_name is distinct from 'committee_leader';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'committees_leader_role_name_fkey') then
    alter table committees
      add constraint committees_leader_role_name_fkey
      foreign key (leader_role_name) references roles (role_name);
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='committees'
               and column_name='leader_role_name' and is_nullable='YES')
     and not exists (select 1 from committees where leader_role_name is null) then
    alter table committees alter column leader_role_name set not null;
  end if;
end $$;

-- ── ربط الشاغلتين بإدارتيهما ──
update user_roles ur
   set committee_id = 22
  from roles r
 where r.id = ur.role_id and r.role_name = 'hr_committee_leader'
   and ur.is_active and ur.committee_id is null;

update user_roles ur
   set committee_id = 23
  from roles r
 where r.id = ur.role_id and r.role_name = 'qa_committee_leader'
   and ur.is_active and ur.committee_id is null;

comment on column committees.leader_role_name is
  'الدور الذي يقود هذه الوحدة (لا الشخص). إدارة -> hr/qa_committee_leader. لجنة تشغيليّة -> committee_leader. المصدر الوحيد — لا تطابق اسمها العربيّ.';
