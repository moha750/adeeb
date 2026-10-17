"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Lightbox } from "@adeeb/design-system";
import { CalendarBlank, Camera, Clock, Feather } from "@phosphor-icons/react";
import { CATEGORY_META } from "@adeeb/core/news";
import { AR_READ_MIN, arCount, type ArForms } from "@/lib/arabicCount";
import { fmtDate } from "@/lib/dates";
import { outline, parseBody } from "@/lib/news/body";
import { sectionsToBlocks } from "@/lib/news/blocks";
import { bylineOf } from "@/lib/news/byline";
import type { NewsReactions } from "@/app/api/news/reactions/route";
import type { PublicNews } from "../data";
import { ArticleBody } from "./_parts/ArticleBody";
import { ArticleGallery } from "./_parts/ArticleGallery";
import { ArticleToc, GALLERY_ID } from "./_parts/ArticleToc";
import { Comments, type CommentMe, type PublicComment } from "./_parts/Comments";
import { ReaderEnd } from "./_parts/ReaderEnd";
import { ArrowRight, X } from "@/app/_components/glyphs";
import { postComment, toggleCommentLike, toggleNewsLike } from "./actions";
import { deletePublicComment } from "@/app/dashboard/news/actions";
import { ConfirmDialog } from "@/app/dashboard/_components/ConfirmDialog";
import { Trash } from "@/app/_components/glyphs";

const AR_PHOTO: ArForms = ["صورةٌ واحدة", "صورتان", "صور", "صورةً"];

