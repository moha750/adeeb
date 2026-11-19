"use client";

/**
 * **صفحةُ الخبر على قالب «القراءة»** (مختبر ٢٠٢٦-١١-١٧، `/news-lab` — لم تُعتمد بعد). صدرُ الخبر القديم («الشُّرفةُ المقلوبة» ٢٠٢٦-١٠-١٤) هو
 * الذي صدر عنه القالب، فالانتقالُ إطارٌ لا هدم: **لسانُ العودة واللوحُ بمادّته** (الفئةُ شارةً زجاجيّة، والعنوانُ، والموجزُ، وحقائقُه برموزها في
 * مربّعاتها: «بريشة…»، والتاريخ، ومدّةُ القراءة)، ثمّ **الغلافُ العريضُ يتدلّى منه** بعرض المتن ونسبتُه إلى عدسته، ثمّ **المتنُ وبجانبه فهرسُه**
 * (قطعةُ فهرس «حسابي» نفسُها، ملازمةً أعلى الشاشة، والفصلُ برقمه)، ثمّ ما في داخل الخبر بلغته المعتمدة كما هو — ألواحُ الفصول، ومعرضُ الصور،
 * والختامُ («هل أعجبك الخبر؟» والمشاركة)، والتعليقات — ثمّ **«اقرأ أيضًا» كروتَ فهرس الأخبار نفسَها** (`PubCard`).
 *
 * **والسلوكُ سلوكُ الصفحة حرفًا** (`news/[slug]/useArticle`، استُخرج من `ArticleView`): الإعجابُ المتفائل، والتعليقاتُ وإعجاباتُها، والإشرافُ
 * من الصفحة، وما يخصّ القارئَ بعد التركيب.
 */
import { CalendarBlank, CalendarCheck, Camera, ChatCircle, Clock, Feather, Heart, LinkSimple, LinkedinLogo, Newspaper, ShareNetwork, TelegramLogo, WhatsappLogo, XLogo } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Lightbox, type LightboxShot } from "@adeeb/design-system";
import { ArrowLeft, Check, Star, Trash, X, Eye } from "@/app/_components/glyphs";
import { useShare } from "@/app/news/[slug]/_parts/useShare";
import { AR_READ_MIN, AR_VIEW, arCount, type ArForms } from "@/lib/arabicCount";
import { bylineOf } from "@/lib/news/byline";
import { newsHref } from "@/lib/news/link";
import { CATEGORY_META } from "@/app/dashboard/news/vocab";
import type { NewsActivity, PublicNews } from "@/app/news/data";
import { ArticleBody } from "@/app/news/[slug]/_parts/ArticleBody";
import { ArticleGallery } from "@/app/news/[slug]/_parts/ArticleGallery";
import { COMMENTS_ID, GALLERY_ID } from "@/app/news/[slug]/_parts/ArticleToc";
import type { PublicComment } from "@/app/news/[slug]/_parts/Comments";
import { NewsComments } from "./NewsComments";
import { AR_LIKE } from "@/app/news/[slug]/_parts/ReaderEnd";
import { useArticle } from "@/app/news/[slug]/useArticle";
import { AdBadge, AdButton, AdConfirm, AdIconButton, AdNote } from "../primitives";
import { AdIndex } from "../account";
import { PubCard, PubGrid } from "../public";
import { PubRead, type PubReadFact } from "../read";

const AR_PHOTO: ArForms = ["صورةٌ واحدة", "صورتان", "صور", "صورةً"];
const two = (k: number) => String(k).padStart(2, "0");

/** الفصلُ الذي تحت العين: آخرُ رأسٍ عبر خطَّ القراءة (تحت الرأس العلويّ) — قراءةُ فهرس الخبر القديم نفسُها */
function useHeadSpy(ids: string[]) {
  const [on, setOn] = useState(ids[0] ?? "");
  const key = ids.join("|");
  useEffect(() => {
    const els = key.split("|").map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      let cur = els[0]!.id;
      for (const el of els) if (el.getBoundingClientRect().top < 160) cur = el.id;
      setOn(cur);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { if (frame) window.cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); };
  }, [key]);
  return { on, setOn };
}

