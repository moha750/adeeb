"use client";

import { Card, CardBody, CardFooter, CardHeader } from "@adeeb/design-system";
import { DropdownMenu, type MenuGroup } from "../../_components/DropdownMenu";
import { StatIcon } from "@/app/_components/statIcons";
import { formatThousands as fmt } from "@/app/_components/format";
import type { AchievementRow } from "./data";

type Props = {
  item: AchievementRow;
  /** موضعه (1-based) — نظير عمود «الترتيب» في الجدول. */
  order: number;
  actions: MenuGroup[];
  /** فتح التحرير عند النقر على الكرت (كنقر صفّ الجدول)؛ ونقرُ النقاط لا يعنيه (stopPropagation). */
  onOpen: () => void;
};

/** كرت إحصائيّة — بطاقة الهوية (Card): أيقونتها في قرص الرأس، ورقمها بطلَ الجسم. */
export function AchievementCard({ item, order, actions, onOpen }: Props) {
  return (
    <Card interactive onClick={onOpen}>
      <CardHeader
        className="acard-header-clip"
        icon={<StatIcon name={item.icon} />}
        title={item.label}
        actions={
          actions.length > 0 ? (
            <span onClick={(e) => e.stopPropagation()}>
              <DropdownMenu groups={actions} />
            </span>
          ) : null
        }
      />
      <CardBody className="pt-3">
        <span className="font-latin text-3xl font-extrabold text-content">{fmt(item.count)}{item.plus ? "+" : ""}</span>
      </CardBody>
      <CardFooter>
        <span className="text-sm text-content-muted">الترتيب <b className="font-latin text-content">{order}</b></span>
      </CardFooter>
    </Card>
  );
}
