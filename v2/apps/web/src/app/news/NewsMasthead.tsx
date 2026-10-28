"use client";

import { Newspaper, Star } from "@phosphor-icons/react";
/* glyph-weight: Star — نجمةُ «مميّزة» في عدّاد الترويسة تبقى على وزن الموقع كجارتها Newspaper كما نُشرت؛
   ودخولُها قائمةَ الاستثناء (bold) يغيّر رسمَها، وذاك قرارُ المالك لا حارسِ الاستيراد. */
import { Eye } from "@/app/_components/glyphs";
import { AR_NEWS, AR_VIEW, arCount } from "@/lib/arabicCount";

/**
 * **ترويسةُ صفحة الأخبار** — بلغة «الشُّرفة المقلوبة» التي أقرّها المالك لصدر الخبر:
 * لوحٌ كحليٌّ منقوش، وشبكةُ الأخبار تتدلّى منه كما يتدلّى الغلافُ في المقال.
 * وما يجعلها ترويسةَ نشرةٍ لا رأسَ صفحةٍ عامًّا: سطرُ التاريخ بين خطّين رفيعين
 * (اليومُ بالميلاديّ والهجريّ كالصحف)، وصفُّ أرقام النشرة بثوب «بريشة».
 * والتاريخُ تاريخُ اليوم بتوقيت النادي، والصفحةُ تُعاد كلّ دقيقة فلا يتقادم.
 */
export function NewsMasthead({
  dateLine,
  hijri,
  count,
  featured,
  views,
}: {
  dateLine: string;
  hijri: string;
  count: number;
  featured: number;
  views: number;
}) {
  return (
    <header className="news-mast-panel">
      <p className="news-mast-date">
        <span className="news-mast-date-t">
          <span>{dateLine}</span>
          <span>{hijri}</span>
        </span>
      </p>
      <h1 className="news-mast-title">آخر الأخبار</h1>
      <p className="news-mast-deck">مستجدّاتُ النادي أوّلًا{"\u00a0"}بأوّل من منصّته الإعلاميّة.</p>
      <ul className="news-mast-facts">
        <li>
          <Newspaper aria-hidden />
          {arCount(count, AR_NEWS)}
        </li>
        {featured ? (
          <li>
            <Star aria-hidden />
            {featured} مميّزة
          </li>
        ) : null}
        <li>
          <Eye aria-hidden />
          {arCount(views, AR_VIEW)}
        </li>
      </ul>
    </header>
  );
}