/**
 * **ختامُ الخبر بقطع الهويّة** (٢٠٢٦-١١-١٧): «هل أعجبك الخبر؟» ثمّ زرّان — «أعجبني» يصير قطعةً من اللوح حين تضغطه (و«نعم، أعجبني» جوابُك
 * بصوتك كما كان)، وعددُه بجانبه، و**«شارك الخبر» قائمةُ المنصّات نفسُها** في الفعاليّة والكتيّب وصفحة العضو. كانت دائرةً كبيرةً وستّةَ أزرارٍ
 * مستديرةٍ بعرض الصفحة من الهويّة القديمة
 */
function End({ likes, liked, onLike, url, title }: { likes: number; liked: boolean; onLike: () => void; url: string; title: string }) {
  const share = useShare(url, title);
  const open = (href: string) => () => window.open(href, "_blank", "noopener,noreferrer");
  return (
    <div className="ad-nr-end">
      <p className="ad-nr-q">هل أعجبك الخبر؟</p>
      {/* **الإعجابُ بلونه المعروف** (محمد ٢٠٢٦-١١-١٧: «كان يعجبني أنّه يتحوّل إلى لون اللايك المعروف»): يحمرّ حين تضغطه */}
      <span className="ad-nr-like">
        <AdButton variant={liked ? "fill" : "line"} pressed={liked} icon={<Heart />} onClick={onLike}>
          {liked ? "نعم، أعجبني" : "أعجبني"}
          {likes ? <span className="ad-nr-count" aria-label={arCount(likes, AR_LIKE)}>{likes}</span> : null}
        </AdButton>
      </span>
      {/* **المنصّاتُ رموزًا بضغطةٍ واحدة** (محمد ٢٠٢٦-١١-١٧: «وجودُ الأيقونات أجمل بدل زرٍّ واحد») — أزرارُ الأيقونة في الهويّة، واسمُ كلٍّ تلميحُه.
          كانت ستّةَ أزرارٍ مستديرةٍ بعرض الصفحة، ثمّ «شارك الخبر» قائمةً تحتاج ضغطتين */}
      <div className="ad-nr-share" role="group" aria-label="شارك الخبر">
        <span className="ad-nr-share-k">شارك الخبر</span>
        <span className="ad-nr-share-l">
          <AdIconButton label="واتساب" icon={<WhatsappLogo />} onClick={open(share.links.whatsapp)} />
          <AdIconButton label="إكس" icon={<XLogo />} onClick={open(share.links.x)} />
          <AdIconButton label="تيليجرام" icon={<TelegramLogo />} onClick={open(share.links.telegram)} />
          <AdIconButton label="لينكدإن" icon={<LinkedinLogo />} onClick={open(share.links.linkedin)} />
          <AdIconButton label={share.copied ? "نُسخ الرابط" : "نسخ الرابط"} icon={share.copied ? <Check /> : <LinkSimple />} onClick={share.copy} done={share.copied} />
          {share.native ? <AdIconButton label="مشاركة عبر الجهاز" icon={<ShareNetwork />} onClick={share.more} /> : null}
        </span>
      </div>
    </div>
  );
}

