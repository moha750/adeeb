-- ══════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب: النموذج يلحق الواقعَ بعد النشر
--
-- تبيّن بعد نشر أوّل حلقتين أنّ وجهة الإذاعة **يوتيوب** لا منصّات البودكاست،
-- وأنّ موقع أدِيب يقدّم **تجربةً صوتيّةً** لا فيديو (الحلقة ١٠٠ إلى ٣٠٠ م.ب مرئيّةً،
-- وعشراتُ الميغابايت صوتًا). وأنّ لكلّ حلقةٍ **نسختين**: بموسيقى وبدونها.
--
-- فيقتضي ذلك ثلاثة:
--   ١) صوتان بدل صوتٍ واحد، وبينهما إزاحةٌ ثابتة هي طولُ المقدّمة الموسيقيّة،
--      تُسجَّل رقمًا فيقفز المستمعُ بين النسختين في اللحظة نفسها بلا انقطاع.
--      والإزاحة واحدةٌ على كلّ البرامج (٠:٠٠:١٠:١٩ عند ٣٠ إطارًا = ١٠٫٦٣٣ث)،
--      فمسكنها المحطّةُ لا الحلقة، وفي الحلقة خانةُ تجاوزٍ فارغةٌ تُورَث منها
--      ولا تُملأ إلّا يومَ تُقصّ مقدّمةٌ على غير المقاس.
--   ٢) رابطُ يوتيوب لكلّ **حلقة** (وكانت الروابط على مستوى البرنامج وحده).
--   ٣) إعدامُ جهاز البودكاست بتمامه: لا مغذّي RSS، فلا أعمدةَ مغذًّى ولا
--      `explicit` ولا عدّادَ تنزيلات، ولا عشرُ منصّاتٍ لا نطرق منها إلّا واحدة.
--
-- ويسقط معها **الموسمُ**: الترقيم متسلسلٌ واحدٌ لا مواسمَ فيه.
--
-- دَينٌ معلوم: الجداول الأربعة أُنشئت على القاعدة مباشرةً بلا ترحيلٍ في المستودع،
-- وهذا الملفّ يصف **التغيير** لا النشأة. البيئةُ النظيفة تفتقد الأصلَ بعدُ.
-- ══════════════════════════════════════════════════════════════════════

/* ══ ١) الحلقة: صوتٌ يصير صوتين ══════════════════════════════════════ */

-- النسخة القائمة هي المنشورة بموسيقى، فتأخذ اسمها ولا تُفقَد.
alter table public.radio_episodes rename column audio_path       to audio_music_path;
alter table public.radio_episodes rename column audio_mime       to audio_music_mime;
alter table public.radio_episodes rename column audio_bytes      to audio_music_bytes;
alter table public.radio_episodes rename column duration_seconds to audio_music_seconds;

alter table public.radio_episodes
  add column audio_plain_path    text,
  add column audio_plain_mime    text not null default 'audio/mpeg',
  add column audio_plain_bytes   bigint,
  add column audio_plain_seconds integer,
  add column music_lead_seconds  numeric(6,3),
  add column youtube_url         text;

comment on column public.radio_episodes.audio_music_path is
  'مسارُ النسخة بموسيقى في R2. هي الافتراضيّة، وبها وحدها يُسمَح بالنشر.';
comment on column public.radio_episodes.audio_plain_path is
  'مسارُ النسخة بلا موسيقى. اختياريّةٌ، وبغيابها يختفي المبدّل وتُنشَر الحلقة.';
comment on column public.radio_episodes.music_lead_seconds is
  'تجاوزٌ للإزاحة الموروثة من radio_station. فارغٌ = ارِث. يُملأ حين تُقصّ مقدّمةٌ على غير المقاس.';
comment on column public.radio_episodes.youtube_url is
  'الفيديو على يوتيوب. رابطٌ يحيل لا مشغّلٌ يُضمَّن، فتجربتُنا صوتيّة.';

/* ══ ٢) قيودُ الحلقة: تُعاد صياغتُها على الصوتين ══════════════════════ */

alter table public.radio_episodes
  drop constraint radio_episodes_audio_bytes_check,
  drop constraint radio_episodes_duration_seconds_check,
  drop constraint radio_episodes_publish_guard,
  drop constraint radio_episodes_season_check,
  drop constraint radio_episodes_show_id_season_number_key;

alter table public.radio_episodes
  drop column season,
  drop column explicit,
  drop column downloads;

alter table public.radio_episodes
  add constraint radio_episodes_show_id_number_key unique (show_id, number);

alter table public.radio_episodes
  add constraint radio_episodes_music_bytes_check
    check (audio_music_bytes is null or audio_music_bytes > 0),
  add constraint radio_episodes_music_seconds_check
    check (audio_music_seconds is null or audio_music_seconds > 0),
  add constraint radio_episodes_plain_bytes_check
    check (audio_plain_bytes is null or audio_plain_bytes > 0),
  add constraint radio_episodes_plain_seconds_check
    check (audio_plain_seconds is null or audio_plain_seconds > 0),
  -- الإزاحةُ ثوانٍ معدودة. الحدُّ الأعلى يمنع الخطأ الكاتب لا أكثر.
  add constraint radio_episodes_lead_check
    check (music_lead_seconds is null or (music_lead_seconds >= 0 and music_lead_seconds < 600)),
  add constraint radio_episodes_youtube_url_check
    check (youtube_url is null or youtube_url ~ '^https://(www\.)?(youtube\.com/|youtu\.be/)'),
  -- المجرّدةُ إمّا كاملةٌ أو غائبةٌ بتمامها. لا مسارَ بلا مدّةٍ فيعجز المبدّل.
  add constraint radio_episodes_plain_complete
    check (
      (audio_plain_path is null and audio_plain_bytes is null and audio_plain_seconds is null)
      or (audio_plain_path is not null and audio_plain_bytes is not null and audio_plain_seconds is not null)
    ),
  -- النشرُ يشترط نسخةَ الموسيقى وحدها، فهي الافتراضيّة.
  add constraint radio_episodes_publish_guard
    check (
      status not in ('published', 'scheduled')
      or (audio_music_path is not null and audio_music_bytes is not null and audio_music_seconds is not null)
    );

/* ══ ٣) المحطّة: مسكنُ الإزاحة، وقبرُ المغذّي ════════════════════════ */

alter table public.radio_station
  drop column feed_author,
  drop column feed_owner_email,
  drop column itunes_category,
  drop column copyright,
  drop column explicit;

alter table public.radio_station
  add column music_lead_seconds numeric(6,3) not null default 10.633;

alter table public.radio_station
  add constraint radio_station_lead_check
    check (music_lead_seconds >= 0 and music_lead_seconds < 600);

comment on column public.radio_station.music_lead_seconds is
  'طولُ المقدّمة الموسيقيّة بالثواني. المصدرُ الواحد للمبدّل: نسخةُ الموسيقى تسبق المجرّدةَ بهذا القدر.';

/* ══ ٤) المنصّات: تُقصَر على ما نطرقه فعلًا ══════════════════════════ */

-- الوجهةُ يوتيوب، وما بقي حضورٌ اجتماعيّ. وتوسيعُها لاحقًا سطرٌ واحد.
alter table public.radio_show_platforms
  drop constraint if exists radio_show_platforms_platform_check;

alter table public.radio_show_platforms
  add constraint radio_show_platforms_platform_check
    check (platform in ('youtube', 'x', 'instagram', 'tiktok'));
