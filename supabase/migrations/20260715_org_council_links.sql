-- ربط الأقسام واللجان بمجالسها — تصريحٌ بتبعيّة كانت تعيش في الشيفرة وحدها.
--
-- ═══ الحال قبل هذا الترحيل (مقيس على الإنتاج 2026-07-15) ═══
--
-- جدول councils فيه صفّان صحيحان (administrative, executive) لكنّه **جزيرة**:
--   عدد المفاتيح الأجنبيّة التي تشير إليه = صفر.
-- departments أعمدته: id, name_ar, name_en, description, display_order,
--   is_active, created_at, updated_at, group_link — لا council_id.
-- committees ترتبط بـdepartments فقط، والإدارتان (22, 23) بلا رابط إطلاقًا.
--
-- فالهيكلة أربع طبقات في الواقع، وفي القاعدة **رابط حقيقيّ واحد**:
--   committees -> departments. والباقي اصطلاحات في الكود.
--
-- ═══ ما يقرّره هذا الترحيل ═══
--
-- 1) departments.council_id  -> executive (الأقسام الأربعة كلّها تنفيذيّة)
-- 2) committees.council_id   -> administrative للإدارتين (22, 23)
--                               executive للجان التسع
--
-- ═══ حراسة التناقض ═══
--
-- تخزين council_id على اللجان يخلق تكرارًا: لجنة تحت قسم، ومجلسها
-- مستنتَج من قسمها أصلًا. فما يمنع لجنةً تنفيذيّة أن تدّعي أنها إداريّة؟
--
-- نمنعه بمفتاح أجنبيّ مركّب لا بتريغر:
--   departments UNIQUE (id, council_id)
--   committees  FK (department_id, council_id) -> departments (id, council_id)
--
-- فأيّ لجنة لها قسم يجب أن يطابق مجلسُها مجلسَ قسمها — تفرضه القاعدة نفسها.
-- وسلوك MATCH SIMPLE يجعل القيد يتجاوز الصفوف التي department_id فيها NULL،
-- أي أن الإدارتين تمرّان بـcouncil_id='administrative' بلا تعارض. مقصود.
--
-- إضافيّ صرف: department_id لم يُمسّ، ولا صفّ قائم تغيّر معناه.

-- ── 1) الأقسام تعرف مجلسها ──
alter table departments
  add column if not exists council_id text not null default 'executive';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'departments_council_id_fkey') then
    alter table departments
      add constraint departments_council_id_fkey
      foreign key (council_id) references councils (id);
  end if;

  -- لازم لهدف المفتاح المركّب أدناه
  if not exists (select 1 from pg_constraint where conname = 'departments_id_council_id_key') then
    alter table departments
      add constraint departments_id_council_id_key unique (id, council_id);
  end if;
end $$;

-- ── 2) اللجان والإدارتان تعرف مجلسها ──
alter table committees
  add column if not exists council_id text not null default 'executive';

update committees
   set council_id = 'administrative'
 where department_id is null
   and council_id is distinct from 'administrative';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'committees_council_id_fkey') then
    alter table committees
      add constraint committees_council_id_fkey
      foreign key (council_id) references councils (id);
  end if;

  -- الحارس: لجنة لها قسم يجب أن يطابق مجلسها مجلس قسمها.
  -- (department_id = NULL يتجاوز القيد — وهو ما تحتاجه الإدارتان.)
  if not exists (select 1 from pg_constraint where conname = 'committees_department_council_fkey') then
    alter table committees
      add constraint committees_department_council_fkey
      foreign key (department_id, council_id) references departments (id, council_id);
  end if;
end $$;

comment on column departments.council_id is
  'المجلس الذي يتبعه القسم. المصدر الوحيد — لا تستنتجه.';
comment on column committees.council_id is
  'المجلس الذي تتبعه الوحدة. administrative = إدارة تتبع المجلس الإداريّ مباشرةً. executive = لجنة تحت قسم. يحرسه مفتاح مركّب يطابقه بمجلس القسم.';