export function NewsRead({ n, comments, more, siteKey, activity, coverage = "note", noToc, chapters = "plate", preview }: {
  n: PublicNews; comments: PublicComment[]; more: PublicNews[]; siteKey?: string;
  /** فعاليّةُ الخبر إن كان تغطيةً لها (`getNewsActivity`) */
  activity?: NewsActivity | null;
  /**
   * **كيف تُقال فعاليّةُ الخبر** (مختبر ٢٠٢٦-١١-١٧ — محمد: «الفكرةُ رائعة، وطريقةُ العرض غير رائعة»؛ كانت حقيقةً مسطّرةً رابعةً في سطر اللوح):
   * `note` ملاحظةٌ في أوّل المتن برمزها وفعلِها «صفحة الفعاليّة»، و`tag` شارةٌ زجاجيّةٌ ثانيةٌ بجانب «تغطية» في رأس اللوح تفتحها
   */
  coverage?: "note" | "tag";
  /** مختبر: الخبرُ بلا فهرسٍ ملازم (للمقارنة) */
  noToc?: boolean;
  /**
   * **رؤوسُ الفصول** (محمد ٢٠٢٦-١١-١٧): `plate` لوحُ الفصل توقيعًا للخبر (اختيارُه: «الفواصلُ السابقة أجمل»)، ومعه رأسُ المعرض والتعليقات
   * لوحين و«شرفةُ الكتابة»؛ و`group` عنوانُ المجموعة الموحَّد (للمقارنة في المختبر)
   */
  chapters?: "plate" | "group";
  /** معاينةُ المحرّر (`frame/news`): لا عودة، ولا إعجابَ يُكتب، ولا تعليقات — الخبرُ كما سيُقرأ لا كما يُتفاعَل معه */
  preview?: boolean;
}) {
  const a = useArticle(n, comments, preview);
  const byline = bylineOf(n.authors);
  const facts: PubReadFact[] = [
    ...(byline ? [{ icon: <Feather />, text: byline }] : []),
    ...(n.dateLabel ? [{ icon: <CalendarBlank />, text: n.dateLabel }] : []),
    { icon: <Clock />, text: arCount(n.readMinutes, AR_READ_MIN) },
    // **المشاهداتُ عادت** (محمد ٢٠٢٦-١١-١٧) — كانت أُسقطت من الصدر (٢٠٢٦-١٠-١٤: «الصدرُ للهويّة لا للأرقام»). عدُّها من `ViewSubject` وحده
    ...(n.views ? [{ icon: <Eye />, text: arCount(n.views, AR_VIEW) }] : []),
  ];

  // **الغلافُ والمعرضُ صورٌ واحدة** (٢٠٢٦-١١-١٧): من فتح الغلاف يقلّب إلى بقيّة الصور، ومن فتح صورةً من المعرض يرجع إلى الغلاف
  const shots: LightboxShot[] = [
    ...(n.cover ? [{ src: n.cover, alt: n.title, by: n.coverPhotographer || null }] : []),
    ...n.gallery.map((src, i) => ({ src, alt: `${n.title}، صورة ${i + 1}`, by: n.galleryPhotographers[i] || null })),
  ];
  const lead = n.cover ? 1 : 0;
  const [shot, setShot] = useState<number | null>(null);

  // الفهرسُ لخبرٍ بفصلين فأكثر (كما كان)، وآخرُه المعرضُ والتعليقات
  const items = a.heads.length > 1 && !noToc ? [
    ...a.heads.map((h, i) => ({ id: h.id, label: h.text, icon: <span className="ad-nr-num">{two(i + 1)}</span> })),
    ...(n.gallery.length ? [{ id: GALLERY_ID, label: "معرض الصور", icon: <Camera /> }] : []),
    { id: COMMENTS_ID, label: "التعليقات", icon: <ChatCircle /> },
  ] : [];
  const spy = useHeadSpy(items.map((x) => x.id));
  const toc = items.length ? <AdIndex label="فهرس الخبر" items={items} at={spy.on} onPick={spy.setOn} /> : undefined;

  return (
    <>
      <PubRead back={preview ? undefined : { href: "/news", label: "العودة إلى الأخبار" }} flat={!n.cover}
        tags={(
          <>
            <AdBadge glass>{n.featured ? CATEGORY_META[n.category].featured : CATEGORY_META[n.category].label}</AdBadge>
            {/* **تغطيةُ فعاليّة** (٢٠٢٦-١١-١٧): من قرأ التغطيةَ يعرف أين صفحتُها — والفعاليّةُ تقول «اقرأ خبر التغطية» فيتقابلان */}
            {activity && coverage === "tag" ? (
              <Link className="ad-nr-cov" href={`/activities/${activity.id}`}>
                <AdBadge glass icon={<CalendarCheck aria-hidden />}>{activity.name}<ArrowLeft aria-hidden /></AdBadge>
              </Link>
            ) : null}
          </>
        )}
        title={n.title} dek={n.summary ?? undefined} facts={facts}
        hero={n.cover ? { src: n.cover, alt: n.title, credit: n.coverPhotographer, creditIcon: <Camera aria-hidden />, onOpen: () => setShot(0) } : null}
        toc={toc}>
        {/* ما داخل الخبر (`.art`: حاويتُه، بقطع الهويّة) */}
        <div className="art ad-nr-art" id="art">
          <div className="art-col"><ArticleBody blocks={a.blocks} look={chapters === "plate" ? "plate" : "ad"} /></div>

          {n.gallery.length ? (
            <section className="ad-nr-sec">
              {/* رأسُ المعرض من عائلة رؤوس الفصول، وعددُ صوره في طرفه */}
              {chapters === "plate" ? (
                <h2 className="ad-nr-chap" data-icon="" id={GALLERY_ID}>
                  <Camera className="ad-nr-chap-ic" aria-hidden />
                  <span className="ad-nr-chap-t">معرض الصور</span>
                  <AdBadge glass>{arCount(n.gallery.length, AR_PHOTO)}</AdBadge>
                </h2>
              ) : (
                <h2 className="ad-gtitle ad-nr-h" id={GALLERY_ID}>
                  <span className="ad-gtitle-name"><Camera aria-hidden /><span>معرض الصور</span></span>
                  <span className="ad-nr-hn">{arCount(n.gallery.length, AR_PHOTO)}</span>
                </h2>
              )}
              <div className="ad-nr-gal"><ArticleGallery images={n.gallery} photographers={n.galleryPhotographers} title={n.title} onOpen={(i) => setShot(i + lead)} /></div>
            </section>
          ) : null}

          {/* **فعاليّةُ الخبر بعد صوره** (محمد ٢٠٢٦-١١-١٧): في أوّل المتن كانت تؤخّر الخبرَ وتزاحم الفهرس، و«تغطية» في اللوح تقول ذلك أصلًا؛
              وسؤالُ «أين هذه الفعاليّة؟» يأتي بعد أن يقرأ ويرى — فهنا، قبل «هل أعجبك الخبر؟». والتاريخُ وحده: الزرُّ يقول ما في صفحتها */}
          {activity && coverage === "note" ? (
            <div className="ad-nr-cov-note">
              <AdNote tone="info" icon={<CalendarCheck />} title={`تغطيةٌ لفعاليّة «${activity.name}»`}
                action={<AdButton variant="line" size="sm" icon={<ArrowLeft />} href={`/activities/${activity.id}`}>صفحة الفعاليّة</AdButton>}>
                {activity.dateLabel ? `أُقيمت في ${activity.dateLabel}.` : undefined}
              </AdNote>
            </div>
          ) : null}

          <End likes={a.likes} liked={a.liked} onLike={preview ? () => {} : a.like} url={`/news/${encodeURIComponent(n.slug || n.id)}`} title={n.title} />

          {preview ? null : <div className="ad-nr-sec">
            <NewsComments items={a.rows} me={a.me} onLike={a.likeComment} onSend={a.send} busy={a.sending} notice={a.notice} siteKey={siteKey}
              next={`/news/${n.slug ?? ""}`} onDelete={a.canModerate ? a.setKill : undefined} plate={chapters === "plate"} />
          </div>}
        </div>
      </PubRead>

      {more.length ? (
        <section className="ad-pr-more ad-nr-more">
          {/* لوحُ فصلٍ كأخواته (محمد ٢٠٢٦-١١-١٧): عنوانُ المجموعة بين الألواح كان «شاطحًا» */}
          <h2 className="ad-nr-chap" data-icon="">
            <Newspaper className="ad-nr-chap-ic" aria-hidden />
            <span className="ad-nr-chap-t">اقرأ أيضًا</span>
          </h2>
          <PubGrid>
            {more.map((m) => {
              const by = bylineOf(m.authors);
              return (
                <PubCard key={m.id} href={newsHref(m)} cover={m.cover} placeholder={<Newspaper />}
                  tag={m.featured ? <><Star aria-hidden />{CATEGORY_META[m.category].featured}</> : CATEGORY_META[m.category].label}
                  facts={[...(m.dateLabel ? [{ icon: <CalendarBlank />, text: m.dateLabel }] : []), { icon: <Clock />, text: arCount(m.readMinutes, AR_READ_MIN) },
                    ...(m.views ? [{ icon: <Eye />, text: arCount(m.views, AR_VIEW) }] : [])]}
                  title={m.title} lines={by ? [{ icon: <Feather />, text: by }] : undefined} />
              );
            })}
          </PubGrid>
        </section>
      ) : null}

      <Lightbox shots={shots} index={shot} onClose={() => setShot(null)} onIndex={setShot} emptyBy="بلا نسبة"
        byIcon={<Camera aria-hidden />} closeIcon={<X aria-hidden />} />

      {/* الحذفُ نهائيّ فبتأكيد (تأكيدُ الهويّة لا `ConfirmDialog` القديم)، والفعلُ فعلُ اللوحة نفسُه */}
      <AdConfirm open={a.kill !== null} onClose={() => a.setKill(null)} tone="danger" icon={<Trash />} title="حذف التعليق؟"
        text="يُحذف نهائيًّا ومعه إعجاباته." confirmLabel="حذف" loading={a.killing} onConfirm={a.removeComment} />
    </>
  );
}
