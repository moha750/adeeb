"use client";

import Link from "next/link";
import { Clock, Feather, Newspaper, Star } from "@phosphor-icons/react";
/* glyph-weight: Star — نجمةُ «تغطية مميّزة» مصمتةٌ (fill) في حبّة الفئة كما نُشرت؛ ووزنُ الاستثناء (bold)
   يفرّغها خطًّا. فتبقى بوزنها حتى يقرّر المالك غيرَه. */
import { AR_READ_MIN, arCount } from "@/lib/arabicCount";
import { newsHref } from "@/lib/news/link";
import { bylineOf } from "@/lib/news/byline";
import { CATEGORY_META } from "../dashboard/news/vocab";
import type { PublicNews } from "./data";

/** الفئةُ حبّةٌ زجاجيّةٌ على الصورة بثوب نسبة المصوّر، والمميّزُ نجمةٌ فيها («تغطية مميّزة»). */
export function NewsCat({ n }: { n: PublicNews }) {
  return (
    <span className="ncard-cat">
      {n.featured ? <Star size={13} weight="fill" aria-hidden /> : null}
      {n.featured ? CATEGORY_META[n.category].featured : CATEGORY_META[n.category].label}
    </span>
  );
}

/* (كرتُ «الغلافِ الزجاجيّ» `NewsCard` صار `PubCard` في قالب «الفهرس» العامّ، ٢٠٢٦-١١-١٥) */

/**
 * **«ختمُ التاريخ»** — كرتُ «اقرأ أيضًا» (المالك ٢٠٢٦-١٠-١٤): ختمٌ كحليٌّ منقوشٌ يتدلّى
 * من الصورة إلى الورق كشُرفةٍ بحجم الكفّ، والعنوانُ بجانبه، ثمّ الموجز يُغري بالخبر التالي.
 */
export function SealCard({ n }: { n: PublicNews }) {
  const by = bylineOf(n.authors);
  const [day, month, year] = (n.dateLabel ?? "").split(" ");
  return (
    <Link href={newsHref(n)} className="acard acard-interactive scard">
      <span className="ncard-media">
        {n.cover ? <img src={n.cover} alt="" loading="lazy" /> : <span className="ncard-ph" aria-hidden><Newspaper size={34} /></span>}
        <NewsCat n={n} />
      </span>
      <span className="scard-body">
        <span className="scard-head">
          {day ? (
            <span className="scard-seal" aria-label={n.dateLabel}>
              <b>{day}</b>
              <small>{month}</small>
              <i>{year}</i>
            </span>
          ) : <span />}
          <b className="ncard-title">{n.title}</b>
        </span>
        {n.summary ? <span className="ncard-sum">{n.summary}</span> : null}
        <span className="scard-foot">
          {by ? <span className="scard-by" title={by}><Feather size={15} aria-hidden /><span>{by}</span></span> : <span />}
          <span className="scard-time"><Clock size={14} aria-hidden />{arCount(n.readMinutes, AR_READ_MIN)}</span>
        </span>
      </span>
    </Link>
  );
}
