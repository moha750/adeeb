"use client";

import { useState } from "react";
import { Badge, Container, Segmented } from "@adeeb/design-system";
import {
  CalendarBlank, Camera, ChatCircle, Clock, Feather, Heart, Newspaper, ShareNetwork,
} from "@phosphor-icons/react";
import { CATEGORY_META } from "@adeeb/core/news";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { parseBody } from "@/lib/news/body";
import { bylineOf } from "@/lib/news/byline";
import { newsHref } from "@/lib/news/link";
import type { PublicNews } from "@/app/news/data";
import { ArticleBody } from "@/app/news/[slug]/_parts/ArticleBody";
import { ArticleGallery } from "@/app/news/[slug]/_parts/ArticleGallery";
import type { PublicComment } from "@/app/news/[slug]/_parts/Comments";

/**
 * ثلاثُ صفحاتٍ للخبر نفسِه، والمتغيّرُ **سطحُ الشُّرفة وحدَه**: كلُّ ما عداه متطابقٌ
 * حرفًا بحرف، فالحكمُ يقع على المتغيّر لا على فرقٍ آخرَ تسلّل معه.
 */

const AR_MIN: ArForms = ["دقيقةُ قراءة", "دقيقتا قراءة", "دقائق قراءة", "دقيقةَ قراءة"];
const AR_COMMENT: ArForms = ["تعليقٌ واحد", "تعليقان", "تعليقات", "تعليقًا"];

const WIDTHS = [
  { value: "375", label: "جوّال ٣٧٥" },
  { value: "430", label: "جوّال كبير ٤٣٠" },
  { value: "520", label: "أوسع" },
];

/** أ) الصلبُ الحيّ · ب) زجاجٌ فاتحٌ بحبرٍ داكن · ج) زجاجٌ داكنٌ بحبرٍ فاتح. */
type Mode = "solid" | "glass" | "smoke";

const LEDGE: Record<Mode, string> = {
  solid: "art-ledge",
  glass: "art-ledge artv-ledge-glass",
  smoke: "art-ledge artv-ledge-smoke",
};

/** الشارات تبقى كما هي اليوم في الثلاثة — المتغيّرُ سطحُ اللوح لا هي. */
function Kicker({ n }: { n: PublicNews }) {
  return (
    <div className="art-kicker">
      <Badge tone="neutral" variant="soft">{CATEGORY_META[n.category].label}</Badge>
      {n.featured ? <Badge tone="warning" variant="soft" dot>مميّز</Badge> : null}
    </div>
  );
}

function Meta({ n }: { n: PublicNews }) {
  const byline = bylineOf(n.authors);
  return (
    <div className="art-meta">
      {n.dateLabel ? <span className="art-meta-i"><CalendarBlank size={16} aria-hidden />{n.dateLabel}</span> : null}
      {byline ? <span className="art-meta-i"><Feather size={16} aria-hidden />{byline}</span> : null}
      <span className="art-meta-i"><Clock size={16} aria-hidden />{arCount(n.readMinutes, AR_MIN)}</span>
      {n.coverPhotographer ? (
        <span className="art-meta-i"><Camera size={16} aria-hidden />عدسة {n.coverPhotographer}</span>
      ) : null}
    </div>
  );
}

function Bar({ n, comments }: { n: PublicNews; comments: number }) {
  return (
    <div className="art-bar">
      <button type="button" className="art-act" aria-pressed={false}>
        <Heart size={18} aria-hidden />{n.likes ? <b>{n.likes}</b> : null}<span>إعجاب</span>
      </button>
      <button type="button" className="art-act">
        <ChatCircle size={18} aria-hidden />{comments ? <b>{comments}</b> : null}<span>تعليق</span>
      </button>
      <span className="art-bar-sp" aria-hidden />
      <button type="button" className="art-act">
        <ShareNetwork size={18} aria-hidden /><span>شارك</span>
      </button>
    </div>
  );
}

