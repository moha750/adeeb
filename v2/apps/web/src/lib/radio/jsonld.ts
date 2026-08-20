/**
 * بياناتٌ مبنيّةٌ لصفحات الإذاعة — **مصدرٌ واحدٌ لصفحتين**.
 *
 * ولنكن صريحين في مقدار ما تشتريه: **جوجل لم يعد له سطحُ نتائجَ للبودكاست**
 * (أُغلق «بودكاست جوجل» ٢٠٢٤، وسقط نوعُ `Podcast` من معرض النتائج الثريّة)،
 * فـ`PodcastEpisode` و`PodcastSeries` لا يشتريان بطاقةً في البحث اليوم. الذي
 * يشتري بطاقةً فعلًا هو **`BreadcrumbList`** وحدَه، وهو مدعومٌ ومعروض.
 *
 * فلمَ يُكتَب الباقي؟ لأنّه **يصف الصفحةَ لقارئٍ آليّ** غير جوجل: مساعداتٌ
 * تلخّص، ومفهرساتٌ تجمع، وشبكاتٌ تبني بطاقةً من الصفحة لا من الوسم. وثمنُه
 * سطرٌ في الخادم، فالميزانُ مائل.
 *
 * والمسارُ **مطلقٌ دائمًا**: الوسمُ يُقرأ خارج الموقع، فالنسبيُّ فيه لا معنى له.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adeeb.club";

/** ثوانٍ إلى مدّةِ ISO 8601 (`PT21M27S`)، وهي الصيغةُ الوحيدةُ التي تُقرأ. */
export function isoDuration(seconds: number | null): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s || (!h && !m) ? `${s}S` : ""}`;
}

/** فتاتُ الطريق: الإذاعة ثمّ البرنامج ثمّ الحلقة. وهو الوحيدُ الذي يُعرَض فعلًا. */
export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${SITE}${t.path}`,
    })),
  };
}

export function podcastSeriesLd(show: {
  title: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  hostName: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: show.title,
    url: `${SITE}/radio/${show.slug}`,
    description: show.tagline ?? show.description ?? undefined,
    image: show.logoUrl ?? undefined,
    inLanguage: "ar",
    author: show.hostName ? { "@type": "Person", name: show.hostName } : undefined,
    publisher: { "@type": "Organization", name: "نادي أَدِيب", url: SITE },
  };
}

export function podcastEpisodeLd(
  episode: {
    title: string;
    slug: string;
    number: number;
    summary: string | null;
    publishedAt: string | null;
    seconds: number | null;
    /** رابطُ الصوت المباشر. يُعلَن `AudioObject` فيُعرَف أنّ الصفحة تُسمَع لا تُقرأ. */
    audioUrl: string | null;
    transcript: string | null;
  },
  show: { title: string; slug: string; logoUrl: string | null },
) {
  const url = `${SITE}/radio/${show.slug}/${episode.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    url,
    episodeNumber: episode.number,
    description: episode.summary ?? undefined,
    datePublished: episode.publishedAt ?? undefined,
    timeRequired: isoDuration(episode.seconds),
    image: show.logoUrl ?? undefined,
    inLanguage: "ar",
    partOfSeries: {
      "@type": "PodcastSeries",
      name: show.title,
      url: `${SITE}/radio/${show.slug}`,
    },
    associatedMedia: episode.audioUrl
      ? {
          "@type": "AudioObject",
          contentUrl: episode.audioUrl,
          encodingFormat: "audio/mpeg",
          duration: isoDuration(episode.seconds),
        }
      : undefined,
    // وجودُ التفريغ يُعلَن ولا يُنسَخ: النصُّ كلُّه في الصفحة أصلًا، وتكرارُه
    // في الوسم يضاعف حجمَ الوثيقة بلا أن يضيف معنًى.
    transcript: episode.transcript ? { "@type": "MediaObject", url: `${url}#transcript` } : undefined,
  };
}

/**
 * وسمُ السكربت. و`JSON.stringify` يُنقّى من `<` فلا يُغلَق الوسمُ من داخل نصٍّ
 * كتبه محرّر (عنوانُ حلقةٍ فيه `</script>` يكسر الصفحة، وهو مدخلُ حقنٍ لا زينة).
 */
export const ldScript = (data: unknown) => ({
  __html: JSON.stringify(data).replace(/</g, "\\u003c"),
});
