"use client";

import Link from "next/link";
import { CalendarBlank, Clock, Feather, Newspaper, Star } from "@phosphor-icons/react";
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

/**
 * **كرتُ الخبر في صفحة الأخبار: «الغلافُ الزجاجيّ»** (المالك ٢٠٢٦-١٠-١٤).
 * الصورةُ هي الكرت، والكلامُ على لوحٍ كحليٍّ زجاجيٍّ منقوشٍ في قاعها: التاريخُ ومدّةُ
 * القراءة، ثمّ العنوانُ بخطّ العناوين، ثمّ «بريشة». والموجزُ لا يُعرض هنا عمدًا: صفحةُ
 * تصفّحٍ يختار فيها القارئُ بعينه. (رُدّ قبله كرتُ الهويّة العامّ، ثمّ كرتٌ «كلاسيكيّ».)
 * وأختُه «ختمُ التاريخ» (`SealCard`) في «اقرأ أيضًا» آخرَ الخبر.
 */
export function NewsCard({ n, lead = false }: { n: PublicNews; lead?: boolean }) {
  const by = bylineOf(n.authors);
  return (
    <Link href={newsHref(n)} className="gcard">
      {/* **غلافُ الكرت الأوّل لا يُؤجَّل** (٢٠٢٦-١٠-٢٧): هو أكبرُ ما في الشاشة الأولى على الجوّال،
          وكان `lazy` فلا يُطلب حتى يُحسب التخطيط (~4.9ث انتظارٌ على 4G). فيُطلب فورًا وبأولويّةٍ عالية. */}
      {n.cover ? (
        <img src={n.cover} alt="" loading={lead ? "eager" : "lazy"} fetchPriority={lead ? "high" : undefined} />
      ) : <span className="gcard-ph" aria-hidden><Newspaper size={40} /></span>}
      <NewsCat n={n} />
      <span className="gcard-panel">
        <span className="gcard-facts">
          {n.dateLabel ? <span><CalendarBlank size={13} aria-hidden />{n.dateLabel}</span> : null}
          <span><Clock size={13} aria-hidden />{arCount(n.readMinutes, AR_READ_MIN)}</span>
        </span>
        <b className="gcard-title">{n.title}</b>
        {by ? <span className="gcard-by" title={by}><Feather size={14} aria-hidden /><span>{by}</span></span> : null}
      </span>
    </Link>
  );
}

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
