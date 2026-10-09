"use client";

import { useState } from "react";
import { Badge, Card, CardBody, CardHeader, Segmented, SectionHeading } from "@adeeb/design-system";
import { Rows, SquaresFour, Users } from "@phosphor-icons/react";
import { CaretDown } from "@/app/_components/glyphs";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import type { PubDepartment, PubPerson, PubStructure, PubUnit } from "./data";

/**
 * **١ · المشهد والفهرس** — أوّلُ ما عُرض (٢٠٢٦-١٠-٠٩)، معادٌ للموازنة. شرائحُ اللوحة (`.org-person`)
 * في كروتٍ مفتوحة (المشهد) أو صفوفٍ مطويّة (الفهرس). رُدّ يومها: «لم تعجبني طريقة العرض».
 */
type Shape = "scene" | "index";

const SHAPES = [
  { value: "scene", label: <span className="seg-lbl"><SquaresFour /> المشهد</span> },
  { value: "index", label: <span className="seg-lbl"><Rows /> الفهرس</span> },
];

function Person({ p, tone }: { p: PubPerson; tone?: "gold" | "steel" }) {
  const body = (
    <>
      <Avatar name={p.name} src={p.avatar ?? undefined} gender={p.gender} size="sm" />
      <span className="org-person-tx"><b>{p.name}</b>{p.title ? <span>{p.title}</span> : null}</span>
    </>
  );
  const cls = "org-person" + (tone ? ` org-person-${tone}` : "");
  return p.slug ? <a className={cls} href={`/m/${encodeURIComponent(p.slug)}`}>{body}</a> : <div className={cls}>{body}</div>;
}

const peopleOf = (u: PubUnit) => (
  <div className="org-people">
    {u.leader ? <Person p={u.leader} tone="gold" /> : null}
    {u.deputy ? <Person p={u.deputy} tone="steel" /> : null}
    {u.members.map((m) => <Person key={m.id} p={m} />)}
  </div>
);

const Count = ({ n }: { n: number }) => <Badge tone="neutral" variant="soft"><Users /> {n}</Badge>;

function UnitCard({ u }: { u: PubUnit }) {
  return (
    <Card>
      <CardHeader variant="soft" title={u.name} actions={<Count n={u.total} />} />
      <CardBody>{peopleOf(u)}</CardBody>
    </Card>
  );
}

function UnitRow({ u }: { u: PubUnit }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="org-com">
      <div className="org-com-head">
        <button type="button" className="org-com-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <CaretDown className={"org-caret" + (open ? " on" : "")} />
          <span className="org-com-name">{u.name}</span>
        </button>
        {u.leader ? (
          <span className="org-com-leader">
            <Avatar name={u.leader.name} src={u.leader.avatar ?? undefined} gender={u.leader.gender} size="xs" />
            <span>{u.leader.name}</span>
          </span>
        ) : null}
        <span className={u.leader ? undefined : "ms-auto"}><Count n={u.total} /></span>
      </div>
      {open ? <div className="org-com-body">{peopleOf(u)}</div> : null}
    </div>
  );
}

function Units({ units, shape }: { units: PubUnit[]; shape: Shape }) {
  return shape === "scene"
    ? <div className="card-grid card-grid-2col">{units.map((u) => <UnitCard key={u.id} u={u} />)}</div>
    : <div className="flex flex-col gap-3">{units.map((u) => <UnitRow key={u.id} u={u} />)}</div>;
}

function Department({ d, shape }: { d: PubDepartment; shape: Shape }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-xl font-bold text-content">{d.name}</h3>
        {d.head ? <Person p={d.head} tone="gold" /> : null}
      </div>
      <Units units={d.units} shape={shape} />
    </div>
  );
}

export function ShapesView({ s }: { s: PubStructure }) {
  const [shape, setShape] = useState<Shape>("scene");
  return (
    <div className="flex flex-col gap-16">
      <div className="flex justify-center">
        <Segmented items={SHAPES} value={shape} onValueChange={(v) => setShape(v as Shape)} aria-label="شكل الصفحة" />
      </div>
      <section className="flex flex-col gap-8">
        <SectionHeading title={s.administrative.name} className="!mb-0" />
        <div className="org-people">{s.administrative.seats.map((p) => <Person key={p.id + p.title} p={p} tone="gold" />)}</div>
        <Units units={s.administrative.units} shape={shape} />
      </section>
      <section className="flex flex-col gap-10">
        <SectionHeading title={s.executive.name} className="!mb-0" />
        {s.executive.head ? <div className="org-people"><Person p={s.executive.head} tone="gold" /></div> : null}
        {s.executive.departments.map((d) => <Department key={d.id} d={d} shape={shape} />)}
      </section>
    </div>
  );
}
