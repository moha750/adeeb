"use client";

import { useState } from "react";
import { Avatar } from "../../_components/Avatar";
import type { CommitteeNode, Holder, StructureModel } from "./model";

// تصميم «الأعمدة» — تنقّلٌ متتالٍ (Miller): عمودٌ لكلّ طبقة، مسارٌ مُضاء، وعمود أعضاءٍ ختاميّ.
const ARD = "٠١٢٣٤٥٦٧٨٩";
const ar = (v: string | number) => String(v).replace(/[0-9]/g, (d) => ARD[+d]);
const Chev = () => (
  <svg className="csc-chev" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4l-5 4 5 4" /></svg>
);

function members(c: CommitteeNode): { h: Holder; tag: string }[] {
  const out: { h: Holder; tag: string }[] = [];
  if (c.leader) out.push({ h: c.leader, tag: c.leader.roleAr });
  if (c.deputy) out.push({ h: c.deputy, tag: "النائب" });
  if (c.hrOverseer) out.push({ h: c.hrOverseer, tag: "مشرف الموارد" });
  if (c.qaOverseer) out.push({ h: c.qaOverseer, tag: "مشرف الضمان" });
  for (const m of c.members) out.push({ h: m, tag: m.roleName !== "committee_member" ? m.roleAr : "عضو" });
  return out;
}

export function CascadeView({ model }: { model: StructureModel }) {
  const councils = [model.executive, model.administrative];
  const firstDept = model.executive.departments[0];
  const firstCom = firstDept?.committees[0] ?? model.administrative.committees[0];
  const [sel, setSel] = useState<{ council: string; dept: string | null; com: string | null }>({
    council: model.executive.id,
    dept: firstDept ? `d${firstDept.id}` : null,
    com: firstCom ? `c${firstCom.id}` : null,
  });

  const council = councils.find((c) => c.id === sel.council) ?? model.executive;
  const isExec = council.id === "executive";
  const depts = isExec ? model.executive.departments : [];
  const dept = depts.find((d) => `d${d.id}` === sel.dept) ?? null;
  const coms = isExec ? (dept?.committees ?? []) : model.administrative.committees;
  const com = coms.find((c) => `c${c.id}` === sel.com) ?? null;

  const pickCouncil = (id: string) => {
    const ex = id === "executive";
    const d = ex ? model.executive.departments[0] : null;
    const cs = ex ? (d?.committees ?? []) : model.administrative.committees;
    setSel({ council: id, dept: d ? `d${d.id}` : null, com: cs[0] ? `c${cs[0].id}` : null });
  };
  const pickDept = (id: string, cs: CommitteeNode[]) => setSel((s) => ({ ...s, dept: id, com: cs[0] ? `c${cs[0].id}` : null }));

  return (
    <div className="csc-wrap">
      <div className="csc-bread">
        <b>{council.name}</b>
        {dept ? <><span className="sep">←</span> <b>{dept.name}</b></> : null}
        {com ? <><span className="sep">←</span> <b>{com.name}</b></> : null}
      </div>
      <div className="csc">
        {/* عمود المجالس */}
        <div className="csc-col">
          <div className="csc-colh">المجلس</div>
          {councils.map((c) => (
            <div key={c.id} className={"csc-item" + (c.id === sel.council ? " sel" : "")} onClick={() => pickCouncil(c.id)}>
              <Avatar name={c.head?.name} gender={c.head?.gender} size="sm" />
              <span className="nm">{c.name}</span>
              <Chev />
            </div>
          ))}
        </div>

        {/* عمود الأقسام (للتنفيذيّ فقط) */}
        {isExec ? (
          <div className="csc-col">
            <div className="csc-colh">القسم</div>
            {depts.map((d) => (
              <div key={d.id} className={"csc-item" + (`d${d.id}` === sel.dept ? " sel" : "") + (d.head ? "" : " csc-item-vac")} onClick={() => pickDept(`d${d.id}`, d.committees)}>
                <Avatar name={d.head?.name} gender={d.head?.gender} size="sm" />
                <span className="nm">{d.name}</span>
                <Chev />
              </div>
            ))}
          </div>
        ) : null}

        {/* عمود اللجان */}
        <div className="csc-col">
          <div className="csc-colh">اللجنة</div>
          {coms.length ? coms.map((c) => (
            <div key={c.id} className={"csc-item" + (`c${c.id}` === sel.com ? " sel" : "") + (c.leader ? "" : " csc-item-vac")} onClick={() => setSel((s) => ({ ...s, com: `c${c.id}` }))}>
              <Avatar name={c.leader?.name} gender={c.leader?.gender} size="sm" />
              <span className="nm">{c.name}</span>
              <Chev />
            </div>
          )) : <div className="csc-empty">اختر قسمًا</div>}
        </div>

        {/* عمود الأعضاء */}
        <div className="csc-col">
          <div className="csc-colh">{com ? `الأعضاء · ${ar(com.total)}` : "الأعضاء"}</div>
          {com ? (
            <div className="csc-leaf">
              {members(com).length ? members(com).map((m, i) => (
                <div key={m.h.userId + i} className="csc-leafrow">
                  <Avatar name={m.h.name} gender={m.h.gender} size="sm" />
                  <span className="nm">{m.h.name}</span>
                  <span className="rl">{m.tag}</span>
                </div>
              )) : <div className="csc-empty">لا أعضاء بعد.</div>}
            </div>
          ) : <div className="csc-empty">اختر لجنة</div>}
        </div>
      </div>
    </div>
  );
}
