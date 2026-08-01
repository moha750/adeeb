-- الدرجة العلمية: «أخرى» ← «موظف»، والحقول الأكاديميّة مشروطة بالدرجة.
--
-- القاعدتان اللتان يفرضهما هذا الترحيل (بقرار المالك ٢٠٢٦-٠٧-١٥):
--   • high_school و employee: بلا كلّية ولا تخصّص ولا رقم أكاديميّ — الثلاثة NULL إلزامًا.
--   • diploma/bachelor/master/phd: الثلاثة إلزاميّة — القيد يرفض الفارغ.
--
-- الأصل: نموذجا V1 لم يتّفقا قطّ. نموذج الالتحاق (membership.html) عرض «موظف» وأخفى الكلّية
-- والتخصّص لها ولـ«ثانوي»، ونموذج الانضمام (member-onboarding.html) عرض «أخرى» بلا «موظف»
-- وترجم بـ degreeMap يرتدّ إلى 'other'. وورث member_details الثاني. هذا الترحيل يوحّدهما على الأوّل.
--
-- ملاحظة: member_details_academic_degree_check كان مطبَّقًا حيًّا بلا ترحيل يسجّله. هذا الملفّ يردّه
-- إلى المستودع، فيصير تعريفه مكتوبًا لا شفويًّا.

begin;

-- ١) الرمز: other ← employee. صفر صفوف تحمله اليوم، فالسطر للاكتمال لا للحاجة.
update member_details set academic_degree = 'employee' where academic_degree = 'other';

-- ٢) جذر المشكلة: قيد NOT NULL هو ما أجبر طالب الثانوية على رقمٍ جامعيّ لا يملكه.
--    الإلزام ينتقل إلى القيد الشرطيّ أدناه، فيلزم من له درجة جامعيّة وحده.
--    يسبق التفريغ ضرورةً: القيد يرفض NULL ما دام قائمًا.
alter table member_details alter column academic_record_number drop not null;

-- ٣) الخلوّ: تفريغ الحقول الأكاديميّة عمّن لا درجة جامعيّة له.
--    يمحو ١٦ رقمًا أكاديميًّا على 'high_school'؛ تسعة منها بشكل سليم (تسع خانات) وسبعة حشوٌ ظاهر
--    («12»، نصّ غير رقميّ) ملأ قيد NOT NULL. محوٌ نهائيّ بلا نسخة احتياطيّة — بقرار المالك.
update member_details
set college = null, major = null, academic_record_number = null
where academic_degree in ('high_school', 'employee');

-- ٤) المفردات الستّ. الترتيب هنا لا يحكم العرض — يحكمه DEGREES في vocab.ts.
alter table member_details drop constraint if exists member_details_academic_degree_check;
alter table member_details add constraint member_details_academic_degree_check
  check (academic_degree in ('high_school', 'employee', 'diploma', 'bachelor', 'master', 'phd'));

-- ٥) الشرط: الحقول الأكاديميّة تتبع الدرجة — تفرضه القاعدة فلا يبقى اجتهادًا للواجهة.
--    النصّ الفارغ ممنوع صراحةً كالـ NULL، وإلّا لتسلّل الحشو من بابٍ آخر: '' يجتاز IS NOT NULL.
alter table member_details drop constraint if exists member_details_academic_fields_check;
alter table member_details add constraint member_details_academic_fields_check
  check (
    case
      when academic_degree in ('high_school', 'employee')
        then college is null and major is null and academic_record_number is null
      else
        btrim(coalesce(college, '')) <> ''
        and btrim(coalesce(major, '')) <> ''
        and btrim(coalesce(academic_record_number, '')) <> ''
    end
  );

commit;
