"use client";

import { useState } from "react";
import { countPhrase, type ChartUnit } from "@adeeb/design-system";
import { ArrowUpRight, CaretDown } from "@/app/_components/glyphs";
import type { PubPerson, PubStructure, PubUnit } from "./data";

/**
 * **هيكلةُ أدِيب** — الهيكلُ «المزيج» الذي اعتمده المالك (٢٠٢٦-١٠-١٣: «هذا ما نبحث عنه منذ البداية»):
 * رأسُ شجرةٍ نازلة (الرئيس ← الرئيس التنفيذيّ ← الإدارات ← الأقسام)، وكلُّ لجنةٍ وإدارةٍ قائدُها
 * وفريقُها في ذيلها يُطوى ويُفتح. والجوّالُ جذعٌ واحد.
 *
 * **والثوبُ «المخطوطة»** — أقلُّ الثلاثة سوءًا عنده، وملاحظاتُه عليه هي القانون هنا:
 * - **الوجهُ بارز**: بلا صناديق، بحلقتين رفيعتين، والاسمُ خطٌّ واضح.
 * - **النائبُ بجوار قائده** لا بين الأعضاء.
 * - **الانتقالُ بزرٍّ ظاهرٍ وحده**: دائرةٌ بسهمٍ على حافّة الوجه هي الرابط، والوجهُ والاسمُ لا ينقلان —
 *   «لو ضغط بالخطأ على شخصٍ لانصدم أنّ الصفحة حوّلته».
 * - **من لا صورة له** يأخذ هيئةَ جنسه (هيئةُ «أهل الدفّة» نفسُها) لا حرفًا.
 */

const MEMBER: ChartUnit = { one: "عضو", two: "عضوان", few: "أعضاء", many: "عضوًا" };
const VOLUNTEER: ChartUnit = { one: "متطوّع", two: "متطوّعان", few: "متطوّعين", many: "متطوّعًا" };
const FIG = { male: "/brand/avatar/avatar-male.svg", female: "/brand/avatar/avatar-female.svg" } as const;
const href = (p: PubPerson) => (p.slug ? `/m/${encodeURIComponent(p.slug)}` : undefined);
const initial = (name: string) => Array.from(name.trim().split(/\s+/)[0] ?? "")[0] ?? "";

/** الوجه، ومعه زرُّ صفحته إن كانت له. `go={false}` للوجوه المتراكبة في الحزمة. */
function Face({ p, size, go = true }: { p: PubPerson; size: number; go?: boolean }) {
  const h = go ? href(p) : undefined;
  const fig = !p.avatar && p.gender ? FIG[p.gender] : null;
  return (
    <span className="sx-fw" style={{ ["--s" as string]: `${size}px` }}>
      <span className={"sx-f" + (p.avatar ? "" : fig ? " is-fig" : " is-mono")} aria-hidden>
        {p.avatar ? <img src={p.avatar} alt="" loading="lazy" draggable={false} />
          : fig ? <i style={{ backgroundImage: `url(${fig})` }} />
          : <b>{initial(p.name)}</b>}
      </span>
      {h ? <a className="sx-go" href={h} aria-label={`صفحة ${p.name}`}><ArrowUpRight /></a> : null}
    </span>
  );
}

/** عقدةُ الرأس: الوجهُ فوق الاسم. بلا شاغلٍ تبقى اسمَ وحدتها. */
function Node({ p, unit, lead }: { p: PubPerson | null; unit?: string; lead?: boolean }) {
  if (!p) return <div className="sx-node is-empty"><span className="sx-nm">{unit}</span></div>;
  return (
    <div className={"sx-node" + (lead ? " is-lead" : "")}>
      <Face p={p} size={lead ? 108 : 80} />
      <span className="sx-tx">
        {unit ? <span className="sx-un">{unit}</span> : null}
        <span className="sx-nm">{p.name}</span>
        {p.title ? <span className="sx-rl">{p.title}</span> : null}
      </span>
    </div>
  );
}

/** الوحدة: قائدُها ونائبُه بجواره، وفريقُها في ذيلها يُطوى ويُفتح. */
function Unit({ u }: { u: PubUnit }) {
  const [open, setOpen] = useState(false);
  const team = u.members;
  const stack = [...team].sort((a, b) => Number(!!b.avatar) - Number(!!a.avatar)).slice(0, 5);
  return (
    <div className={"sx-unit" + (open ? " is-open" : "")}>
      <span className="sx-un sx-cap">{u.name}</span>
      {u.leader ? (
        <div className="sx-lead">
          <Face p={u.leader} size={76} />
          <span className="sx-nm">{u.leader.name}</span>
          {u.leader.title ? <span className="sx-rl">{u.leader.title}</span> : null}
        </div>
      ) : null}
      {u.deputy ? (
        <div className="sx-dep">
          <Face p={u.deputy} size={44} />
          <span className="sx-tx">
            <span className="sx-dn">{u.deputy.name}</span>
            <span className="sx-rl">{u.deputy.title ?? "نائب"}</span>
          </span>
        </div>
      ) : null}
      {team.length ? (
        <button type="button" className="sx-ft" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="sx-stk">{stack.map((p) => <Face key={p.id} p={p} size={30} go={false} />)}</span>
          <span className="sx-ct">{countPhrase(team.length, MEMBER)}<CaretDown className="sx-caret" /></span>
        </button>
      ) : null}
      {open ? (
        <div className="sx-grid">
          {team.map((p) => (
            <div key={p.id} className="sx-m">
              <Face p={p} size={52} />
              <span className="sx-mn">{p.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StructureMix({ s }: { s: PubStructure }) {
  const [pres] = s.administrative.seats;
  const ceo = s.executive.head;
  if (!pres) return null;
  const execUnit = ceo ? s.administrative.units.find((u) => u.leader?.id === ceo.id) ?? null : null;
  const dirs = s.administrative.units.filter((u) => u !== execUnit);
  const half = Math.ceil(dirs.length / 2);
  const row: (PubUnit | "exec")[] = [...dirs.slice(0, half), "exec", ...dirs.slice(half)];
  const depts = s.executive.departments;

  return (
    <div className="sx">
      <div className="sx-col">
        <Node p={pres} lead />
        {ceo ? <><div className="sx-v" /><Node p={ceo} lead /></> : null}
      </div>
      <div className="sx-fork" style={{ ["--n" as string]: row.length }}>
        {row.map((d) => d === "exec" ? (
          <div key="exec" className="sx-col sx-exec">
            <Node p={null} unit={execUnit?.name ?? "الإدارة التنفيذية"} />
            <div className="sx-v sx-grow" />
          </div>
        ) : (
          <div key={d.id} className="sx-col"><Unit u={d} /></div>
        ))}
      </div>
      <div className="sx-fork sx-depts" style={{ ["--n" as string]: depts.length }}>
        {depts.map((d) => (
          <div key={d.id} className="sx-col">
            <Node p={d.head} unit={d.name} />
            {d.units.map((u) => (
              <div key={u.id} className="sx-col sx-w">
                <div className="sx-v" />
                <Unit u={u} />
              </div>
            ))}
          </div>
        ))}
      </div>
      {s.counts.volunteers > 0 ? <p className="sx-coda">ومعهم {countPhrase(s.counts.volunteers, VOLUNTEER)}</p> : null}
    </div>
  );
}