/**
 * **صفحةُ الخبر — صدرُها «الشُّرفةُ المقلوبة»، أقرّها المالك ٢٠٢٦-١٠-١٤** وحلّت محلّ
 * «الشُّرفة» (٢٠٢٦-٠٩-١٩) بعد أن رآهما متقابلتين في `/ui/news-hero`.
 *
 * اللوحُ الكحليُّ يحمل الكلام، والغلافُ يتدلّى منه إلى الورق فيُرى كاملًا. والعنوانُ
 * على اللوح لا على الصورة، فيُقرأ مهما طال ومهما ازدحم الغلاف — وهي علّةُ الشُّرفة
 * الأولى باقيةً محفوظة. وسقطت الشُّرفةُ لأنّ لوحَها حمل كلَّ شيء فطال وغطّى الصورة
 * ودفع الخبرَ خارجَ الشاشة الأولى (التفصيلُ عند `.art-hang` في components.css).
 *
 * **والصفحةُ ساكنةٌ وجزيرتُها حيّة:** المتنُ والصورُ والتعليقاتُ المُقَرّةُ تأتي مع
 * التوليد، وما يخصّ القارئَ وحدَه (أعجبتُ؟ · أيُّ تعليقٍ أعجبني؟ · أينتظر كلامي
 * الإقرار؟) يُطلَب بعد التركيب من `/api/news/reactions`. فلا تسقط التخبئةُ من أجل
 * قلبٍ واحد.
 */

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
  // هويّةُ القارئ المسجَّل كما سيُنشَر بها تعليقُه — تصل بعد التركيب، و`null` زائر.
  const [me, setMe] = useState<CommentMe | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** رئيسُ التحرير يحذف من الصفحة نفسها (شرطُ النشر المباشر الثاني). يُعرَف بعد التركيب كبقيّة ما يخصّ القارئ. */
  const [canModerate, setCanModerate] = useState(false);
  const [kill, setKill] = useState<string | null>(null);
  const [killing, setKilling] = useState(false);

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
        setMe(d.me);
        setCanModerate(!!d.canModerate);
        setLiked(d.liked);
        setLikes(d.likes);
        setRows((s) => {
          const mine = new Set(d.likedComments);
          // عددُ إعجابات كلّ تعليقٍ حيًّا: ما جاء مع التوليد الساكن قد يكون أقدمَ بدقيقة.
          const counts = d.commentLikes ?? {};
          return s.map((c) => ({ ...c, liked: mine.has(c.id), likes: counts[c.id] ?? c.likes }));
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
    if (!row) return;
    const was = row.liked;
    setRows((s) => s.map((c) => (c.id === id ? { ...c, liked: !was, likes: c.likes + (was ? -1 : 1) } : c)));
    const res = await toggleCommentLike(id);
    if (!res.ok) {
      setRows((s) => s.map((c) => (c.id === id ? { ...c, liked: was, likes: c.likes + (was ? 1 : -1) } : c)));
      setNotice(res.message);
      return;
    }
    // ثمّ حالُ القاعدة الصادقة، كإعجاب الخبر: لا يبقى قلبٌ أحمرُ لم يُحفظ.
    setRows((s) => s.map((c) => (c.id === id
      ? { ...c, liked: res.liked ?? c.liked, likes: typeof res.total === "number" ? res.total : c.likes }
      : c)));
  }, [rows]);

  const send = useCallback(async (text: string, guestName: string, token?: string) => {
    setSending(true);
    setNotice(null);
    const res = await postComment({ newsId: n.id, text, guestName, turnstileToken: token });
    setSending(false);
    if (!res.ok) { setNotice(res.message); return false; }
    // **منشورٌ لحظتَه** (المالك ٢٠٢٦-١٠-١٦): يظهر في رأس القائمة كرتًا كاملًا كما يراه غيرُه، بمنزلته
    // وتاريخه وقلبه، وهو التأكيدُ نفسُه فلا رسالةَ معه.
    setRows((s) => [
      { id: res.id!, name: me?.name ?? guestName, standing: me?.standing ?? null, gender: me?.gender ?? null,
        avatar: me?.avatar ?? null, text, when: fmtDate(new Date().toISOString()), likes: 0, liked: false },
      ...s,
    ]);
    return true;
  }, [n.id, me]);

  /** الحذفُ نهائيّ، فبتأكيد. والفعلُ نفسُه فعلُ اللوحة (`deletePublicComment`) فلا يفترق الحكمان. */
  const removeComment = useCallback(async () => {
    if (!kill) return;
    setKilling(true);
    const res = await deletePublicComment(kill);
    setKilling(false);
    if (!res.ok) { setKill(null); setNotice(res.message); return; }
    setRows((s) => s.filter((c) => c.id !== kill));
    setKill(null);
  }, [kill]);

  const commentsEl = (
    <>
      <Comments
        items={rows} me={me} onLike={likeComment} onSend={send}
        busy={sending} notice={notice} siteKey={siteKey} next={`/news/${n.slug ?? ""}`}
        onDelete={canModerate ? setKill : undefined}
      />
      <ConfirmDialog
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف التعليق؟"
        text="يُحذف نهائيًّا ومعه إعجاباته."
        confirmLabel="حذف"
        loading={killing}
        onConfirm={removeComment}
      />
    </>
  );

  return (
    <article className="art" id="art">
      <Hero n={n} />

      <div className="art-wide mt-8">
        <div className={heads.length > 1 ? "art-split" : ""}>
          <div className="min-w-0">
            <div className="art-col">
              <ArticleBody blocks={blocks} />
            </div>

            {n.gallery.length ? (
              <section className="mt-12">
                {/* رأسُ المعرض من عائلة رؤوس الفصول: لوحٌ منقوش، والكاميرا خلف العنوان تذوب
                    كما يذوب رقمُ الفصل، وعددُ الصور حبّةٌ زجاجيّة. */}
                <h2 className="art-sec-h" id={GALLERY_ID}>
                  <Camera className="art-sec-ic" aria-hidden />
                  <span className="art-h-t">معرض الصور</span>
                  <Badge tone="neutral" variant="glass">{arCount(n.gallery.length, AR_PHOTO)}</Badge>
                </h2>
                <div className="mt-4">
                  <ArticleGallery images={n.gallery} photographers={n.galleryPhotographers} title={n.title} />
                </div>
              </section>
            ) : null}

            {/* **سطرُ الختام** بلا إطار: الإعجابُ ومشاركةٌ بزرٍّ لكلّ منصّة (المالك ٢٠٢٦-١٠-١٤).
                كانت بطاقةً مؤطَّرةً بثلاثة أزرار تحت الصدر وهنا وشريطًا على الجوّال، ثمّ
                بطاقةً هنا وحدَها، فرُدّت؛ وسقط «علِّق» لأنّ التعليقاتِ تحته مباشرة. */}
            <div className="art-col mt-10">
              <ReaderEnd
                likes={likes} liked={liked} onLike={like}
                url={`/news/${encodeURIComponent(n.slug || n.id)}`} title={n.title}
              />
            </div>

            <div className="mt-12">{commentsEl}</div>
          </div>

          {heads.length > 1 ? <ArticleToc heads={heads} gallery={n.gallery.length > 0} /> : null}
        </div>
      </div>

    </article>
  );
}

/* ── الصدر ─────────────────────────────────────────────────────────────── */

/**
 * «الشُّرفةُ المقلوبة». سطرُ الفئة يحمل التاريخَ ومدّةَ القراءة (أعادها المالك ٢٠٢٦-١٠-١٤
 * بعد أن أُسقطت في المعاينة)، **ولا مشاهدات:** الصدرُ للهويّة لا للأرقام.
 *
 * و«بريشة» لا الاسمَ عاريًا: لفظُ أدِيب لمن كتب، والصيغةُ تتبع العدد (`lib/news/byline`).
 * و«عدسة» على الصورة نفسِها لا بين حقائق الخبر: كانت هناك فلم يُعرَف لمن تُنسَب.
 */
