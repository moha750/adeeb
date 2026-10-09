"use client";

import { Fragment, useState } from "react";
import { Segmented, countPhrase, type ChartUnit } from "@adeeb/design-system";
import { Columns, TextAlignRight } from "@phosphor-icons/react";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import type { PubDepartment, PubPerson, PubStructure, PubUnit } from "./data";

/**
 * **٢ · الخطّ العموديّ** — النسخةُ الثانية (٢٠٢٦-١٠-٠٩)، معادةٌ للموازنة: وجوهُ المجلس الإداريّ
 * كبيرة، ثمّ خطٌّ ينزل بالأقسام واللجان، والأعضاءُ أسماءٌ بلا صور (أعمدةٌ أو سطرٌ متّصل).
 * رُدّت يومها: «أجمل من السابق ولكن لا زال غير جميل».
 */
type Names = "cols" | "flow";

const NAMES = [
  { value: "cols", label: <span className="seg-lbl"><Columns /> الأعمدة</span> },
  { value: "flow", label: <span className="seg-lbl"><TextAlignRight /> السطر المتّصل</span> },
];

const MEMBER: ChartUnit = { one: "عضو", two: "عضوان", few: "أعضاء", many: "عضوًا" };
const href = (p: PubPerson) => (p.slug ? `/m/${encodeURIComponent(p.slug)}` : undefined);

function To({ p, className, children }: { p: PubPerson; className: string; children: React.ReactNode }) {
  const h = href(p);
  return h ? <a className={className} href={h}>{children}</a> : <div className={className}>{children}</div>;
}

function Face({ p }: { p: PubPerson }) {
  return (
    <To p={p} className="hk-face">
      <Avatar name={p.name} src={p.avatar ?? undefined} gender={p.gender} size="2xl" />
      <span className="hk-face-nm">{p.name}</span>
      {p.title ? <span className="hk-face-rl">{p.title}</span> : null}
    </To>
  );
}

function Who({ p, size = "sm" }: { p: PubPerson; size?: "sm" | "md" }) {
  return (
    <To p={p} className="hk-who">
      <Avatar name={p.name} src={p.avatar ?? undefined} gender={p.gender} size={size} />
      <span className="hk-who-tx"><b>{p.name}</b>{p.title ? <span>{p.title}</span> : null}</span>
    </To>
  );
}

function Name({ p }: { p: PubPerson }) {
  const h = href(p);
  return h ? <a href={h}>{p.name}</a> : <>{p.name}</>;
}

function NameList({ people, names }: { people: PubPerson[]; names: Names }) {
  if (people.length === 0) return null;
  if (names === "cols") return <ul className="hk-names-cols">{people.map((p) => <li key={p.id}><Name p={p} /></li>)}</ul>;
  return (
    <p className="hk-names-flow">
      {people.map((p, i) => (
        <Fragment key={p.id}>{i > 0 ? " " : null}<span><Name p={p} />{i < people.length - 1 ? "،" : null}</span></Fragment>
      ))}
    </p>
  );
}

function UnitBody({ u, names }: { u: PubUnit; names: Names }) {
  return (
    <>
      {u.leader || u.deputy ? (
        <div className="hk-heads">
          {u.leader ? <Who p={u.leader} /> : null}
          {u.deputy ? <Who p={u.deputy} /> : null}
        </div>
      ) : null}
      <NameList people={u.members} names={names} />
    </>
  );
}

function Department({ d, names }: { d: PubDepartment; names: Names }) {
  return (
    <div className="hk-node" id={`hk-d-${d.id}`}>
      <div className="hk-node-h">
        <h3 className="hk-node-t">{d.name}</h3>
        {d.head ? <Who p={d.head} size="md" /> : null}
      </div>
      {d.units.length ? (
        <div className="hk-coms">
          {d.units.map((u) => (
            <div key={u.id} className="hk-com">
              <div className="hk-com-h">
                <h4 className="hk-com-t">{u.name}</h4>
                <span className="hk-count">{countPhrase(u.total, MEMBER)}</span>
              </div>
              <UnitBody u={u} names={names} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SpineView({ s }: { s: PubStructure }) {
  const [names, setNames] = useState<Names>("cols");
  const { administrative: adm, executive: exe } = s;
  return (
    <div className="hk">
      <div className="flex justify-center">
        <Segmented items={NAMES} value={names} onValueChange={(v) => setNames(v as Names)} aria-label="هيئة أسماء الأعضاء" />
      </div>
      <nav className="hk-index" aria-label="أقسام الهيكلة">
        <a href="#hk-admin">{adm.name}</a>
        <a href="#hk-exec">{exe.name}</a>
        {exe.departments.map((d) => <a key={d.id} href={`#hk-d-${d.id}`}>{d.name}</a>)}
      </nav>
      <section className="hk-council" id="hk-admin">
        <div className="hk-council-h"><h2 className="hk-council-t">{adm.name}</h2></div>
        <div className="hk-faces">{adm.seats.map((p) => <Face key={p.id + p.title} p={p} />)}</div>
        {adm.units.length ? (
          <div className="hk-spine">
            {adm.units.map((u) => (
              <div key={u.id} className="hk-node">
                <div className="hk-node-h">
                  <h3 className="hk-node-t">{u.name}</h3>
                  <span className="hk-count">{countPhrase(u.total, MEMBER)}</span>
                </div>
                <UnitBody u={u} names={names} />
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <section className="hk-council" id="hk-exec">
        <div className="hk-council-h">
          <h2 className="hk-council-t">{exe.name}</h2>
          {exe.head ? <Who p={exe.head} size="md" /> : null}
        </div>
        <div className="hk-spine">{exe.departments.map((d) => <Department key={d.id} d={d} names={names} />)}</div>
      </section>
    </div>
  );
}
