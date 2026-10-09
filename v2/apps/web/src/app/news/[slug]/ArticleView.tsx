"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Badge } from "@adeeb/design-system";
import { CalendarBlank, Camera, Clock, Feather } from "@phosphor-icons/react";
import { CATEGORY_META } from "@adeeb/core/news";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { fmtDate } from "@/lib/dates";
import { outline, parseBody } from "@/lib/news/body";
import { sectionsToBlocks } from "@/lib/news/blocks";
import { bylineOf } from "@/lib/news/byline";
import type { NewsReactions } from "@/app/api/news/reactions/route";
import type { PublicNews } from "../data";
import { ArticleBody } from "./_parts/ArticleBody";
import { ArticleGallery } from "./_parts/ArticleGallery";
import { Comments, type PublicComment } from "./_parts/Comments";
import { ReaderBar } from "./_parts/ReaderBar";
import { postComment, toggleCommentLike, toggleNewsLike } from "./actions";

/**
 * **صفحةُ الخبر — صدرُها «الشُّرفة»، أقرّها المالك ٢٠٢٦-٠٩-١٩** بعد أن رأى خمسةَ
 * رؤوسٍ في صفحاتٍ كاملةٍ متقابلة (وأُعدمت المعارضُ الثلاثةُ وأصنافُها بإقراره).
 *
 * الغلافُ شريطٌ يمتدّ، وبطاقةُ العنوان تركبه من أسفلَ فترتفع فيه: فالصورةُ تُرى صافيةً
 * بلا حجاب، والعنوانُ على الورق يُقرأ مهما طال. وسقط الصدرُ الأوّل (غلافٌ تغمره ستارة)
 * لأنّ مادّتَنا لا تحتمله — أغلفتُنا لقطاتُ جوّالٍ مزدحمة وعناوينُنا تبلغ أربعةَ أسطرٍ
 * على ٣٧٥، فالحجابُ الذي يُقرئ العنوانَ يبتلع الصورة.
 *
 * **والصفحةُ ساكنةٌ وجزيرتُها حيّة:** المتنُ والصورُ والتعليقاتُ المُقَرّةُ تأتي مع
 * التوليد، وما يخصّ القارئَ وحدَه (أعجبتُ؟ · أيُّ تعليقٍ أعجبني؟ · أينتظر كلامي
 * الإقرار؟) يُطلَب بعد التركيب من `/api/news/reactions`. فلا تسقط التخبئةُ من أجل
 * قلبٍ واحد.
 */

const AR_MIN: ArForms = ["دقيقةُ قراءة", "دقيقتا قراءة", "دقائق قراءة", "دقيقةَ قراءة"];

