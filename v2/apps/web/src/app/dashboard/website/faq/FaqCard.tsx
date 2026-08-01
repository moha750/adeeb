"use client";

import { Card, CardBody, CardFooter, CardHeader } from "@adeeb/design-system";
import { Question } from "@phosphor-icons/react";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import type { FaqRow } from "./data";

type Props = {
  faq: FaqRow;
  /** موضعه (1-based) — نظير عمود «الترتيب» في الجدول. */
  order: number;
  actions: MenuGroup[];
  /** فتح التحرير عند النقر على الكرت (كنقر صفّ الجدول)؛ ونقرُ النقاط لا يعنيه (stopPropagation). */
  onOpen: () => void;
};

/** كرت سؤال — بطاقة الهوية (Card): السؤال رأسٌ يلتفّ (هو المحتوى، فلا `acard-header-clip`)، والإجابة جسمٌ باهت. */
export function FaqCard({ faq, order, actions, onOpen }: Props) {
  return (
    <Card interactive onClick={onOpen}>
      <CardHeader
        icon={<Question weight="duotone" aria-hidden />}
        title={faq.question}
        actions={
          actions.length > 0 ? (
            <span onClick={(e) => e.stopPropagation()}>
              <DropdownMenu groups={actions} />
            </span>
          ) : null
        }
      />
      <CardBody className="pt-3">
        <p className="text-sm leading-relaxed text-content-muted line-clamp-3">{faq.answer}</p>
      </CardBody>
      <CardFooter>
        <span className="text-sm text-content-muted">الترتيب <b className="font-latin text-content">{order}</b></span>
      </CardFooter>
    </Card>
  );
}
