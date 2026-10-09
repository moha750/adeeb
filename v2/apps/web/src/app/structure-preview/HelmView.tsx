"use client";

import { useRef, useState } from "react";
import { CarouselNav, countPhrase } from "@adeeb/design-system";
import type { PubDepartment, PubPerson, PubStructure, PubUnit } from "./data";
import { Face } from "./Face";
import { MEMBER, href } from "./parts";

/**
 * **٤ · الدفّة** — معادةٌ للموازنة (٢٠٢٦-١٠-٠٩). عجلةُ سفينةٍ أذرعُها الأقسامُ والإدارتان، وفي مقبض
 * كلّ ذراعٍ وجهُ قائده، وفي القلب الرئيس. تُدار بالسحب أو بالنقر على مقبض، والقسمُ الذي في أعلاها
 * تُعرض وجوهُ أهله بجانبها. والمقابضُ تدور بعكس العجلة فتبقى الوجوهُ قائمة.
 */
type Spoke =
  | { key: string; name: string; face: PubPerson | null; kind: "unit"; unit: PubUnit }
  | { key: string; name: string; face: PubPerson | null; kind: "dept"; dept: PubDepartment };

const R_HANDLE = 41;
const DRAG_PX = 6;
const norm = (d: number) => ((d % 360) + 360) % 360;

function Person({ p, size, title }: { p: PubPerson; size: "lead" | "head" | "mem"; title?: string | null }) {
  const h = href(p);
  const body = (
    <>
      <Face p={p} size={size === "lead" ? "128px" : size === "head" ? "88px" : "64px"} />
      <span className="hm-nm">{p.name}</span>
      {title ? <span className="hm-rl">{title}</span> : null}
    </>
  );
  const cls = `hm-person hm-person-${size}`;
  return h ? <a className={cls} href={h}>{body}</a> : <div className={cls}>{body}</div>;
}

function Unit({ u, sub }: { u: PubUnit; sub?: boolean }) {
  return (
    <section className="hm-unit">
      {sub ? (
        <div className="hm-unit-h">
          <h3 className="hm-unit-t">{u.name}</h3>
          <span className="hm-count">{countPhrase(u.total, MEMBER)}</span>
        </div>
      ) : null}
      {u.leader || u.deputy ? (
        <div className="hm-row">
          {u.leader ? <Person p={u.leader} size="head" title={u.leader.title} /> : null}
          {u.deputy ? <Person p={u.deputy} size="head" title={u.deputy.title} /> : null}
        </div>
      ) : null}
      {u.members.length ? <div className="hm-row">{u.members.map((m) => <Person key={m.id} p={m} size="mem" />)}</div> : null}
    </section>
  );
}

function Panel({ s, spoke }: { s: PubStructure; spoke: Spoke | null }) {
  if (!spoke) {
    return (
      <div className="hm-panel">
        <h2 className="hm-title">{s.administrative.name}</h2>
        <div className="hm-row">{s.administrative.seats.map((p) => <Person key={p.id + p.title} p={p} size="lead" title={p.title} />)}</div>
      </div>
    );
  }
  if (spoke.kind === "unit") {
    return (
      <div className="hm-panel">
        <div className="hm-title-row"><h2 className="hm-title">{spoke.name}</h2><span className="hm-count">{countPhrase(spoke.unit.total, MEMBER)}</span></div>
        <Unit u={spoke.unit} />
      </div>
    );
  }
  const d = spoke.dept;
  return (
    <div className="hm-panel">
      <div className="hm-title-row"><h2 className="hm-title">{d.name}</h2><span className="hm-count">{countPhrase(d.total, MEMBER)}</span></div>
      {d.head ? <div className="hm-row"><Person p={d.head} size="lead" title={d.head.title} /></div> : null}
      {d.units.map((u) => <Unit key={u.id} u={u} sub />)}
    </div>
  );
}

