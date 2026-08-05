"use client";

// عميليّ لأيقونات Phosphor وحدها (`createContext` ممنوعٌ في الخادميّ) — لا حالةَ فيه ولا حدث.

import { Badge } from "@adeeb/design-system";
import { Flag } from "@phosphor-icons/react";
import { Star } from "@/app/_components/glyphs";
import type { JourneyStop } from "./data";

/**
 * **مسيرة العضويّة** — خطٌّ زمنيّ رأسيّ: نقطةٌ لكلّ محطّة، وخيطٌ يصل النقطة بالتي بعدها
 * (فلا خيط تحت الأخيرة). المحطّة الأولى انضمامٌ برايةٍ، وما بعدها تعييناتٌ بنجمة، والقائم منها
 * الآن يلبس شارة «حاليّ» ونقطته منغّمة بالنجاح.
 *
 * `<ol>` لا `<div>`: المسيرة تسلسلٌ مرتَّب، فقارئ الشاشة يقول «١ من ٤» ويقرؤها رحلةً لا كومة.
 * الخيط والنقاط من أنماط `.mjr-*` بالمكتبة — لا تنسيقَ شاردًا.
 */
export function Journey({ stops }: { stops: readonly JourneyStop[] }) {
  return (
    <ol className="mjr">
      {stops.map((s) => (
        <li key={s.key} className={"mjr-i" + (s.current ? " on" : "")}>
          <span className="mjr-dot">{s.kind === "join" ? <Flag aria-hidden /> : <Star aria-hidden />}</span>
          <div className="mjr-c">
            <div className="mjr-h">
              <b className="mjr-t">{s.title}</b>
              {s.current ? <Badge tone="success" variant="soft" size="sm" dot>حاليّ</Badge> : null}
            </div>
            {s.scope ? <span className="mjr-s">{s.scope}</span> : null}
            <span className="mjr-d">{s.date}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
