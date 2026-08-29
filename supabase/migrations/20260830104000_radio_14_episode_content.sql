-- ══════════════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب م١٤: ثلاثةُ أعمدةٍ للحلقة
--
-- ⚠️ مكتوبٌ ينتظر إذنَ المالك. لا يُنفَّذ إلّا بكلمته.
-- ⚠️ **ويُشحَن مع الكود في النشرة نفسِها**: `pull_quote` ينزل ميّتًا إن لم
--    يُضَف إلى `EP_COLS` في `v2/apps/web/src/app/radio/data.ts` معه.
-- ⚠️ **ويأخذ `ACCESS EXCLUSIVE` على `radio_episodes` ويمسحه مسحًا كاملًا**:
--    كلُّ `add constraint` يتحقّق من الصفوف القائمة. اليومَ ثلاثُ حلقاتٍ فالأثرُ
--    لحظيّ، ومع الآلاف يُجدوَل.
--
-- ## (أ) الجملةُ الدالّة
-- أطروحةُ واجهة المحطّة: الحلقةُ تُعرَّف بجملةٍ من كلامها لا بمربّعٍ مصوَّر.
-- وتُنتقى آليًّا اليومَ من التفريغ (`lib/radio/quote.ts`)، وهذا العمودُ **نقضُ
-- المحرّر** لا أصلُ الجملة: حقلٌ يُملأ بيدٍ في كلّ حلقةٍ يُنسى، ومحطّةٌ بمئة
-- برنامجٍ لا تحتمل سطحًا يسقط كلّما نسي أحدُهم.
--
-- ## (ب) التفريغُ الموقَّت
-- ‏`jsonb` لا جدولٌ مستقلّ. والحجّة: الأسطرُ **لا تُستعلَم منفردةً** — تُقرأ
-- كلُّها مع الحلقة أو لا تُقرأ. وجدولٌ من عشرات الآلاف من الأسطر يُنضَمّ في كلّ
-- فتحةِ صفحةٍ ثمنٌ بلا مقابل. ويومَ يُطلب بحثٌ داخل الأسطر بعينها يُبنى فهرسٌ
-- على المسار، لا جدولٌ جديد.
--
-- **والقيدُ صارمٌ لا `lax`**: جُرّب `lax` في مسوّدةٍ أولى فمرّ `[[{...}]]`
-- (مصفوفةٌ معشّشة) لأنّ `lax` يفكّ المصفوفات، فتنكسر صفحةُ الحلقة عند الزائر.
-- فههنا `strict`، ومعه فحصٌ صريحٌ أنّ الجذرَ مصفوفة.
--
-- ## (ج) مصادرُ الحلقة
-- نصٌّ حرٌّ لا `jsonb`: المصدرُ سطرٌ يقرؤه إنسان، ولا يُستعلَم ولا يُرتَّب.
-- وبنيةٌ لا يحتاجها أحدٌ عبءٌ على من يكتب.
-- ══════════════════════════════════════════════════════════════════════════════

begin;

alter table public.radio_episodes
  add column if not exists pull_quote       text,
  add column if not exists transcript_lines jsonb,
  add column if not exists sources          text;

comment on column public.radio_episodes.pull_quote is
  'جملةُ الحلقة الدالّة بيد المحرّر. تنقض ما ينتقيه lib/radio/quote.ts، ولا تحلّ محلّه: الانتقاءُ الآليُّ هو الأصلُ العامل.';
comment on column public.radio_episodes.transcript_lines is
  'أسطرُ التفريغ الموقّت: [{"at": ثوانٍ, "text": "..."}]. jsonb لا جدول لأنّ الأسطر تُقرأ كلُّها مع الحلقة ولا تُستعلَم منفردة.';
comment on column public.radio_episodes.sources is
  'مصادرُ الحلقة نصًّا حرًّا: سطرٌ يقرؤه إنسان، لا بنيةٌ تُستعلَم.';

/* ══ حدُّ الجملة ═══════════════════════════════════════════════════════════════
   المدى نفسُه الذي يحرسه `lib/radio/quote.ts` (‏٤٠ إلى ١٣٢): أقصرُ ما يحمل
   معنًى، وأطولُ ما يُقرأ لوحًا في الصدر. والرسالةُ عربيّةٌ لأنّها تصل المحرّرَ. */
alter table public.radio_episodes
  drop constraint if exists radio_episodes_pull_quote_len;
alter table public.radio_episodes
  add constraint radio_episodes_pull_quote_len check (
    pull_quote is null or char_length(btrim(pull_quote)) between 40 and 132
  );

/* ══ شكلُ التفريغ الموقَّت ════════════════════════════════════════════════════
   **صيغةُ «لا عنصرَ سيّئًا» لا «فيه عنصرٌ صالح».** وصياغةٌ أولى قالت «فيه
   كائنٌ» فمرّت خمسُ صورٍ معطوبةٍ جُرّبت على الإنتاج: نصٌّ فارغ، وبلا `text`،
   وبلا `at`، وكائنٌ فارغ، ومصفوفةٌ مختلطةٌ فيها عنصرٌ ليس كائنًا. وكلُّها
   تُسقِط المشغّلَ **عند القارئ لا عند المحرّر**.

   وثلاثةُ شروطٍ لا واحد، ولكلٍّ وضعُه:
     • `strict` لأنّه لا يفكّ المصفوفةَ المعشّشة، فيُردّ `[[{…}]]`، ويُمسَك
       العنصرُ الذي ليس كائنًا.
     • `lax` للمفاتيح الغائبة: المفتاحُ الغائبُ في `strict` **خطأٌ بنيويّ**
       يصير `unknown` داخل المرشِّح، فلا يُنتقى العنصرُ ولا يُمسَك شيء.
     • و`@.text == ""` لا `@.text.size() == 0`: الأخيرةُ عددُ عناصرِ مصفوفةٍ
       لا طولُ نصّ، ولا مِعيارَ لطول النصّ في jsonpath أصلًا.

   جُرّبت الصيغةُ على تسع صورٍ فأصابت كلَّها (٢٠٢٦-٠٨-٣٠). */
alter table public.radio_episodes
  drop constraint if exists radio_episodes_transcript_lines_shape;
alter table public.radio_episodes
  add constraint radio_episodes_transcript_lines_shape check (
    transcript_lines is null
    or (
      jsonb_typeof(transcript_lines) = 'array'
      and not jsonb_path_exists(transcript_lines, 'strict $[*] ? (@.type() != "object")')
      and not jsonb_path_exists(transcript_lines, 'lax $[*] ? (!exists(@.at) || !exists(@.text))')
      and not jsonb_path_exists(
            transcript_lines,
            'lax $[*] ? (@.at.type() != "number" || @.at < 0 || @.text.type() != "string" || @.text == "")'
          )
    )
  );

comment on constraint radio_episodes_transcript_lines_shape on public.radio_episodes is
  'يمنع شكلًا يكسر صفحةَ الحلقة عند الزائر. صيغةُ «لا عنصرَ سيّئًا»: صياغةُ «فيه عنصرٌ صالح» مرّت خمسَ صورٍ معطوبة.';

commit;
