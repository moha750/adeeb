-- تصنيفاتُ الأعمال ثابتة (قرار محمد ٢٠٢٦-١١-١٥): كانت نصًّا حرًّا فصار نصفُها أسماءَ أعمالٍ لا تصنيفات
-- («جائزة أفضل نادي طلابي»، «معرض كفو تبدع»)، فتفرّق مرشّحُ «كلّ الأعمال» سبعَ حبّاتٍ لتسعة أعمال.
-- ستّة: معرض، فلم، ورشة، شراكة، جائزة، مبادرة. والقيمةُ العربيّةُ نفسُها هي المخزَّنة (يقرؤها الموقعُ كما هي)،
-- ومرآتُها في `dashboard/website/works/vocab.ts` — لا تُضاف قيمةٌ هنا دون هناك.
update public.works set category = case category
  when 'معرض' then 'معرض'
  when 'معرض كفو تبدع' then 'معرض'
  when 'فلم قصير' then 'فلم'
  when 'ورشة تدريبية' then 'ورشة'
  when 'توقيع شراكة' then 'شراكة'
  when 'جائزة أفضل نادي طلابي' then 'جائزة'
  when 'مُبادرة دينية' then 'مبادرة'
  else category end;

alter table public.works drop constraint if exists works_category_check;
alter table public.works add constraint works_category_check
  check (category is null or category in ('معرض', 'فلم', 'ورشة', 'شراكة', 'جائزة', 'مبادرة'));