export function HelmView({ s }: { s: PubStructure }) {
  const spokes: Spoke[] = [
    ...s.administrative.units.map((u): Spoke => ({ key: `u${u.id}`, name: u.name, face: u.leader, kind: "unit", unit: u })),
    ...s.executive.departments.map((d): Spoke => ({ key: `d${d.id}`, name: d.name, face: d.head, kind: "dept", dept: d })),
  ];
  const n = Math.max(spokes.length, 1);
  const step = 360 / n;
  const core = s.administrative.seats[0] ?? null;
  const [active, setActive] = useState(-1);
  const [rot, setRot] = useState(0);
  const [dragging, setDragging] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ a0: number; r0: number; moved: boolean } | null>(null);
  const dragged = useRef(false);

  const turnTo = (i: number) => {
    const delta = ((-i * step - rot) % 360 + 540) % 360 - 180;
    setRot(rot + delta);
    setActive(i);
  };
  const angleAt = (e: React.PointerEvent) => {
    const r = wheelRef.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const onDown = (e: React.PointerEvent) => { drag.current = { a0: angleAt(e), r0: rot, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const delta = (((angleAt(e) - d.a0) % 360) + 540) % 360 - 180;
    if (!d.moved && Math.abs(delta) * 2 < DRAG_PX) return;
    if (!d.moved) { d.moved = true; setDragging(true); wheelRef.current?.setPointerCapture(e.pointerId); }
    setRot(d.r0 + delta);
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    dragged.current = true;
    setTimeout(() => { dragged.current = false; }, 0);
    setDragging(false);
    turnTo(Math.round(norm(-rot) / step) % n);
  };
  const current = active >= 0 ? spokes[active] : null;

  return (
    <div className="hm">
      <div className="hm-side">
        <div ref={wheelRef} className={"hm-wheel" + (dragging ? " is-drag" : "")} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="hm-mark" aria-hidden />
          <div className="hm-rotor" style={{ transform: `rotate(${rot}deg)` }}>
            <svg className="hm-svg" viewBox="0 0 100 100" aria-hidden>
              {spokes.map((sp, i) => { const a = (i * step * Math.PI) / 180; return <line key={sp.key} className="hm-spoke" x1={50 + 10 * Math.sin(a)} y1={50 - 10 * Math.cos(a)} x2={50 + (R_HANDLE - 4) * Math.sin(a)} y2={50 - (R_HANDLE - 4) * Math.cos(a)} />; })}
              <circle className="hm-rim" cx="50" cy="50" r="31" />
              <circle className="hm-rim-in" cx="50" cy="50" r="27.6" />
              <circle className="hm-rim-out" cx="50" cy="50" r="34.2" />
              {spokes.map((sp, i) => { const a = (i * step * Math.PI) / 180; return <circle key={`st-${sp.key}`} className="hm-stud" cx={50 + 31 * Math.sin(a)} cy={50 - 31 * Math.cos(a)} r="1.5" />; })}
              <circle className="hm-hub" cx="50" cy="50" r="11.5" />
            </svg>
            {spokes.map((sp, i) => {
              const a = (i * step * Math.PI) / 180;
              const on = i === active;
              return (
                <button key={sp.key} type="button" className={"hm-handle" + (on ? " is-on" : "")} style={{ left: `${50 + R_HANDLE * Math.sin(a)}%`, top: `${50 - R_HANDLE * Math.cos(a)}%`, transform: `translate(-50%, -50%) rotate(${-rot}deg)` }} aria-label={sp.face ? `${sp.name}، ${sp.face.name}` : sp.name} aria-pressed={on} onClick={() => { if (!dragged.current) turnTo(i); }}>
                  {sp.face ? <Face p={sp.face} size="14cqi" lit={on} /> : <span className="hm-knob" />}
                </button>
              );
            })}
            {core ? (
              <button type="button" className={"hm-core" + (active === -1 ? " is-on" : "")} style={{ transform: `translate(-50%, -50%) rotate(${-rot}deg)` }} aria-label={`${s.administrative.name}، ${core.name}`} aria-pressed={active === -1} onClick={() => { if (!dragged.current) setActive(-1); }}>
                <Face p={core} size="20cqi" lit={active === -1} />
              </button>
            ) : null}
          </div>
        </div>
        <p className="hm-now">{current ? current.name : s.administrative.name}</p>
        <CarouselNav onPrev={() => turnTo(((active < 0 ? 0 : active) - 1 + n) % n)} onNext={() => turnTo(((active < 0 ? -1 : active) + 1) % n)} />
      </div>
      <Panel key={current?.key ?? "hub"} s={s} spoke={current} />
    </div>
  );
}