/** التاريخُ ومدّةُ القراءة — يُرسَمان في موضعين بحسب السعة (انظر `.art-hang-facts`). */
function Facts({ n, className }: { n: PublicNews; className: string }) {
  return (
    <span className={className}>
      {n.dateLabel ? (
        <span className="art-hang-fact"><CalendarBlank size={15} aria-hidden />{n.dateLabel}</span>
      ) : null}
      <span className="art-hang-fact"><Clock size={15} aria-hidden />{arCount(n.readMinutes, AR_READ_MIN)}</span>
    </span>
  );
}

export function Hero({ n, dek = true }: { n: PublicNews; dek?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const byline = bylineOf(n.authors);

  return (
    <header className="art-wide art-hang">
      {/* **العودةُ إلى الأخبار: لسانٌ من اللوح فوقه يمينًا** (المالك ٢٠٢٦-١٠-١٥). مرّ بأربعة أشكال:
          ١) كبسولةٌ زجاجيّةٌ في ركن اللوح الأيسر: «صعبة» — خافتةٌ على الكحليّ وفي آخر ما تبلغه العين.
          ٢) زرٌّ أبيضُ فوق اللوح: واضحٌ، لكنّه وحده في صفٍّ نصفُه خالٍ.
          ٣) زرٌّ أبيضُ داخل اللوح: يزاحم العنوانَ على الانتباه.
          ٤) (معاينةٌ لم تُعتمد) شارةُ الفئة مسارًا «الأخبار | تغطية»: هادئةٌ لكنّها تُقرأ وسمًا لا زرًّا.
          واللسانُ بلون اللوح فلا يزاحم العنوان، وفيه اللفظُ كاملًا فهو واضح، والصفُّ صار شكلَ اللوح لا فراغًا.
          **ويمينًا لا يسارًا:** هناك زرُّ الرجوع في كلّ واجهةٍ عربيّة، وسهمُه (→) يشير إلى «الوراء» في اتّجاه
          القراءة. واللفظُ فعلٌ لا اسمُ مكان («منصّة الأخبار» لا يقول إنّه رجوع). وإلى `/news` لا إلى
          «الخلف»: أكثرُ الداخلين من واتساب. */}
      <nav className="art-back" aria-label="مسار الصفحة">
        <Link href="/news">
          <ArrowRight size={16} aria-hidden />
          العودة إلى الأخبار
        </Link>
      </nav>
      <div className={n.cover ? "art-hang-panel" : "art-hang-panel art-hang-panel-bare"}>
        {/* **التاريخُ ومدّةُ القراءة يُكتبان مرّتين ويظهر أحدُهما** (المالك ٢٠٢٦-١٠-١٤): على
            الجوّال مع الفئة في سطرها، وعلى السعة تنفرد الفئةُ وينزلان إلى سطر الكاتب فلا
            يتكدّس الصدر. والمخفيُّ بـ`display: none` يسقط من شجرة القارئ الآليّ، فلا يُقرأ مرّتين. */}
        <div className="art-hang-kicker">
          {/* التمييزُ صفةٌ في اسم الفئة («تغطية مميّزة») لا شارةٌ ثانيةٌ بلونٍ يخرج عن اللوح. */}
          <Badge tone="neutral" variant="glass">
            {n.featured ? CATEGORY_META[n.category].featured : CATEGORY_META[n.category].label}
          </Badge>
          <Facts n={n} className="art-hang-facts art-hang-facts-top" />
        </div>
        <h1 className="art-title">{n.title}</h1>
        {/* **الموجزُ عنوانٌ فرعيٌّ تحت العنوان في اللوح** (المالك ٢٠٢٦-١٠-١٤): تحت الغلاف قُرئ تعليقًا على
            الصورة، وأوّلَ المتن لم يُعرف أهو موجزٌ أم بدايةُ الخبر. وهنا يُقرأ كما تقرؤه الصحف. */}
        {dek && n.summary ? <p className="art-hang-dek">{n.summary}</p> : null}
        <div className="art-hang-sub">
          {byline ? <p className="art-hang-by"><Feather size={17} aria-hidden />{byline}</p> : null}
          <Facts n={n} className="art-hang-facts art-hang-facts-low" />
        </div>
      </div>

      {n.cover ? (
        <figure className="art-hang-cover">
          <button type="button" onClick={() => setOpen(0)} aria-label="كبّر صورة الغلاف">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={n.cover} alt={n.title} />
          </button>
          {n.coverPhotographer ? (
            <span className="art-hang-credit">
              <Camera size={13} aria-hidden /><span>عدسة {n.coverPhotographer}</span>
            </span>
          ) : null}
          <Lightbox
            shots={[{ src: n.cover, alt: n.title, by: n.coverPhotographer }]}
            index={open}
            onClose={() => setOpen(null)}
            onIndex={setOpen}
            byIcon={<Camera size={14} aria-hidden />}
            closeIcon={<X aria-hidden />}
          />
        </figure>
      ) : null}

    </header>
  );
}
