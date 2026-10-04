-- مدّةُ الفرصة ساعةٌ من كذا إلى كذا، لا نصٌّ حرّ (٢٠٢٦-٠٩-٣٠)
--
-- كان حقلُ «المدّة» في نافذة الفرصة نصًّا حرًّا (`duration_note`: «أربع ساعاتٍ يوميًّا»)، فيكتبه
-- كلُّ مشرفٍ بصيغته، ولا يُقرأ منه متى يحضر المتطوّعُ ولا متى ينصرف. وقال المالك: لا تجعله
-- حقلًا حرًّا، بل مدّةً تُختار «كساعة من كذا إلى كذا» (من 4 م إلى 8 م).
--
-- فالمدى عمودان من نوع `time` بلا منطقة: ساعةُ الجدار في الرياض كما تُقال، لا لحظةٌ تُزاح.
-- وهو **الوقتُ اليوميّ** للفرصة، وأيّامُها باقيةٌ في `starts_on`/`ends_on`.
--   · يُحفظان معًا أو يُتركان معًا: طرفٌ بلا طرفٍ جملةٌ ناقصة، كنهايةٍ بلا بداية في
--     `opportunity_dates`، والقيدُ يقولها ولا يتركها لذاكرة النموذج.
--   · والطرفان مختلفان لا مرتّبان: `daily_to <> daily_from`. **أقرّ المالك في اليوم نفسه أن تعبر
--     الفرصةُ منتصفَ الليل** (من 8 م إلى 12 ص، ومن 10 م إلى 1 ص): فعاليّاتٌ كثيرةٌ تمتدّ إلى ما بعده.
--     فالانتهاءُ الأصغرُ من البداية يُقرأ في اليوم التالي، ويُمنع المدى الصفريُّ وحدَه.
--
-- و`duration_note` يبقى ولا يُحذف: في الصفوف القائمة نصٌّ كُتب قبل اليوم. النموذجُ لم يعد يكتبه،
-- والقارئُ يعرض المدى إن وُجد وإلّا النصَّ القديم؛ فلا يضيع خبرٌ، ولا يُخترع وقتٌ لم يُكتب.
--
-- ترحيلٌ بخطّ اليد ينتظر كلمةَ المالك (قاعدةُ DDL). والتطبيقُ يسبق نشرَ الكود الذي يقرأ العمودين:
-- قبله تسأل قراءاتُ الفرص عن عمودين لا وجود لهما فتردّها القاعدة.

begin;

alter table public.volunteer_opportunities
  add column if not exists daily_from time,
  add column if not exists daily_to   time;

alter table public.volunteer_opportunities drop constraint if exists opportunity_daily_hours;
alter table public.volunteer_opportunities add constraint opportunity_daily_hours check (
  (daily_from is null and daily_to is null)
  or (daily_from is not null and daily_to is not null and daily_to <> daily_from)
);

comment on column public.volunteer_opportunities.daily_from is
  'ساعةُ بدء الفرصة كلَّ يوم (ساعةُ الرياض). تُحفظ مع `daily_to` أو تُترك معه.';

comment on column public.volunteer_opportunities.daily_to is
  'ساعةُ انتهاء الفرصة كلَّ يوم. إن صغرت عن `daily_from` فهي في اليوم التالي (تعبر منتصفَ الليل).';

comment on column public.volunteer_opportunities.duration_note is
  'مدّةٌ نصّيّةٌ قديمة (قبل ٢٠٢٦-٠٩-٣٠). لا يكتبها النموذج بعد اليوم، وتُعرض حين لا مدى للساعة.';

commit;
