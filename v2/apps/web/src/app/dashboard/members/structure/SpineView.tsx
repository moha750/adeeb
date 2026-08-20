"use client";

import { useState } from "react";
import { Avatar } from "../../_components/Avatar";
import type { CommitteeNode, CouncilBody, DepartmentNode, StructureModel } from "./model";

// تصميم «المِحوَر» — شجرةٌ مُزاحة (outline): محورٌ بأدلّة عمقٍ رفيعة وأسهم طيّ، كثيفٌ وسريع المسح.
const ARD = "٠١٢٣٤٥٦٧٨٩";
const ar = (v: string | number) => String(v).replace(/[0-9]/g, (d) => ARD[+d]);

const Caret = ({ on }: { on: boolean }) => (
  <svg className={"spn-caret" + (on ? " on" : "")} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4l-5 4 5 4" /></svg>
);

// رأسُ المجموعة يُعرَّف **خارج** الشاشة: مكوّنٌ يُخلَق في كلّ رسمةٍ نوعٌ جديد في عين React،
// فتُهدَم شجرتُه وتُبنى من جديد (يضيع التركيز والصورة تُعاد جلبًا) — وهو ما تصيح به قاعدةُ
// المصرِّف `static-components`. ولا يحتاج من الشاشة شيئًا: كلُّ ما يعرضه في خواصّه.
const Head = ({ c, tail }: { c: CouncilBody; tail: string }) => (
  <div className="spn-head">
    <Avatar name={c.head?.name} gender={c.head?.gender} size="sm" />
    <span className="spn-title">{c.name}</span>
    <span className="spn-sub">، {c.head ? c.head.name : "الرئاسة شاغرة"}</span>
    <span className="spn-cnt">{tail}</span>
  </div>
);

export function SpineView({ model }: { model: StructureModel }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setCollapsed((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const comRow = (c: CommitteeNode) => (
    <div key={`c${c.id}`} className={"spn-row" + (c.leader ? "" : " spn-row-vac")}>
      <span className="spn-spacer" />
      <Avatar name={c.leader?.name} gender={c.leader?.gender} size="xs" />
      <span className="spn-name">{c.name}</span>
      <span className="spn-role">، {c.leader ? c.leader.name : "قائدٌ شاغر"}</span>
      <span className="spn-trail">{c.leader ? <span className="spn-count">{ar(c.total)}</span> : <span className="spn-vac">شاغر</span>}</span>
    </div>
  );

  const deptRow = (d: DepartmentNode) => {
    const open = !collapsed.has(`d${d.id}`);
    return (
      <div key={`d${d.id}`}>
        <div className={"spn-row spn-row-dept has-kids" + (d.head ? "" : " spn-row-vac")} onClick={() => toggle(`d${d.id}`)}>
          <Caret on={open} />
          <Avatar name={d.head?.name} gender={d.head?.gender} size="xs" />
          <span className="spn-name">{d.name}</span>
          <span className="spn-role">، {d.head ? d.head.name : "منسّقٌ شاغر"}</span>
          <span className="spn-trail"><span className="spn-count">{ar(d.committees.length)} لجان</span></span>
        </div>
        {open && d.committees.length ? <div className="spn-children">{d.committees.map(comRow)}</div> : null}
      </div>
    );
  };

  return (
    <div className="spn">
      <div className="spn-group">
        <Head c={model.administrative} tail={`${ar(model.administrative.committees.length)} لجان`} />
        <div className="spn-children">{model.administrative.committees.map(comRow)}</div>
      </div>
      <div className="spn-group">
        <Head c={model.executive} tail={`${ar(model.executive.departments.length)} أقسام`} />
        <div className="spn-children">{model.executive.departments.map(deptRow)}</div>
      </div>
    </div>
  );
}
