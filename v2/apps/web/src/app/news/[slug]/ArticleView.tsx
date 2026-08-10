"use client";

import { Badge, Card, CardBody, CardFooter, CardMedia } from "@adeeb/design-system";
import { CalendarBlank, Camera, Clock, Heart, User } from "@phosphor-icons/react";
import { Eye } from "@/app/_components/glyphs";
import { CATEGORY_META } from "../../dashboard/news/vocab";
import type { PublicNews } from "../data";

/**
 * متن الخبر نصٌّ عاديّ لا وسمٌ: فقراتٌ تفصلها أسطرٌ فارغة، وبنودٌ تبدأ بـ«•».
 * فنقسمه على الفراغ، ونجمع البنود في قائمةٍ دلاليّة بدل أن نطبعها سطورًا.
 */
function Body({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const bullets = lines.filter((l) => l.startsWith("•"));
        const prose = lines.filter((l) => !l.startsWith("•"));
        return (
          <div key={bi} className="flex flex-col gap-3">
            {prose.map((p, pi) => (
              <p key={pi} className="text-base leading-loose text-content">{p}</p>
            ))}
            {bullets.length ? (
              <ul className="flex list-inside list-disc flex-col gap-2">
                {bullets.map((b, li) => (
                  <li key={li} className="text-base leading-loose text-content">{b.replace(/^•\s*/, "")}</li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** المقال العامّ — رأسٌ ثمّ غلافٌ ثمّ متنٌ ثمّ معرض صورٍ ووسوم. */
export function ArticleView({ n }: { n: PublicNews }) {
  return (
    <article>
      <header className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" variant="soft">{CATEGORY_META[n.category].label}</Badge>
          {n.featured ? <Badge tone="warning" variant="soft" dot>مميّز</Badge> : null}
        </div>
        <h1 className="mt-4 font-display text-3xl font-black leading-tight text-content md:text-4xl">{n.title}</h1>
        {n.summary ? <p className="mt-4 text-lg leading-relaxed text-content-muted">{n.summary}</p> : null}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-content-muted">
          {n.dateLabel ? (
            <span className="inline-flex items-center gap-1.5"><CalendarBlank aria-hidden />{n.dateLabel}</span>
          ) : null}
          {n.authors.length ? (
            <span className="inline-flex items-center gap-1.5"><User aria-hidden />{n.authors.join("، ")}</span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden /><span className="font-latin">{n.readMinutes}</span> دقائق قراءة
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye aria-hidden /><span className="font-latin">{n.views}</span> مشاهدة
          </span>
          {n.likes ? (
            <span className="inline-flex items-center gap-1.5">
              <Heart aria-hidden /><span className="font-latin">{n.likes}</span> إعجاب
            </span>
          ) : null}
        </div>
      </header>

      {n.cover ? (
        <div className="mx-auto mt-8 max-w-4xl">
          <Card>
            <CardMedia image={n.cover} alt={n.title} className="h-[240px] md:h-[420px]" />
            {n.coverPhotographer ? (
              <CardFooter>
                <span className="inline-flex items-center gap-1.5 text-sm text-content-muted">
                  <Camera aria-hidden />عدسة {n.coverPhotographer}
                </span>
              </CardFooter>
            ) : null}
          </Card>
        </div>
      ) : null}

      {n.content ? (
        <div className="mx-auto mt-10 max-w-3xl">
          <Body content={n.content} />
        </div>
      ) : null}

      {n.gallery.length ? (
        <section className="mx-auto mt-12 max-w-4xl">
          <h2 className="mb-6 font-display text-2xl font-black text-content">معرض الصور</h2>
          <div className="card-grid">
            {n.gallery.map((src, i) => (
              <Card key={src}>
                <CardMedia image={src} alt={`${n.title}، صورة ${i + 1}`} />
                {n.galleryPhotographers[i] ? (
                  <CardBody className="pt-3">
                    <span className="inline-flex items-center gap-1.5 text-sm text-content-muted">
                      <Camera aria-hidden />عدسة {n.galleryPhotographers[i]}
                    </span>
                  </CardBody>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {n.tags.length ? (
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center gap-2">
          {n.tags.map((t) => (
            <Badge key={t} tone="neutral" variant="soft">{t}</Badge>
          ))}
        </div>
      ) : null}
    </article>
  );
}
