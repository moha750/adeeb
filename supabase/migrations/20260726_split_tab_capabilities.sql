-- فصل التبويبات: لكلّ تبويبٍ قفلُه — لا مفتاحَ واحدٌ يفتح أربعة أبواب.
--
-- كان `view_members` يفتح أربعة تبويبات (أعضاء أديب · أعضاء سابقون · أعياد الميلاد · هيكلة أديب)،
-- و`manage_website` يفتح أربعةً أخرى (الأعمال · الإحصاءات · الرعاة · الأسئلة الشائعة). فمن أراد
-- أن يمنح أحدًا أعياد الميلاد وحدها لم يستطع. الآن: قدرةٌ لكلّ تبويب.
--
-- `view_members` يبقى — قفلًا لتبويب «أعضاء أديب» ولسياسات RLS الأربع عشرة التي تحرس بيانات
-- الأعضاء في القاعدة (فهو معنًى قائمٌ بذاته: من يقرأ الأعضاء). أمّا `manage_website` فتُنزَع عنه
-- جداول المحتوى الأربعة ويبقى حارسًا لـ`site_settings` و`testimonials` (جدولان لا تبويب لهما).
--
-- لا أحد يفقد وصولًا: كلّ قدرةٍ جديدة تُمنح لمن يملك أباها اليوم بالضبط.

/* ── ١) القدرات الجديدة ── */

insert into permissions (permission_key, permission_name_ar, category)
select v.key, v.name_ar, v.cat
from (values
  ('view_suspended_members', 'عرض الأعضاء السابقين',  'membership'),
  ('view_birthdays',         'عرض أعياد الميلاد',      'membership'),
  ('view_org_structure',     'عرض هيكلة أديب',         'membership'),
  ('manage_works',           'إدارة الأعمال',           'website'),
  ('manage_achievements',    'إدارة الإحصاءات',         'website'),
  ('manage_sponsors',        'إدارة الرعاة',            'website'),
  ('manage_faq',             'إدارة الأسئلة الشائعة',   'website')
) as v(key, name_ar, cat)
where not exists (select 1 from permissions p where p.permission_key = v.key);

/* ── ٢) المنح — وراثةٌ من الأب، فالوصول اليوم كالوصول أمس ── */

-- تبويبات العضوية ترث ممّن يملك view_members
insert into role_permissions (role_id, permission_id)
select rp.role_id, child.id
from role_permissions rp
join permissions parent on parent.id = rp.permission_id and parent.permission_key = 'view_members'
join permissions child on child.permission_key in ('view_suspended_members','view_birthdays','view_org_structure')
where not exists (
  select 1 from role_permissions x where x.role_id = rp.role_id and x.permission_id = child.id
);

-- تبويبات المحتوى ترث ممّن يملك manage_website
insert into role_permissions (role_id, permission_id)
select rp.role_id, child.id
from role_permissions rp
join permissions parent on parent.id = rp.permission_id and parent.permission_key = 'manage_website'
join permissions child on child.permission_key in ('manage_works','manage_achievements','manage_sponsors','manage_faq')
where not exists (
  select 1 from role_permissions x where x.role_id = rp.role_id and x.permission_id = child.id
);

/* ── ٣) RLS — كلّ جدول محتوى يحرسه قفلُه هو ──
   الكتابة من اللوحة تمرّ بمفتاح الخدمة (يتجاوز RLS)، فهذه الطبقة تحرس النفاذ المباشر
   إلى PostgREST. تُعاد بنفس شكلها القديم (ALL · authenticated · using = with check). */

drop policy if exists works_write_website on works;
create policy works_write_website on works for all to authenticated
  using (check_user_permission(auth.uid(), 'manage_works'))
  with check (check_user_permission(auth.uid(), 'manage_works'));

drop policy if exists achievements_write_website on achievements;
create policy achievements_write_website on achievements for all to authenticated
  using (check_user_permission(auth.uid(), 'manage_achievements'))
  with check (check_user_permission(auth.uid(), 'manage_achievements'));

drop policy if exists sponsors_write_website on sponsors;
create policy sponsors_write_website on sponsors for all to authenticated
  using (check_user_permission(auth.uid(), 'manage_sponsors'))
  with check (check_user_permission(auth.uid(), 'manage_sponsors'));

drop policy if exists faq_write_website on faq;
create policy faq_write_website on faq for all to authenticated
  using (check_user_permission(auth.uid(), 'manage_faq'))
  with check (check_user_permission(auth.uid(), 'manage_faq'));
