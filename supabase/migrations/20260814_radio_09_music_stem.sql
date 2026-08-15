-- ══════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب: الحلقةُ تصير **مسارين** لا نسختين
--
-- كانت الحلقةُ ملفّين كاملين: مكسٌ بموسيقى ومكسٌ بلا موسيقى. وفيهما الكلامُ
-- **مكرّرٌ مرّتين**، فلا سبيل إلى مقبضٍ يتحكّم بالموسيقى وحدها: أيُّ جمعٍ بينهما
-- يجمع صوتَ المذيع من مصدرين، وانزياحُ جزءٍ من الألف يُحدث رنينًا معدنيًّا عليه.
--
-- فصارت الحلقةُ **مسارَ صوتٍ ومسارَ موسيقى**، والكلامُ في أحدهما وحدَه:
--
--   بموسيقى  =  المساران معًا          بلا موسيقى  =  مسارُ الصوت وحده
--   والمقبضُ =  مقدارُ مسار الموسيقى، صفرًا إلى مئة
--
-- **وقِيس قبل أن يُبنى** (٢٠٢٦-٠٨-١٤، الحلقة الثانية): جُمع المساران وقُورن
-- الناتجُ بالمنشور، فكانت الإزاحةُ صفرَ عيّنة والمقدارُ ١٫٠٠٠٠ والباقي واحدًا
-- وخمسين ديسيبل تحت الإشارة، أي ضجيجَ الضغط لا فرقًا في المزج. فالجمعُ يعيد
-- بناءَ المنشور بلا أن تسمع الأذنُ فرقًا، ولا مسترةَ تفسده.
--
-- ولا يُهدَم القديم هنا: عمودُ المكس يبقى تعمل به الحلقاتُ الثلاثُ المنشورة
-- حتّى تُرفَع مساراتُها، ثمّ يُعدَم في ترحيلٍ تالٍ فلا يبقى بابان لفعلٍ واحد.
-- ══════════════════════════════════════════════════════════════════════

alter table public.radio_episodes
  add column audio_stem_path text,
  add column audio_stem_mime text,
  add column audio_stem_bytes bigint,
  add column audio_stem_seconds integer;

comment on column public.radio_episodes.audio_stem_path is
  'مسارُ الموسيقى وحدَها. مع audio_plain (وهو مسارُ الصوت) يُبنى ما يُسمَع بموسيقى، وبينهما المقبض.';
comment on column public.radio_episodes.audio_plain_path is
  'مسارُ الصوت. كان «النسخة المجرّدة» وهو نفسُه: كلامٌ بلا موسيقى. ومع audio_stem صار نصفَ الحلقة لا نسختَها.';

alter table public.radio_episodes
  add constraint radio_episodes_stem_bytes_check
    check (audio_stem_bytes is null or audio_stem_bytes > 0),
  add constraint radio_episodes_stem_seconds_check
    check (audio_stem_seconds is null or audio_stem_seconds > 0);

-- إمّا أن يكتمل المسارُ وإمّا أن يغيب كلَّه: صفٌّ نصفُه مرفوعٌ يكسر المشغّل صامتًا.
alter table public.radio_episodes
  add constraint radio_episodes_stem_complete check (
    (audio_stem_path is null and audio_stem_bytes is null and audio_stem_seconds is null)
    or (audio_stem_path is not null and audio_stem_bytes is not null and audio_stem_seconds is not null)
  );

-- المساران تصديرتان من تايم لاينٍ واحد، فحقُّ طوليهما التساوي. واختلافُهما
-- علامةُ قصٍّ أو ملفٍّ رُفع في غير موضعه، ونتيجتُه موسيقى تسبق الكلامَ أو تتخلّف.
alter table public.radio_episodes
  add constraint radio_episodes_stem_aligned check (
    audio_stem_seconds is null or audio_plain_seconds is null
    or abs(audio_stem_seconds - audio_plain_seconds) <= 2
  );

/**
 * موجةُ **ما يُسمَع بالموسيقى** — مصدرُها يختلف والمعنى واحد:
 *   الحلقةُ القديمة: من ملفّ المكس.
 *   الحلقةُ بالمسارين: من مجموعهما، يُحسَب في المتصفّح عند الرفع.
 * ولذلك يبقى عمودًا واحدًا: العمودُ يصف ما تسمعه الأذن لا الملفَّ الذي جاء منه.
 * ويُعاد تسميتُه يوم يُعدَم المكس، فيصير اسمُه ما هو عليه فعلًا.
 */
comment on column public.radio_episodes.audio_music_peaks is
  'موجةُ ما يُسمَع بالموسيقى: من ملفّ المكس في الحلقات القديمة، ومن مجموع المسارين في الجديدة.';

-- النشرُ يُطلَب له صوتٌ يُسمَع، وقد صار له بابان: مكسٌ قديم، أو مساران.
alter table public.radio_episodes drop constraint radio_episodes_publish_guard;
alter table public.radio_episodes add constraint radio_episodes_publish_guard check (
  status not in ('published', 'scheduled')
  or (audio_music_path is not null and audio_music_bytes is not null and audio_music_seconds is not null)
  or (audio_plain_path is not null and audio_stem_path is not null)
);
