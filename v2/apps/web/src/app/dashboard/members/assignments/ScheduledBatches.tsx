"use client";

import { Button, Card, CardHeader } from "@adeeb/design-system";
import { CalendarCheck } from "@phosphor-icons/react";
import { ArrowLeft, X } from "@/app/_components/glyphs";
import { fmtDateOnly } from "@/lib/dates";
import { Avatar } from "../../_components/Avatar";
import type { ScheduledBatch } from "./batches";

/**
 * **تغييراتٌ مجدولة** فوق لوحة المقاعد (٢٠٢٦-١٠-٢٣): كلُّ دفعةٍ بيومها ونقلاتها وسببها، وزرُّ إلغائها لمنشئها
 * والرئيسين. اللوحةُ تعرض الهيكلَ كما هو اليوم، وهذا ما سيصيره في يومه.
 */
export function ScheduledBatches({ batches, busy, onCancel }: { batches: ScheduledBatch[]; busy: boolean; onCancel: (b: ScheduledBatch) => void }) {
  if (batches.length === 0) return null;
  return (
    <Card className="pbat">
      <CardHeader variant="soft" icon={<CalendarCheck />} title="تغييرات مجدولة"
        subtitle={batches.length === 1 ? "دفعةٌ واحدة تنتظر يومها" : `${batches.length} دفعات تنتظر أيامها`} />
      <div className="pbat-list">
        {batches.map((b) => (
          <div key={b.id} className="pbat-item">
            <div className="pbat-head">
              <span className="pbat-date"><CalendarCheck aria-hidden />{`يسري في ${fmtDateOnly(b.effectiveOn)}`}</span>
              {b.canCancel ? (
                <Button variant="ghost-danger" size="sm" onClick={() => onCancel(b)} disabled={busy}><X />إلغاء</Button>
              ) : null}
            </div>
            <div className="pbat-moves">
              {b.moves.map((m) => (
                <div key={`${b.id}-${m.userId}`} className="pbat-move">
                  <Avatar name={m.name} src={m.avatar ?? undefined} gender={m.gender} size="xs" />
                  <span className="pbat-name">{m.name}</span>
                  <ArrowLeft aria-hidden="true" />
                  <b className="pbat-to">{m.to}</b>
                </div>
              ))}
            </div>
            {b.reason || b.creatorName ? (
              <p className="pbat-meta">{[b.reason, b.creatorName ? `أنشأها ${b.creatorName}` : null].filter(Boolean).join("، ")}</p>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
