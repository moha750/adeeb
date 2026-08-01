"use client";

import { Badge, Card, CardBody, CardFooter, CardHeader } from "@adeeb/design-system";
import { ArrowUpRight, Handshake } from "@phosphor-icons/react";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import type { SponsorRow } from "./data";

function linkLabel(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

type Props = {
  sponsor: SponsorRow;
  /** موضعه (1-based) — نظير عمود «الترتيب» في الجدول. */
  order: number;
  actions: MenuGroup[];
  /** فتح التحرير عند النقر على الكرت (كنقر صفّ الجدول)؛ ونقرُ النقاط لا يعنيه (stopPropagation). */
  onOpen: () => void;
};

/** كرت راعٍ — بطاقة الهوية (Card): الشعار محتوًى (object-contain لا غطاء يقصّه)، والوسم شارةٌ في الرأس. */
export function SponsorCard({ sponsor, order, actions, onOpen }: Props) {
  return (
    <Card interactive onClick={onOpen}>
      <CardHeader
        className="acard-header-clip"
        icon={<Handshake weight="duotone" aria-hidden />}
        title={sponsor.name}
        actions={
          <div className="flex items-center gap-2">
            {sponsor.badge ? <Badge tone="info" size="sm">{sponsor.badge}</Badge> : null}
            {actions.length > 0 ? (
              <span onClick={(e) => e.stopPropagation()}>
                <DropdownMenu groups={actions} />
              </span>
            ) : null}
          </div>
        }
      />
      <CardBody className="pt-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sponsor.logoUrl} alt={sponsor.name} loading="lazy" className="h-12 w-20 shrink-0 rounded bg-white/60 object-contain p-1 ring-1 ring-navy-950/5" />
          {sponsor.description ? <span className="text-sm text-content-muted line-clamp-2">{sponsor.description}</span> : null}
        </div>
      </CardBody>
      <CardFooter>
        {sponsor.linkUrl ? (
          <a href={sponsor.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-secondary" onClick={(e) => e.stopPropagation()}>
            {linkLabel(sponsor.linkUrl)}<ArrowUpRight aria-hidden />
          </a>
        ) : (
          <span className="text-sm text-content-muted">—</span>
        )}
        <span className="text-sm text-content-muted">الترتيب <b className="font-latin text-content">{order}</b></span>
      </CardFooter>
    </Card>
  );
}
