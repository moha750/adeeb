-- من يصلح شريكًا: سؤالٌ يسأله المالكُ لا المشرف (م١٤)
--
-- ## العطب، كما رآه المالك
-- فتح نافذةَ المشاركة فوجد قائمةَ الأعضاء **فارغة** (٢٠٢٦-٠٩-٠٦). والعلّة أنّ الشاشة
-- تنادي `qr_owner_candidates` — وهي دالّةُ **غرفة الإشراف** لنقل الملكيّة، وأوّلُ شرطها
-- `oversee_qr`. فصاحبُ الباركود، وهو ليس مشرفًا، يسأل سؤالًا لا يحقّ له فيُردّ بلا شيء:
-- قائمةٌ فارغةٌ لا رسالةَ منعٍ، فيبدو العطبُ «لا أحدَ متاحًا» وهو في الحقيقة «مُنعتَ من
-- السؤال».
--
-- ## والعلاج: سؤالٌ ثانٍ بشرطٍ ثانٍ، لا توسيعُ الأوّل
-- توسيعُ دالّة الإشراف يفتح **نقلَ الملكيّة** لكلّ صاحب باركود، وهو غيرُ المطلوب. فالمشاركةُ
-- تُسأل بدالّةٍ لها شرطُها: من ملَك المولّدَ سأل عمّن يشاركه، ولا يرى إلّا من يملك المولّدَ
-- مثلَه — إذ مشاركةُ من لا يملكه تعطيه بابًا لا يراه.
--
-- ولا تُخرج إلّا **الاسمَ والمعرّف**: هي قائمةُ اختيارٍ لا دليلُ أعضاء.

begin;

create or replace function public.qr_share_candidates()
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name
  from public.profiles p
  where public.check_user_permission(auth.uid(), 'use_qr_generator')
    and p.id <> auth.uid()
    and public.check_user_permission(p.id, 'use_qr_generator')
  order by p.full_name;
$$;

comment on function public.qr_share_candidates() is
  'من يصلح شريكًا في باركود: حاملو use_qr_generator سوى السائل. يشترط أن يملك السائلُ القدرةَ نفسَها.';

revoke all on function public.qr_share_candidates() from public, anon;
grant execute on function public.qr_share_candidates() to authenticated;

commit;
