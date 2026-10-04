-- نحرُ مسار الطامحين (قرار المالك ٢٠٢٦-١٠-٠٣)
--
-- طريقان إلى العضويّة كانا قائمَين: مسارُ الطامحين (م٥، ٢٠٢٦-٠٨-٠٦) — طلبُ عضويّةٍ ثمّ نداءاتٌ
-- مفتوحةٌ ثمّ قبول — والتطوّعُ ثمّ الإهداء. والمعتمدُ الثاني وحدَه: الطامحُ يمرّ بالتطوّع.
-- ولم يُستعمل الأوّلُ قطّ: صفرُ طلبات، وصفرُ نداءات، وصفرُ متطوّعين لنداء، وصفرُ أثرٍ في السجلّ،
-- ولا ينادي دوالَّه الكودُ المنشورُ ولا المحلّيّ.
--
-- **نفّذه المالكُ بيده في محرّر SQL**: أداةُ Supabase في جلسة الوكيل كانت تحبس كلَّ أمرٍ فيه حذفٌ
-- بانتظار تأكيدٍ لا يصل. فصفُّه في `schema_migrations` سطرٌ يشهد على نفسه، وهذا الملفُّ نصُّه الكامل.
--
-- وتبقى القدرةُ `manage_membership_applications`: عليها يقوم الإهداءُ اليوم (grant_membership_to_volunteer)،
-- فيُصحَّح اسمُها ووصفُها لا غير.
--
-- ويبقى `task_assignments.source` مؤقّتًا: الكودُ المنشورُ يقرؤه، فحذفُه قبل نشر الدفعة يكسر غرفةَ
-- المهامّ. يُقيَّد بقيمته الوحيدة الباقية، ويُحذف بعد النشر (ومعه يُعدَّل assign_task الذي يكتبه).

begin;
set local lock_timeout = '10s';

-- ١) قراءةُ المهامّ بلا النداء — قبل حذف دالّته، وإلّا ذهبت السياسةُ معها فاحتجبت المهامُّ عن الجميع
alter policy tasks_select on public.tasks
  using (
    can_manage_tasks_of((select auth.uid()), committee_id)
    or check_user_permission((select auth.uid()), 'view_members'::text)
    or is_my_task(id)
  );

-- ٢) دوالُّ المسار — بلا cascade: أيُّ تبعيّةٍ لم تُحصَ توقف الترحيلَ ولا تُحذف صامتة
drop function public.accept_aspirant(uuid, text);
drop function public.apply_for_membership();
drop function public.withdraw_application();
drop function public.recommend_aspirant(uuid, text);
drop function public.create_open_call(text, text, integer, date, integer, integer);
drop function public.volunteer_for_call(uuid);
drop function public.select_volunteer(uuid, boolean);
drop function public.may_see_open_call(uuid);

-- ٣) جدولُ الطلبات (صفرُ صفوف)
drop table public.membership_applications;

-- ٤) أعمدةُ النداء في المهامّ
alter table public.tasks drop column open_to_public_at;
alter table public.tasks drop column slots;
alter table public.tasks drop column kind;
alter table public.task_assignments drop column selected_at;
comment on table public.tasks is 'المهامّ — دفترُ ما يُكلَّف به الأعضاء.';

-- ٥) مصدرُ الإسناد: قيمةٌ واحدةٌ باقية حتّى يُحذف العمودُ بعد النشر
alter table public.task_assignments drop constraint task_assignments_source_check;
alter table public.task_assignments add constraint task_assignments_source_check check (source = 'assigned');

-- ٦) القدرةُ الباقية باسمها الصحيح
update public.permissions
set permission_name_ar = 'إهداء العضويّة',
    description = 'منحُ العضويّة لمتطوّعٍ نشط وإسنادُ مقعده في لجنة'
where permission_key = 'manage_membership_applications';

commit;
