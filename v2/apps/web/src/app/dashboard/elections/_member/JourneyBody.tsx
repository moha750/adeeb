// جسمُ رحلة الترشّح — خطٌّ زمنيّ خالص (‏.jrn‏ من المكتبة): محطّاتٌ بتواريخها، وكلُّ مراجعةٍ
// تحمل ملاحظتَها. البيانُ والتحكّمُ في قسمهما المستقلّ، فالرحلةُ هنا سِجلٌّ يُقرأ لا يُتحكَّم فيه.
//
// **ولا اسمَ لفاعلٍ هنا** (قرار المالك ٢٠٢٦-٠٨-١٤): العضوُ يقرأ القرارَ وسببَه، ونسبةُ القرار
// إلى صاحبه تبقى في غرفة الإدارة. والرسمُ والنصُّ من المعجم الواحد (`log.ts` · `logIcons.tsx`).
"use client";

import { KIND_ICON } from "../logIcons";
import type { CandidacyJourney as CJ } from "../member-data";

export function JourneyBody({ c }: { c: CJ }) {
  const last = c.trail.length - 1;
  return (
    <ol className="jrn">
      {c.trail.map((ev, i) => {
        const isCur = i === last;
        return (
          <li key={i} className={`jrn-i ${isCur ? "jrn-cur" : "jrn-done"}`}>
            <div className="jrn-node">{KIND_ICON[ev.kind]}</div>
            <div className="jrn-c">
              <div className="jrn-head"><b className="jrn-t">{ev.label}</b>{ev.date ? <span className="jrn-d">{ev.date}</span> : null}</div>
              {ev.note ? <div className="jrn-body"><div className="jrn-note"><b>ملاحظة إدارة الموارد البشرية:</b> {ev.note}</div></div> : null}
            </div>
          </li>
        );
      })}

      {c.future ? (
        <li className="jrn-i jrn-future">
          <div className="jrn-node">{KIND_ICON.open}</div>
          <div className="jrn-c"><div className="jrn-head"><b className="jrn-t">{c.future}</b><span className="jrn-d">قادمٌ بعد هذه المرحلة</span></div></div>
        </li>
      ) : null}
    </ol>
  );
}
