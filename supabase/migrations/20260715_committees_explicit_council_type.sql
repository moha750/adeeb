-- committees.council_type — تصريحٌ ببنية كانت تُستنتَج من فراغ.
--
-- ═══ المشكلة ═══
--
-- «إدارة الموارد البشرية» (22) و«إدارة الضمان والجودة» (23) ليستا لجنتين،
-- لكنهما مخزَّنتان صفَّين في جدول committees. والشيء الوحيد الذي يميّزهما
-- عن لجنة تشغيليّة هو أن department_id فيهما NULL.
--
-- أي أن الفراغ يحمل معنى: «هذه إدارة تحت المجلس الإداريّ».
-- وهذا انحراف عن معنى NULL نفسه (لا أعرف / لا ينطبق)، والمعنى الحقيقيّ
-- غير مكتوب في القاعدة — يعيش في الشيفرة وفي رؤوسنا.
--
-- وقد انتشر الاصطلاح إلى قارئين كثر (مقيس 2026-07-15):
--   القاعدة : is_target_position_vacant
--   V1      : admin/dashboard.js — ٦ مواضع تقسّم اللجان بـ null/not-null
--   V2      : v2/apps/web/src/app/dashboard/members/structure/model.ts:143-145
--             (النظام الجديد ورث الحيلة قبل أن يولد)
--
-- ═══ لماذا لا ننقلهما إلى جدول departments ═══
--
-- عشرة جداول تحمل مفتاحًا أجنبيًّا إلى committees:
--   elections, invitation_usages, member_details, member_evaluations,
--   membership_available_committees, membership_invitations, news,
--   notifications, surveys, user_roles
-- ومنها ١٣ صفًّا حيًّا يشير إلى 22/23 اليوم (user_roles=7، member_details=6).
-- نقل الصفَّين ييتّم هذه المراجع. فالصفّان يبقيان مكانهما.
--
-- ═══ الحلّ ═══
--
-- نجعل الضمنيّ صريحًا: عمود يقول ما هو الصفّ، بدل أن نستنتجه من فراغ.
-- بمفردات roles.council_type نفسها (administrative|executive) لئلّا تتعدّد
-- اللغات في قاعدة واحدة. ('both' لا معنى له لوحدة تنظيميّة — تتبع مجلسًا واحدًا.)
--
-- إضافيّ صرف: V1 لا يعرف بوجود العمود فلا يتأثّر. department_id يبقى كما هو
-- (لم نُفرّغه ولم نملأه)، فالقرّاء القدامى يعملون حتّى نحوّلهم واحدًا واحدًا.

alter table committees
  add column if not exists council_type text not null default 'executive';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'committees_council_type_check') then
    alter table committees
      add constraint committees_council_type_check
      check (council_type in ('administrative', 'executive'));
  end if;
end $$;

-- الحقيقة الحاليّة: ما لا قسم له هو إدارة تحت المجلس الإداريّ.
-- تُقرأ مرّةً واحدة هنا، ثمّ لا يعتمد عليها قارئ بعد اليوم.
update committees
   set council_type = 'administrative'
 where department_id is null
   and council_type <> 'administrative';

comment on column committees.council_type is
  'المجلس الذي تتبعه الوحدة. administrative = إدارة تحت المجلس الإداريّ (لا قسم لها). executive = لجنة تشغيليّة تحت قسم. المصدر الوحيد — لا تستنتج من department_id IS NULL.';
