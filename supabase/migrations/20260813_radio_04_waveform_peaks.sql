-- ══════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب: موجةُ الصوت تُحسَب مرّةً وتُخزَّن
--
-- الشريطُ الزمنيّ في مشغّل الحلقة يصير **موجةً مرسومةً من الملفّ نفسِه**، فيُقرأ
-- صوتًا بالنظر قبل أن تُقرأ كلمة.
--
-- **ولكلّ نسخةٍ موجتُها لا موجةٌ واحدة لهما.** النسخة بموسيقى صاخبةٌ في المقدّمة
-- والمجرّدةُ صامتةٌ فيها تمامًا؛ فموجةٌ واحدةٌ تُعرض للنسختين **تكذب على من يسمع
-- المجرّدة**: يرى ذروةً ويسمع صمتًا. فعمودان لا عمود.
--
-- **ولمَ `smallint[]` لا `jsonb`؟** القيمُ أعدادٌ صحيحةٌ من ٠ إلى ١٠٠ (نسبةُ
-- ارتفاع العمود)، والمصفوفةُ الأصليّة أصغرُ من نصّ JSON وأصدقُ نوعًا. وأربعُمئة
-- قمّةٍ لا تبلغ كيلوبايتًا.
--
-- والحسابُ يجري **في متصفّح الرافع أثناء الرفع** (الملفُّ في يده أصلًا فلا تنزيلَ
-- زائد)، ولا يفكّ الزائرُ عشرين ميغابايت ليرى شكلًا. وحلقةٌ بلا موجة ترتدّ إلى
-- الشريط الزمنيّ العاديّ، فلا يظهر عطب.
-- ══════════════════════════════════════════════════════════════════════

alter table public.radio_episodes
  add column audio_music_peaks smallint[],
  add column audio_plain_peaks smallint[];

comment on column public.radio_episodes.audio_music_peaks is
  'قممُ موجة النسخة بموسيقى: أعدادٌ من ٠ إلى ١٠٠، تُحسَب عند الرفع. فارغٌ = ارتدّ إلى الشريط الزمنيّ.';
comment on column public.radio_episodes.audio_plain_peaks is
  'قممُ موجة النسخة المجرّدة. لكلّ نسخةٍ موجتُها، وإلّا خالفت الموجةُ ما تسمع الأذن.';

-- القيمُ نسبةٌ مئويّة، فما خرج عنها خطأُ حسابٍ لا بيانات.
alter table public.radio_episodes
  add constraint radio_episodes_music_peaks_range
    check (audio_music_peaks is null or (
      array_length(audio_music_peaks, 1) between 1 and 2000
      and 0 <= all(audio_music_peaks) and 100 >= all(audio_music_peaks)
    )),
  add constraint radio_episodes_plain_peaks_range
    check (audio_plain_peaks is null or (
      array_length(audio_plain_peaks, 1) between 1 and 2000
      and 0 <= all(audio_plain_peaks) and 100 >= all(audio_plain_peaks)
    ));
