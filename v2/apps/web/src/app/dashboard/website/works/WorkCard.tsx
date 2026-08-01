"use client";

import { Card, CardFooter, CardHeader, CardMedia } from "@adeeb/design-system";
import { ArrowUpRight } from "@phosphor-icons/react";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import type { WorkRow } from "./data";

/** يستخرج نطاق الرابط للعرض المختصر (بلا بروتوكول)، أو يعيد الرابط كما هو إن تعذّر. */
function linkLabel(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

type Props = {
  work: WorkRow;
  /** موضعه (1-based) — نظير عمود «الترتيب» في الجدول. */
  order: number;
  actions: MenuGroup[];
  /** فتح التحرير عند النقر على الكرت (كنقر صفّ الجدول)؛ ونقرُ النقاط لا يعنيه (stopPropagation). */
  onOpen: () => void;
};

/**
 * كرت عمل أفقيّ — بطاقة الهوية (Card) بتخطيط `.acard-horizontal`: شبكةُ عمودين (صورة 150px + محتوى)،
 * فلا يقبل إلّا ابنَين مباشرَين: الصورةَ ثمّ عمودًا واحدًا يجمع الرأس والتذييل (`min-w-0` كي يقصّ العنوانُ الطويل).
 * ولا أيقونةَ في الرأس: الصورةُ الجانبيّة تؤدّي دورها البصريّ، فقرصُها تكرار.
 */
export function WorkCard({ work, order, actions, onOpen }: Props) {
  return (
    <Card interactive horizontal onClick={onOpen}>
      <CardMedia image={work.imageUrl} alt={work.title} />
      <div className="flex min-w-0 flex-col">
        <CardHeader
          className="acard-header-clip"
          title={work.title}
          subtitle={work.category ?? undefined}
          actions={
            actions.length > 0 ? (
              <span onClick={(e) => e.stopPropagation()}>
                <DropdownMenu groups={actions} />
              </span>
            ) : null
          }
        />
        <CardFooter>
          {work.linkUrl ? (
            <a href={work.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-secondary" onClick={(e) => e.stopPropagation()}>
              {linkLabel(work.linkUrl)}<ArrowUpRight aria-hidden />
            </a>
          ) : (
            <span className="text-sm text-content-muted">عارض داخليّ</span>
          )}
          <span className="text-sm text-content-muted">الترتيب <b className="font-latin text-content">{order}</b></span>
        </CardFooter>
      </div>
    </Card>
  );
}
