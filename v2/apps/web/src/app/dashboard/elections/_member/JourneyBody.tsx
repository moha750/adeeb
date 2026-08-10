// جسمُ رحلة الترشّح — خطٌّ زمنيّ خالص (‏.jrn‏ من المكتبة): محطّاتٌ بتواريخها، وكلُّ مراجعةٍ
// تحمل ملاحظتَها. البيانُ والتحكّمُ في قسمهما المستقلّ، فالرحلةُ هنا سِجلٌّ يُقرأ لا يُتحكَّم فيه.
"use client";

import type { ReactNode } from "react";
import { CheckCircle, FlagCheckered, PaperPlaneTilt, PencilSimple, Prohibit, Scales, Trophy, XCircle } from "@phosphor-icons/react";
import type { CandidacyJourney as CJ, TrailKind } from "../member-data";

const ICON: Record<TrailKind, ReactNode> = {
  submit: <PaperPlaneTilt aria-hidden />, edit: <PencilSimple aria-hidden />, approve: <CheckCircle aria-hidden />,
  reject: <XCircle aria-hidden />, withdraw: <Prohibit aria-hidden />, open: <Scales aria-hidden />,
  win: <Trophy aria-hidden />, end: <FlagCheckered aria-hidden />,
};

export function JourneyBody({ c }: { c: CJ }) {
  const last = c.trail.length - 1;
  return (
    <ol className="jrn">
      {c.trail.map((ev, i) => {
        const isCur = i === last;
        return (
          <li key={i} className={`jrn-i ${isCur ? "jrn-cur" : "jrn-done"}`}>
            <div className="jrn-node">{ICON[ev.kind]}</div>
            <div className="jrn-c">
              <div className="jrn-head"><b className="jrn-t">{ev.label}</b>{ev.date ? <span className="jrn-d">{ev.date}</span> : null}</div>
              {ev.note ? <div className="jrn-body"><div className="jrn-note"><b>ملاحظة إدارة الموارد البشرية:</b> {ev.note}</div></div> : null}
            </div>
          </li>
        );
      })}

      {c.future ? (
        <li className="jrn-i jrn-future">
          <div className="jrn-node"><Scales aria-hidden /></div>
          <div className="jrn-c"><div className="jrn-head"><b className="jrn-t">{c.future}</b><span className="jrn-d">قادمٌ بعد هذه المرحلة</span></div></div>
        </li>
      ) : null}
    </ol>
  );
}
