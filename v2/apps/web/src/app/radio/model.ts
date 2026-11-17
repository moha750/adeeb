/**
 * **نموذجُ الإذاعة العامّ، بلا قاعدة** (٢٠٢٦-١١-١٦): أنواعُ البرنامج والحلقة كما تُعرض، وحدُّ «ما يُسمَع»، وصفُّ المشغّل. كانت في `data.ts`
 * وهو للخادم وحده (`server-only`)، فلم تبلغها معاينةُ محرّر البرنامج (`/frame/radio`) وهي في المتصفّح. و`data.ts` يعيد تصديرها كما كانت.
 */
import { parseChapters } from "@/lib/radio/chapters";
import type { ShowTone } from "../dashboard/radio/vocab";
import type { Track } from "./_player/PlayerProvider";

export type PublicShow = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  tone: ShowTone;
  /** ثانيةُ بدء الحديث في هذا البرنامج — ترثها حلقاتُه. */
  talkStartsAt: number;
  hostName: string | null;
  isFeatured: boolean;
  episodeCount: number;
};

export type PublicEpisode = {
  id: string;
  slug: string;
  number: number;
  title: string;
  summary: string | null;
  notes: string | null;
  transcript: string | null;
  hostName: string | null;
  /**
   * روابطُ البثّ. والحلقةُ تُسمَع بأحد بابين:
   *   المساران (`plainUrl` + `stemUrl`) فيظهر المقبض، وهو ما تُرفَع به الحلقاتُ اليوم.
   *   المكسُ وحدَه (`musicUrl`) في الحلقات القديمة، ومعه مبدّلٌ لا مقبض.
   */
  musicUrl: string | null;
  plainUrl: string | null;
  stemUrl: string | null;
  musicSeconds: number | null;
  plainSeconds: number | null;
  /**
   * موجتان تُعرضان: موجةُ ما يُسمَع بالموسيقى (`musicPeaks`) وموجةُ الصوت وحدَه.
   * ولكلٍّ موجتُها لأنّ المقدّمة موسيقى خالصة، فموجةٌ واحدةٌ لهما تكذب على العين.
   */
  musicPeaks: number[] | null;
  plainPeaks: number[] | null;
  /**
   * ثانيةُ بدء الحديث **بعد** الوراثة. المساران تايم لاينٌ واحد فلا يحتاجها الجمع،
   * وإنّما يستعملها المشغّل لشيءٍ واحد: ألّا يجلس المستمعُ في صمتٍ إن أطفأ الموسيقى
   * والمقدّمةُ لم تنتهِ.
   */
  talkStartsAt: number;
  youtubeUrl: string | null;
  publishedAt: string | null;
  dateLabel: string;
  likes: number;
  plays: number;
};

/**
 * أفيها ما يُسمَع؟ بابان: المساران معًا، أو المكسُ القديم وحدَه.
 * وهو الحدُّ نفسُه الذي يحرسه `radio_episodes_publish_guard` في القاعدة.
 */
export const isPlayable = (e: PublicEpisode): boolean =>
  Boolean(e.musicUrl) || Boolean(e.plainUrl && e.stemUrl);

/**
 * صفُّ الحلقة كما يقرؤه المشغّل — **مصدرٌ واحد لثلاث صفحات**: الهبوط وصفحةُ
 * البرنامج وصفحةُ الحلقة. وكانت الثلاثُ تبنيه بأيديها، فأيُّ حقلٍ يُضاف يُنسى
 * في واحدة (وقع فعلًا يوم أُضيف مسارُ الموسيقى).
 *
 * والمدّةُ من المكس إن وُجد وإلّا من مسار الصوت: الحلقةُ بالمسارين لا مكسَ لها.
 */
export function toTrack(
  e: PublicEpisode,
  show: { title: string; slug: string; logoUrl: string | null; tone: ShowTone },
): Track {
  return {
    id: e.id,
    title: e.title,
    showTitle: show.title,
    showSlug: show.slug,
    episodeSlug: e.slug,
    musicUrl: e.musicUrl,
    plainUrl: e.plainUrl,
    stemUrl: e.stemUrl,
    talkStartsAt: e.talkStartsAt,
    coverUrl: show.logoUrl,
    seconds: e.musicSeconds ?? e.plainSeconds,
    musicPeaks: e.musicPeaks,
    plainPeaks: e.plainPeaks,
    tone: show.tone,
    /* المحاورُ تُشتقّ هنا مرّةً وتُحمَل مع الصفّ: الشاشةُ الكاملة تُفتَح من أيّ
       سطحٍ في المحطّة ولا سبيلَ لها إلى `notes` هناك. */
    chapters: parseChapters(e.notes),
  };
}
