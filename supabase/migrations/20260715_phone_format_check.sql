-- قيد صيغة الجوّال السعوديّ — الجذر الذي يحرس كلّ الكتّاب (V1 · V2 · الدوال الطرفيّة · SQL المباشر).
--
-- الخلفيّة: لم يكن للعمود أيّ حارس في القاعدة. الحارس الوحيد كان pattern في متصفّح صفحة الالتحاق
-- (member-onboarding.html) — يعيش في العميل وحده، وأيّ كاتب لا يمرّ بتلك الصفحة يتجاوزه.
--
-- الجوّال مخزَّن في عمودين (تكرار قديم): profiles.phone و member_details.phone،
-- و admin/js/profile.js يكتب فيهما معًا. القيد يلزمهما معًا لسبب دقيق: ذلك الملفّ يحدّث
-- member_details أوّلًا مع فحص الخطأ، ثمّ profiles **بلا فحص**. فلو حرسنا profiles وحده
-- لفشلت كتابته صامتةً وقال للمستخدم «تم الحفظ بنجاح» — وهو أسوأ من غياب القيد.
-- بحراسة العمودين يقع الرفض على member_details أوّلًا فيُلتقط ويُعرَض.
--
-- NULL يمرّ تلقائيًّا (CHECK على NULL يساوي NULL، وPostgres يقبل ما ليس false) — والعمودان يقبلانه.
--
-- أُثبتت السلامة قبل التطبيق: profiles.phone = 137 قيمة غير فارغة، و member_details.phone = 157،
-- وصفرُ مخالفٍ للصيغة في العمودين. فلا صفّ قائم يرفضه القيد.
--
-- الصيغة مصدرها الواحد في الشيفرة: PHONE_RE في v2/apps/web/src/app/dashboard/members/vocab.ts —
-- أيّ تغيير هناك يلزمه ترحيل مقابل هنا.

alter table public.profiles
  add constraint profiles_phone_check
  check (phone ~ '^05[0-9]{8}$');

alter table public.member_details
  add constraint member_details_phone_check
  check (phone ~ '^05[0-9]{8}$');
