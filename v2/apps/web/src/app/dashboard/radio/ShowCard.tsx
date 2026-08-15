"use client";

import { Badge, Card, CardBody, CardHeader } from "@adeeb/design-system";
import { MicrophoneStage, Playlist, User } from "@phosphor-icons/react";
import { Star } from "@/app/_components/glyphs";
import { DropdownMenu, type MenuGroup } from "../_components/DropdownMenu";
import type { ShowRow } from "./data";
import { SHOW_STATUS_META } from "./vocab";

type Props = {
  show: ShowRow;
  actions: MenuGroup[];
  /** فتح المحرّر عند النقر على الكرت (كنقر صفّ الجدول)؛ ونقرُ النقاط لا يعنيه (stopPropagation). */
  onOpen: () => void;
};

/**
 * كرت برنامج — يحمل ما يحمله صفُّ الجدول: الاسمُ ومعرّفُه وتمييزُه وحالتُه، ثمّ المقدّمُ
 * وعدّ الحلقات، وغيابُ الشعار شارةً (عمود «الشعار»). ولا CSS خاصّ — كلُّه من عائلة الكروت.
 *
 * **ولا صورةَ فيه، والشعارُ يُقال حالةً لا يُعرَض** (قِيست ثلاثةُ أشكالٍ عند 390px):
 * شعارُ البرنامج **مربّع**، فغطاءُ الكرت (176px عرضًا كاملًا) يقصّه شريطًا ويلتهم شاشةَ الجوّال،
 * والعمودُ الجانبيّ (`.acard-horizontal`، 150px) يأكل ٤٢٪ من عرض الكرت فيهبط العنوانُ ثلاثةَ
 * أسطر. والجدولُ لم يعرض الشعارَ أصلًا: قال «جاهز» أو «ناقص» — وهذا ما يعنيه المدير.
 */
export function ShowCard({ show, actions, onOpen }: Props) {
  const meta = SHOW_STATUS_META[show.status];
  return (
    <Card interactive onClick={onOpen}>
      <CardHeader
        icon={<MicrophoneStage aria-hidden />}
        title={
          <span className="inline-flex items-center gap-1.5">
            {show.title}
            {show.isFeatured ? <Star size={14} className="text-warning" aria-label="مميّز" /> : null}
          </span>
        }
        subtitle={<bdi dir="ltr" className="font-latin">/{show.slug}</bdi>}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={meta.tone} dot>{meta.label}</Badge>
            {actions.length > 0 ? (
              <span onClick={(e) => e.stopPropagation()}>
                <DropdownMenu groups={actions} />
              </span>
            ) : null}
          </div>
        }
      />
      <CardBody className="pt-3">
        <div className="flex flex-col items-start gap-2">
          <span className="inline-flex items-center gap-2 text-content-muted text-sm">
            <User aria-hidden />
            <span>{show.hostName}</span>
          </span>
          <span className="inline-flex items-center gap-2 text-content-muted text-sm">
            <Playlist aria-hidden />
            <span>
              الحلقات <b className="font-latin text-content">{show.episodeCount}</b>
              {show.publishedCount !== show.episodeCount ? (
                <> (<b className="font-latin text-content">{show.publishedCount}</b> منشورة)</>
              ) : null}
            </span>
          </span>
          {show.logoUrl ? null : <Badge tone="warning" variant="outline">الشعار ناقص</Badge>}
        </div>
      </CardBody>
    </Card>
  );
}
