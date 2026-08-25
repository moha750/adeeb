-- ديبو — حدودُه تصير صفوفًا لا جدارَ نصّ (م١٠)
--
-- ✅ طُبِّق على الإنتاج ٢٠٢٦-٠٨-٢٥ بإذن المالك: ستّةُ أحكامٍ خرجت من الجدار، وأُعيد
-- تركيبُ النصّ منها فطابق الأصلَ حرفًا بحرف (١٣٠٦ حرفًا = ١٣٠٦).
--
-- ## العلّة
-- «حدودك» عمودُ نصٍّ واحدٍ فيه أربعةُ آلاف حرفٍ وثمانيةُ أحكامٍ متداخلة، يُحرَّر في نافذةٍ
-- بعشرة أسطر. فتعديلُ حكمٍ منها تمريرٌ داخل صندوق، ولا يُعرف أيُّ حكمٍ تبدّل بعد الحفظ،
-- ولا يُطفأ حكمٌ ليُعرَف أثرُه إلّا بحذفه ثمّ إعادةِ كتابته. سأل المالك ٢٠٢٦-٠٨-٢٥:
-- «هل من السهل قراءةُ الطبع وتعديلُه؟» — فلا. فصار كلُّ حكمٍ **صفًّا**: عنوانٌ يُعرف به،
-- ومتنٌ يُحرَّر وحدَه، وترتيبٌ، **ومفتاحُ تعطيلٍ يُطفئه بلا حذف**.
--
-- ## ولمَ في الصفّ نفسِه (jsonb) لا في جدولٍ ثانٍ
-- الطبعُ صفٌّ واحدٌ له مُطلِقُ لقطاتٍ ورجعةٌ (م٩). فجدولٌ ثانٍ يعني تاريخًا ثانيًا ورجعةً
-- ثانيةً تتزامن معه، وأوّلُ اختلافٍ بينهما يجعل الرجعةَ تُعيد نصفَ طبعٍ. وعمودٌ في الصفّ
-- نفسِه يرثُ اللقطةَ والرجعةَ والقيدَ بلا سطرٍ زائد.
--
-- ## والعمودُ القديم يبقى — مؤقّتًا
-- الإنتاجُ يعمل بالكود المنشور، وهو يقرأ `boundaries`. فحذفُه قبل النشر يُسكِت ديبو في
-- اللحظة. فالشاشةُ الجديدة **تكتب الاثنين**: الصفوفَ مصدرًا، والنصَّ المركَّب نسخةً
-- يقرؤها المنشورُ حتى يُنشَر الجديد. وحذفُه ترحيلٌ تالٍ بعد النشر (م١١).

begin;

-- ═══ (١) العمودُ الجديد ═════════════════════════════════════════════════════
-- شكلُه: [{"title": "...", "body": "...", "enabled": true}, …]
alter table public.deebo_persona
  add column if not exists boundary_rules jsonb not null default '[]'::jsonb;

alter table public.deebo_persona_history
  add column if not exists boundary_rules jsonb not null default '[]'::jsonb;

-- ولقطاتُ ما قبل هذا الترحيل لا صفوفَ لها، ونصُّها محفوظٌ في `boundaries` — فيُترك
-- العمودُ القديم في السجلّ مسموحًا بالخلوّ حين تأتي لقطةٌ بعد حذفه.
alter table public.deebo_persona_history alter column boundaries drop not null;

-- ═══ (٢) شكلٌ وقيدُ أرقام ═══════════════════════════════════════════════════
-- والشكلُ يُفحَص بدالّةٍ لا باستعلامٍ فرعيّ: القيدُ لا يقبل `select` في متنه (0A000 —
-- وهي العلّةُ نفسُها التي جعلت المحظوراتِ تُفحَص بـ`array_to_string` في م٨). فالدالّةُ
-- `immutable` صافيةٌ لا تقرأ جدولًا، والقيدُ يناديها.
create or replace function public.deebo_rules_valid(rules jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(rules) = 'array'
     and jsonb_array_length(rules) <= 40
     and not exists (
       select 1
       from jsonb_array_elements(rules) e
       where jsonb_typeof(e) <> 'object'
          or jsonb_typeof(e -> 'body') <> 'string'
          or length(btrim(e ->> 'body')) < 2
          or length(e ->> 'body') > 1200
     );
$$;

comment on function public.deebo_rules_valid(jsonb) is
  'شكلُ أحكام حدود ديبو: مصفوفةُ كائناتٍ لكلٍّ متنٌ نصّيٌّ في حدّه.';

alter table public.deebo_persona drop constraint if exists deebo_persona_rules_shape;
alter table public.deebo_persona add constraint deebo_persona_rules_shape
  check (public.deebo_rules_valid(boundary_rules));

-- والرقمُ ممنوعٌ ههنا كما في أخواته: حارسُ `guard.ts` يبيح للجواب كلَّ عددٍ ورد في
-- التوجيه، فرقمٌ في حكمٍ يُسقط الحارسَ صامتًا.
alter table public.deebo_persona drop constraint if exists deebo_persona_rules_no_digits;
alter table public.deebo_persona add constraint deebo_persona_rules_no_digits check (
  boundary_rules::text !~ '[0-9٠-٩۰-۹]'
);

-- ═══ (٣) النقلُ: الجدارُ يصير صفوفًا ════════════════════════════════════════
-- الأحكامُ مفصولةٌ بسطرٍ يبدأ بشَرطة، وتتمّةُ الحكم أسطرٌ تليه. فالشقُّ على «\n- »،
-- والشرطةُ الأولى تُنزع من أوّل الحكم. (والعنوانُ يُترك خاليًا: الشاشةُ تشتقّه من أوّل
-- سطرٍ حتى يسمّيه المالك بيده.)
update public.deebo_persona p
set boundary_rules = coalesce((
  select jsonb_agg(
           jsonb_build_object('title', '', 'body', btrim(regexp_replace(part, '^-[[:space:]]*', '')), 'enabled', true)
           order by ord
         )
  from unnest(string_to_array(p.boundaries, E'\n- ')) with ordinality as t(part, ord)
  where length(btrim(part)) >= 2
), '[]'::jsonb)
where p.id = 1 and jsonb_array_length(p.boundary_rules) = 0;

commit;
