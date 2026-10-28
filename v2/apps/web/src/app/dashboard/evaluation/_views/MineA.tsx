"use client";

/**
 * **نتيجتي، المقترح أ: «ميزان»** — نصفُ دائرةٍ مقسومةٌ عند 40%: ما دونها منطقةُ الاستبعاد، وعليها مؤشّرٌ عند
 * النتيجة والرقمُ تحته كبيرًا، ثمّ الحكمُ جملةً. وتحتها الشقّان بوزنيهما، ثمّ ما قاله الأعضاء عمودين: ما
 * يستمرّ عليه وما يحتاج إلى تغيير، بلا أسماء (م١٠/2). والدوراتُ السابقة سطورٌ في الذيل.
 */
import { useState } from "react";
import { Quotes } from "@phosphor-icons/react";
import { PageHeader } from "../../_components/PageHeader";
import type { MyResultRow } from "../data";
import { BRANCH_LABEL, PART_WEIGHT, VERDICT_LABEL, partName, type Verdict } from "../vocab";
import { Of, Pct, cycleName, cycleShort, frac, pctNumber, seatLine } from "./parts";

export type MineProps = {
  results: MyResultRow[];
  /** إجاباتُ السؤال المفتوح لكلّ دورة (بمعرّف المقيَّم فيها)، بلا أسماء وبترتيبٍ عشوائيّ (م١٠/2). */
  comments: Record<number, { keep_text: string | null; change_text: string | null }[]>;
  gender: "male" | "female" | null;
};

/** الحكمُ جملةً بجنس صاحبه. */
export function verdictSentence(v: Verdict, g: "male" | "female" | null): string {
  const f = g === "female";
  if (v === "kept") return f ? "باقيةٌ في منصبكِ" : "باقٍ في منصبك";
  if (v === "removed") return f ? "استُبعدتِ من المنصب" : "استُبعدتَ من المنصب";
  return "لا نتيجة في هذه الدورة";
}

/** نقطةٌ على نصف الدائرة عند نسبة (0 يمينًا، 100 يسارًا: كاتّجاه القراءة). */
function arcPoint(pct: number, r: number): [number, number] {
  const a = Math.PI * (pct / 100); // 0 ← π
  return [60 + r * Math.cos(a), 60 - r * Math.sin(a)];
}
function arc(from: number, to: number, r: number): string {
  const [x1, y1] = arcPoint(from, r);
  const [x2, y2] = arcPoint(to, r);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`;
}

export function MineA({ results, comments, gender }: MineProps) {
  const [sel, setSel] = useState(results[0]?.target_id);
  const r = results.find((x) => x.target_id === sel) ?? results[0];
  if (!r) return null;
  const f = frac(r.final_num, r.final_den);
  const v = pctNumber(f);
  const [nx, ny] = arcPoint(v, 46);
  const said = comments[r.target_id] ?? [];
  const keep = said.map((c) => c.keep_text).filter(Boolean) as string[];
  const change = said.map((c) => c.change_text).filter(Boolean) as string[];

  return (
    <>
      <PageHeader title="نتيجتي" crumb={[{ kind: "leaf", label: "تقييم القيادات" }]} />

      <section className={"evg" + (r.verdict === "removed" ? " is-out" : "")}>
        <div className="evg-dial">
          <svg viewBox="0 0 120 66" aria-hidden>
            <path className="evg-zone-out" d={arc(0, 40, 46)} />
            <path className="evg-zone-in" d={arc(40, 100, 46)} />
            {f ? <path className="evg-val" d={arc(0, Math.max(0.5, v), 46)} /> : null}
            {f ? <circle className="evg-dot" cx={nx} cy={ny} r="4.2" /> : null}
            <line className="evg-cut" {...lineAt(40)} />
          </svg>
          <div className="evg-read">
            <Pct f={f} className="evg-n" />
            <b className="evg-v">{verdictSentence(r.verdict, gender)}</b>
          </div>
          <span className="evg-cut-l font-latin" dir="ltr">40%</span>
        </div>
        <div className="evg-tx">
          <p className="evg-k">{cycleName(r.due_on)}</p>
          <h2>{seatLine(r.role_name, r.unit_name, gender)}</h2>
          {r.branch ? <p className="evg-b">{BRANCH_LABEL[r.branch]}</p> : null}
        </div>
      </section>

      <div className="evg-parts">
        {(["members", "council"] as const).map((p) => {
          const pf = p === "members" ? frac(r.members_num, r.members_den) : frac(r.council_num, r.council_den);
          const n = (p === "members" ? r.members_ballots : r.council_ballots) ?? 0;
          return (
            <div key={p} className="evg-part">
              <span className="evg-part-k">{partName(p, r.role_name)}<span className="font-latin" dir="ltr">{PART_WEIGHT[p]}%</span></span>
              {pf ? <Pct f={pf} className="evg-part-n" /> : <span className="evg-part-hid">{hiddenWhy(p, n, r)}</span>}
              {p === "members" && r.members_eligible ? <span className="evg-part-of">شارك <Of n={n} of={r.members_eligible} /></span> : null}
              <span className="evg-part-bar" aria-hidden><span style={{ inlineSize: `${pctNumber(pf)}%` }} /></span>
            </div>
          );
        })}
      </div>

      {keep.length || change.length ? (
        <section className="evg-voices">
          <h2 className="evg-h">ما قاله أعضاؤك</h2>
          <div className="evg-cols">
            {[{ k: "keep", t: "استمرّ على", list: keep }, { k: "change", t: "يحتاج إلى تغيير", list: change }].map((c) => (
              <div key={c.k} className={`evg-col is-${c.k}`}>
                <div className="evg-col-h">{c.t}<span className="font-latin">{c.list.length}</span></div>
                {c.list.map((q, i) => (
                  <blockquote key={i} className="evg-q"><Quotes aria-hidden />{q}</blockquote>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {results.length > 1 ? (
        <section className="evg-hist">
          <h2 className="evg-h">الدورات</h2>
          {results.map((x) => (
            <button key={x.target_id} type="button" className={"evg-hrow" + (x.target_id === r.target_id ? " on" : "")} onClick={() => setSel(x.target_id)}>
              <b>{cycleShort(x.due_on)}</b>
              <span>{VERDICT_LABEL[x.verdict]}</span>
              <Pct f={frac(x.final_num, x.final_den)} className="evg-hrow-n" />
            </button>
          ))}
        </section>
      ) : null}
    </>
  );
}

/** لماذا لا يُعرض الشقّ: لم يشارك أحد، أو سقط نصابُ الأعضاء (م٥/1)، أو أوراقُه دون ثلاث (المسألة ٣). */
export function hiddenWhy(p: "members" | "council", n: number, r: MyResultRow): string {
  if (n === 0) return "لم يشارك أحد";
  if (p === "members" && (r.branch === "council_only" || r.branch === "none")) return "لم يشارك نصفُهم";
  return "لا تُعرض لأنّ أوراقها أقلّ من ثلاث";
}

/** شَرطةُ الحدّ عموديّةٌ على القوس عند النسبة */
function lineAt(pct: number) {
  const [x1, y1] = arcPoint(pct, 38);
  const [x2, y2] = arcPoint(pct, 54);
  return { x1, y1, x2, y2 };
}
