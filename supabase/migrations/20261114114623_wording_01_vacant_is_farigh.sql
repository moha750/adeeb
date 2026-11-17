-- «فارغ» لا «شاغر» (قرار محمد ٢٠٢٦-١١-١٤: «لا يكون هناك ذكرٌ لكلمة شاغرة أبدًا»): الكلمةُ صحيحةٌ لكنّها لغةُ إعلانات الوظائف ولا
-- تلتقطها العين، فصارت «فارغ» في الواجهة كلّها، وهنا في رسائل القاعدة التي تصل الناس. التعريفُ يُعاد كما هو بالكلمة وحدها مبدَّلةً
-- (CREATE OR REPLACE يحفظ المنح والمالك)، ولا يتغيّر سلوك.
-- طُبّق على القاعدة الحيّة بإذن محمد (٢٠٢٦-١١-١٤: «أعطيك الصلاحية كاملة»). مسَّ: assign_acting (رسالةُ «المقعد مشغول») و_finalize_confidence
-- («وبقي المقعد فارغًا») وتعليقَ assign_acting.
do $$
declare
  f record;
  def text;
begin
  for f in
    select p.oid from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.prosrc like '%شاغر%'
  loop
    def := pg_get_functiondef(f.oid);
    execute replace(def, 'شاغر', 'فارغ');
  end loop;
end $$;

comment on function public.assign_acting(uuid, uuid, text, integer, integer, date, boolean, text) is
  'التكليف: مقعدٌ مؤقّتٌ فوق الأصيل، مع استمراره أو تجميده (p_freeze). على مقعدٍ فارغ، أو مجمَّدٍ فيتبع تكليفَ صاحبه بلا تاريخ.';