export function ArticleView({
  n,
  comments,
  siteKey,
}: {
  n: PublicNews;
  comments: PublicComment[];
  siteKey?: string;
}) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(n.likes);
  const [rows, setRows] = useState<PublicComment[]>(comments);
  const [signedIn, setSignedIn] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // الأقسامُ المصرَّحةُ إن وُجدت، وإلّا فالاستدلالُ على النصّ الخام. وهذا هو الهبوطُ
  // الآمن: خبرٌ لم يُحوَّل بعدُ يُعرَض اليومَ كما كان يُعرَض أمسِ، بلا لحظةِ انكسار.
  const blocks = n.sections ? sectionsToBlocks(n.sections) : parseBody(n.content);
  const heads = outline(blocks);

  // ما يخصّ هذا القارئَ وحدَه — يصل بعد التركيب فلا يُفسد سكونَ الصفحة.
  useEffect(() => {
    let alive = true;
    fetch(`/api/news/reactions?news=${n.id}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<NewsReactions>) : null))
      .then((d) => {
        if (!alive || !d) return;
        setSignedIn(d.signedIn);
        setLiked(d.liked);
        setLikes(d.likes);
        setRows((s) => {
          const mine = new Set(d.likedComments);
          const known = new Set(s.map((c) => c.id));
          const waiting: PublicComment[] = d.pending
            .filter((p) => !known.has(p.id))
            .map((p) => ({
              id: p.id, name: "أنت", standing: null, gender: null, avatar: null,
              text: p.text, when: fmtDate(p.when), likes: 0, liked: false, pending: true,
            }));
          return [...waiting, ...s.map((c) => ({ ...c, liked: mine.has(c.id) }))];
        });
      })
      .catch(() => { /* تعذّر السؤال: تبقى الصفحةُ صالحةً بما جاء مع التوليد */ });
    return () => { alive = false; };
  }, [n.id]);

  /** عرضٌ متفائل: القلبُ يمتلئ قبل أن يردّ الخادم ويرتدّ إن ردّ بخطأ. */
  const like = useCallback(async () => {
    const was = liked;
    setLiked(!was);
    setLikes((c) => c + (was ? -1 : 1));
    const res = await toggleNewsLike(n.id);
    if (!res.ok) {
      setLiked(was);
      setLikes((c) => c + (was ? 1 : -1));
      setNotice(res.message);
      return;
    }
    if (typeof res.total === "number") setLikes(res.total);
    if (typeof res.liked === "boolean") setLiked(res.liked);
  }, [liked, n.id]);

  const likeComment = useCallback(async (id: string) => {
    const row = rows.find((c) => c.id === id);
    if (!row || row.pending) return;
    const was = row.liked;
    setRows((s) => s.map((c) => (c.id === id ? { ...c, liked: !was, likes: c.likes + (was ? -1 : 1) } : c)));
    const res = await toggleCommentLike(id);
    if (!res.ok) {
      setRows((s) => s.map((c) => (c.id === id ? { ...c, liked: was, likes: c.likes + (was ? 1 : -1) } : c)));
      setNotice(res.message);
    }
  }, [rows]);

  const send = useCallback(async (text: string, guestName: string, token?: string) => {
    setSending(true);
    setNotice(null);
    const res = await postComment({ newsId: n.id, text, guestName, turnstileToken: token });
    setSending(false);
    if (!res.ok) { setNotice(res.message); return false; }
    // يظهر عند صاحبه موسومًا «ينتظر الإقرار»، فلا يظنّ أنّ كلامَه ضاع.
    setRows((s) => [
      { id: res.id!, name: signedIn ? "أنت" : guestName, standing: null, gender: null,
        avatar: null, text, when: fmtDate(new Date().toISOString()), likes: 0, liked: false, pending: true },
      ...s,
    ]);
    setNotice(res.message);
    return true;
  }, [n.id, signedIn]);

  const bar = (className?: string): ReactNode => (
    <ReaderBar
      likes={likes} liked={liked} comments={rows.filter((c) => !c.pending).length}
      onLike={like}
      onComment={() => document.getElementById("art-comments")?.scrollIntoView({ behavior: "smooth" })}
      url={`/news/${encodeURIComponent(n.slug || n.id)}`} title={n.title}
      {...(className ? { className } : {})}
    />
  );

  return (
    <article className="art" id="art">
      {/* ── الصدر: «الشُّرفة»، أقرّها المالك ٢٠٢٦-٠٩-١٩ ──
          الغلافُ شريطٌ يمتدّ، وبطاقةُ العنوان تركبه من أسفلَ فترتفع فيه. والعنوانُ
          على الورق لا على الصورة، فيُقرأ مهما طال ومهما ازدحم الغلاف. */}
      <header className="art-wide">
        {n.cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={n.cover} alt={n.title} className="art-band" />
        ) : null}
        <div className={n.cover ? "art-ledge" : "art-ledge art-ledge-bare"}>
          <Kicker n={n} />
          <h1 className="art-title">{n.title}</h1>
          {n.summary ? <p className="art-lede">{n.summary}</p> : null}
          <Meta n={n} />
        </div>
      </header>

      <div className="art-wide mt-8">
        <div className={heads.length > 1 ? "art-split" : ""}>
          <div className="min-w-0">
            <div className="art-col">
              {bar()}
              <ArticleBody blocks={blocks} />
            </div>

            {n.gallery.length ? (
              <section className="mt-12">
                <h2 className="art-h art-col">معرض الصور</h2>
                <div className="mt-5">
                  <ArticleGallery images={n.gallery} photographers={n.galleryPhotographers} title={n.title} />
                </div>
              </section>
            ) : null}

            {n.tags.length ? (
              <div className="art-col mt-10 flex flex-wrap gap-2">
                {n.tags.map((t) => <Badge key={t} tone="neutral" variant="soft">{t}</Badge>)}
              </div>
            ) : null}

            <div className="art-col mt-10">{bar()}</div>

            <div className="mt-12">
              <Comments
                items={rows} signedIn={signedIn} onLike={likeComment} onSend={send}
                busy={sending} notice={notice} siteKey={siteKey}
              />
            </div>
          </div>

          {heads.length > 1 ? (
            <nav className="art-toc" aria-label="فهرس المقال">
              <p className="art-toc-h">في هذا الخبر</p>
              <ul className="art-toc-l">
                {heads.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>

      {bar("art-dock")}
    </article>
  );
}

/* ── قطعُ الرأس ─────────────────────────────────────────────────────────── */

function Kicker({ n }: { n: PublicNews }) {
  return (
    <div className="art-kicker">
      <Badge tone="neutral" variant="soft">{CATEGORY_META[n.category].label}</Badge>
      {n.featured ? <Badge tone="warning" variant="soft" dot>مميّز</Badge> : null}
    </div>
  );
}

/**
 * صفُّ الحقائق. **ولا مشاهداتٍ فيه** — لا لعطلٍ بل لأنّ الصدرَ للهويّة لا للأرقام.
 *
 * وعدّادُ المشاهدات كان معطوبًا (`news_bump_views` تصفّي على عمود `status` المُسقَط،
 * ولا نداءَ لها)، فأُسقطت في ٢٠٢٦-٠٩-٢٤ وصار الرقمُ **مشتقًّا من جهاز الرصد**: مُشغِّلٌ
 * على `site_pageviews` يزيد مشاهدةً لكلّ فتحةٍ غيرِ روبوتيّة. فمصدرٌ واحدٌ للحقيقة،
 * ولا عدّادَ ثانٍ يُنادى من الصفحة.
 */
function Meta({ n }: { n: PublicNews }) {
  const byline = bylineOf(n.authors);
  return (
    <div className="art-meta">
      {n.dateLabel ? (
        <span className="art-meta-i"><CalendarBlank size={16} aria-hidden />{n.dateLabel}</span>
      ) : null}
      {/* **«بريشة» لا الاسمَ عاريًا**: هي لفظُ أدِيب لمن كتب (ونقلًا عن V1)، وتُقابلها
          «عدسة» لمن صوّر — فيُقرأ الصفُّ جملًا لا أسماءً مرصوفة. وأيقونتُها السنُّ
          لا صورةُ شخص: الإسنادُ إلى الفعل لا إلى الوجه. و**ريشةٌ لا قلم** — اللفظُ
          «بريشة» فلتكن الأيقونةُ ما يسمّيه، والريشةُ علامةُ أدِيب نفسِها.
          والصيغةُ تتبع العدد (`lib/news/byline`): مفردٌ ومثنًّى وجمع. */}
      {byline ? (
        <span className="art-meta-i"><Feather size={16} aria-hidden />{byline}</span>
      ) : null}
      <span className="art-meta-i"><Clock size={16} aria-hidden />{arCount(n.readMinutes, AR_MIN)}</span>
      {/* النسبةُ إلى المصوّر كانت سطرًا وحدَها تحت اللوح، فبدت شاردةً معلّقة. وهي
          حقيقةٌ من حقائق الخبر كتاريخه وكاتبه، فموضعُها بينها. */}
      {n.coverPhotographer ? (
        <span className="art-meta-i"><Camera size={16} aria-hidden />عدسة {n.coverPhotographer}</span>
      ) : null}
    </div>
  );
}