function Page({
  n, comments, more, mode,
}: {
  n: PublicNews; comments: PublicComment[]; more: PublicNews[]; mode: Mode;
}) {
  const blocks = parseBody(n.content);
  return (
    <article className="art">
      <header className="art-wide">
        {n.cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={n.cover} alt={n.title} className="art-band" />
        ) : null}
        <div className={n.cover ? LEDGE[mode] : `${LEDGE[mode]} art-ledge-bare`}>
          <Kicker n={n} />
          <h1 className="art-title">{n.title}</h1>
          {n.summary ? <p className="art-lede">{n.summary}</p> : null}
          <Meta n={n} />
        </div>
      </header>

      <div className="art-wide mt-8">
        <div className="art-col">
          <Bar n={n} comments={comments.length} />
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

        <div className="art-col mt-10"><Bar n={n} comments={comments.length} /></div>

        <section className="art-col mt-12">
          <h2 className="art-h">{comments.length ? arCount(comments.length, AR_COMMENT) : "لا تعليقَ بعد"}</h2>
          {comments.length ? (
            <div className="art-cmts mt-6">
              {comments.map((c) => (
                <article key={c.id} className="art-cmt">
                  <Avatar name={c.name} src={c.avatar ?? undefined} gender={c.gender} size="sm" />
                  <div>
                    <header className="art-cmt-who">
                      <span className="art-cmt-name">{c.name}</span>
                      <span className="art-cmt-when">{c.when}</span>
                    </header>
                    <p className="art-cmt-txt">{c.text}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        {more.length ? (
          <section className="art-col mt-14">
            <h2 className="art-h">اقرأ أيضًا</h2>
            <div className="mt-5 flex flex-col gap-4">
              {more.map((m) => (
                <a key={m.id} href={newsHref(m)} className="flex gap-3">
                  {m.cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.cover} alt="" className="h-16 w-24 shrink-0 rounded-sm object-cover" />
                  ) : null}
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-6 text-content">{m.title}</span>
                    <span className="block text-xs text-content-muted">{m.dateLabel}</span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}

const MODES: { mode: Mode; tag: string; live?: boolean; why: string }[] = [
  {
    mode: "solid", tag: "أ) الحيُّ اليوم، لوحٌ صلب", live: true,
    why: "تدرّجُ الهوية مصمتًا. الحبرُ فاتحٌ والقراءةُ مضمونةٌ على أيّ غلاف، ولا شيءَ يتنفّس من خلفه.",
  },
  {
    mode: "glass", tag: "ب) زجاجٌ فاتح",
    why: "الرمزُ كما هو في المكتبة (أبيضُ شفّاف وضباب). والحبرُ **يُقلَب داكنًا** وإلّا لم يُقرأ: أكثرُ اللوح يجلس على الورق الفاتح لا على الصورة. فيعود اللوحُ ورقةً بضباب.",
  },
  {
    mode: "smoke", tag: "ج) زجاجٌ داكن",
    why: "مشتقٌّ من كحليّ الهوية بـ`color-mix` لا رمزٌ قائم. الحبرُ يبقى فاتحًا كما هو، والغلافُ يتنفّس من خلف اللوح حيث يركبه — وهذا أقربُ ما يكون إلى «زجاجٍ على الشُّرفة».",
  },
];

export function NewsLedgeLab({
  n, comments, more,
}: {
  n: PublicNews; comments: PublicComment[]; more: PublicNews[];
}) {
  const [w, setW] = useState("375");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">News, Ledge Surface</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">سطحُ الشُّرفة</h1>
        <p className="mt-2 max-w-2xl leading-8 text-content-muted">
          ثلاثُ صفحاتٍ كاملةٍ للخبر نفسِه، والمتغيّرُ سطحُ الشُّرفة وحدَه. وما عداه
          متطابقٌ حرفًا بحرف.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-content-muted">
          والتجربةُ وجهان لا وجه: رمزُ الزجاج في مكتبتنا أبيضُ شفّافٌ بـ١٦٪، وكلُّ
          استعمالاته فوق سطحٍ داكن. والشُّرفةُ تركب الغلافَ بطرفها وتجلس أكثرُها على
          الورق الفاتح، فالأبيضُ عليها يقع على فاتحٍ فيغيب ويلزم قلبُ الحبر. ولذلك
          عرضتُ معه زجاجًا داكنًا مشتقًّا من كحليّ الهوية.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>
      </Container>

      <div className="mx-auto w-full max-w-[1800px] px-6">
        <div className="artv-lab mt-10" style={{ ["--artv-w" as string]: w + "px" }}>
          {MODES.map((m) => (
            <div key={m.mode} className="artv-col">
              <div className={"artv-tag" + (m.live ? " live" : "")}>
                <span className="dot" aria-hidden />
                {m.tag}
              </div>
              <div className="artv-frame">
                <Page n={n} comments={comments} more={more} mode={m.mode} />
              </div>
              <p className="artv-why">{m.why}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
