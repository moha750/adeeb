"use client";

import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, CardMedia } from "@adeeb/design-system";
import { Newspaper, Eye, Clock } from "@phosphor-icons/react";
import { newsHref } from "@/lib/news/link";
import { CATEGORY_META } from "../dashboard/news/vocab";
import type { PublicNews } from "./data";

/** كرت خبرٍ عامّ — بطاقة الهوية ملفوفةً برابطٍ إلى المقال. */
export function PublicNewsCard({ n }: { n: PublicNews }) {
  return (
    <Link href={newsHref(n)} className="block">
      <Card interactive>
        {n.cover ? <CardMedia image={n.cover} alt={n.title} /> : null}
        <CardHeader
          className="acard-header-clip"
          icon={<Newspaper weight="duotone" aria-hidden />}
          title={n.title}
          subtitle={n.authors.length ? `${n.dateLabel} · ${n.authors[0]}` : n.dateLabel}
        />
        <CardBody className="pt-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral" variant="soft">{CATEGORY_META[n.category].label}</Badge>
              {n.featured ? <Badge tone="warning" variant="soft" dot>مميّز</Badge> : null}
            </div>
            {n.summary ? (
              <p className="line-clamp-3 text-sm leading-relaxed text-content-muted">{n.summary}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 text-sm text-content-muted">
              <span className="inline-flex items-center gap-1.5">
                <Clock weight="duotone" aria-hidden />
                <span className="font-latin">{n.readMinutes}</span> دقائق قراءة
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye weight="duotone" aria-hidden />
                <span className="font-latin">{n.views}</span> مشاهدة
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
