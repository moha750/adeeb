-- ============================================================
-- مواءمة الهيكلة — المرحلة 1 (آمنة/إضافيّة). لا يُمَسّ أيّ role_name (خطّ أحمر).
--  (1) تسمية منسّق القسم الحقيقيّة (role_name_ar فقط؛ role_name يبقى 'department_head').
--  (2) محور معيَّن/منتخَب: عمود إضافيّ خامل (منتخَب = منسّق قسم/قائد لجنة/نائب).
-- الخلفية: ORG-REMODEL-PLAN.md
-- ============================================================

-- (1) الاسم الحقيقيّ للمنصب المنتخَب «منسّق قسم» (كان «رئيس قسم»)
update public.roles set role_name_ar = 'منسّق قسم' where role_name = 'department_head';

-- (2) محور طريقة الشغل (إضافيّ، لا يقرؤه شيء بعدُ)
alter table public.roles add column if not exists is_elected boolean;
update public.roles
set is_elected = (role_name in ('department_head', 'committee_leader', 'deputy_committee_leader'));
comment on column public.roles.is_elected is
  'يُشغَل بالانتخاب (منسّق قسم/قائد لجنة/نائب) = true؛ بالتعيين أو غير ذلك = false';
