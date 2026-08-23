"use client";

import { Badge, Card, CardBody, CardFooter, CardHeader } from "@adeeb/design-system";
import { IconDeebo } from "../../_shell/icons";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import type { FactRow } from "./data";

type Props = {
  fact: FactRow;
  /** موضعها (1-based) — نظير عمود الترتيب في الجدول. */
  order: number;
  actions: MenuGroup[];
  /** فتح التحرير عند النقر على الكرت (كنقر صفّ الجدول)؛ ونقرُ النقاط لا يعنيه (stopPropagation). */
  onOpen: () => void;
};

/** كرت واقعة — العنوان رأسٌ يلتفّ (هو المحتوى)، والنصّ جسمٌ باهت، والحالةُ في الذيل. */
export function FactCard({ fact, order, actions, onOpen }: Props) {
  return (
    <Card interactive onClick={onOpen}>
      <CardHeader
        icon={<IconDeebo aria-hidden />}
        title={fact.title}
        actions={
          actions.length > 0 ? (
            <span onClick={(e) => e.stopPropagation()}>
              <DropdownMenu groups={actions} />
            </span>
          ) : null
        }
      />
      <CardBody className="pt-3">
        <p className="text-sm leading-relaxed text-content-muted line-clamp-3">{fact.body}</p>
      </CardBody>
      <CardFooter>
        <span className="text-sm text-content-muted">
          الترتيب <b className="font-latin text-content">{order}</b>
        </span>
        {fact.isActive ? (
          <Badge tone="success" dot>يقولها</Badge>
        ) : (
          <Badge tone="neutral" dot>موقوفة</Badge>
        )}
      </CardFooter>
    </Card>
  );
}
