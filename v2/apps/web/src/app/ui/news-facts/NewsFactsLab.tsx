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

/** أ) الحيُّ اليوم (أربعُ حقائقَ في الصدر) · ب) التوصية. */
type Mode = "now" | "split";

/** الشارات تبقى كما هي اليوم في الثلاثة — المتغيّرُ سطحُ اللوح لا هي. */
function Kicker({ n }: { n: PublicNews }) {
  return (
    <div className="art-kicker">
      <Badge tone="neutral" variant="soft">{CATEGORY_META[n.category].label}</Badge>
      {n.featured ? <Badge tone="warning" variant="soft" dot>مميّز</Badge> : null}
    </div>
  );
}

function Meta({ n, mode }: { n: PublicNews; mode: Mode }) {
  const byline = bylineOf(n.authors);
  return (
    <div className="art-meta">
      {n.dateLabel ? <span className="art-meta-i"><CalendarBlank size={16} aria-hidden />{n.dateLabel}</span> : null}
      {byline ? <span className="art-meta-i"><Feather size={16} aria-hidden />{byline}</span> : null}
      {/* في التوصية تخرج هاتان من الصدر: القراءةُ إلى الشريط، والعدسةُ إلى الصورة. */}
      {mode === "now" ? (
        <span className="art-meta-i"><Clock size={16} aria-hidden />{arCount(n.readMinutes, AR_MIN)}</span>
      ) : null}
      {mode === "now" && n.coverPhotographer ? (
        <span className="art-meta-i"><Camera size={16} aria-hidden />عدسة {n.coverPhotographer}</span>
      ) : null}
    </div>
  );
}

function Bar({ n, comments, mode }: { n: PublicNews; comments: number; mode: Mode }) {
  return (
    <div className="art-bar">
      {mode === "split" ? (
        <>
          <span className="art-bar-note"><Clock size={15} aria-hidden />{arCount(n.readMinutes, AR_MIN)}</span>
          <span className="art-bar-sp" aria-hidden />
        </>
      ) : null}
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
          <div className="art-bandwrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={n.cover} alt={n.title} className="art-band" />
            {mode === "split" && n.coverPhotographer ? (
              <span className="art-band-credit">
                <Camera size={13} aria-hidden /><span>عدسة {n.coverPhotographer}</span>
              </span>
            ) : null}
          </div>
        ) : null}
        <div className={n.cover ? "art-ledge" : "art-ledge art-ledge-bare"}>
          <Kicker n={n} />
          <h1 className="art-title">{n.title}</h1>
          {n.summary ? <p className="art-lede">{n.summary}</p> : null}
          <Meta n={n} mode={mode} />
        </div>
      </header>

      <div className="art-wide mt-8">
        <div className="art-col">
          <Bar n={n} comments={comments.length} mode={mode} />
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

        <div className="art-col mt-10"><Bar n={n} comments={comments.length} mode={mode} /></div>

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
    mode: "now", tag: "أ) الحيُّ اليوم", live: true,
    why: "أربعُ حقائقَ في الصدر: تاريخٌ وريشةٌ وقراءةٌ وعدسة. وهي أربعةُ أشياءَ لا تنتمي إلى بعضها، فيبدو أيُّ ترتيبٍ لها اعتباطيًّا.",
  },
  {
    mode: "split", tag: "ب) التوصية: كلٌّ إلى أهله",
    why: "العدسةُ نزلت على الصورة (نسبةُ الغلاف لا نسبةُ الخبر)، ومدّةُ القراءة نزلت إلى شريط الأفعال (أداةُ قارئٍ لا حقيقةَ خبر). فبقي في الصدر اثنان دائمًا: التاريخُ والريشة.",
  },
];

export function NewsFactsLab({
  n, comments, more,
}: {
  n: PublicNews; comments: PublicComment[]; more: PublicNews[];
}) {
  const [w, setW] = useState("375");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">News, Facts</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">أين تسكن حقائقُ الخبر</h1>
        <p className="mt-2 max-w-2xl leading-8 text-content-muted">
          صفحتان كاملتان للخبر نفسِه. والعلّةُ ليست تخطيطًا بل تصنيفًا: صفُّ الصدر يجمع
          أربعةَ أشياءَ لا تنتمي إلى بعضها، فأيُّ ترتيبٍ لها يبدو اعتباطيًّا لأنّه
          اعتباطيٌّ فعلًا.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-content-muted">
          والتوصيةُ تردّ كلَّ شيءٍ إلى أهله: العدسةُ نسبةُ الصورة فتنزل على الصورة،
          ومدّةُ القراءة أداةُ قارئٍ فتنزل حيث يقرّر أن يقرأ. فيبقى في الصدر التاريخُ
          والريشةُ وحدَهما — اثنان دائمًا، فيسقط سؤالُ العدد الفرد و٢×٢ واليتيمِ في
          السطر الثاني.
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
