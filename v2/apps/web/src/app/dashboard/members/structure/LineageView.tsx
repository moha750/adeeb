"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Avatar } from "../../_components/Avatar";
import type { CommitteeNode, DepartmentNode, StructureModel } from "./model";

// تصميم «الأنساب» — شجرةٌ موصولةٌ بوصلاتٍ منحنية، نسبٌ يُضيء عند التمرير، وعقدٌ قابلةٌ للطيّ.
const ARD = "٠١٢٣٤٥٦٧٨٩";
const ar = (v: string | number) => String(v).replace(/[0-9]/g, (d) => ARD[+d]);

type Kind = "root" | "council" | "dept" | "com";
type TNode = { id: string; kind: Kind; name: string; who: string; av: string | null; gender: "male" | "female" | null; vac: boolean; count?: string; children: TNode[] };
type Placed = TNode & { x: number; y: number };

function buildTree(model: StructureModel): TNode {
  const com = (c: CommitteeNode): TNode => ({ id: `c${c.id}`, kind: "com", name: c.name, who: c.leader ? c.leader.name : "قائدٌ شاغر", av: c.leader?.name ?? null, gender: c.leader?.gender ?? null, vac: !c.leader, count: ar(c.total), children: [] });
  const dep = (d: DepartmentNode): TNode => ({ id: `d${d.id}`, kind: "dept", name: d.name, who: d.head ? d.head.name : "منسّقٌ شاغر", av: d.head?.name ?? null, gender: d.head?.gender ?? null, vac: !d.head, children: d.committees.map(com) });
  return {
    id: "root", kind: "root", name: "نادي أديب", who: "الهيكل التنظيميّ", av: "أديب", gender: null, vac: false,
    children: [
      { id: "administrative", kind: "council", name: model.administrative.name, who: model.administrative.head?.name ?? "الرئاسة شاغرة", av: model.administrative.head?.name ?? null, gender: model.administrative.head?.gender ?? null, vac: !model.administrative.head, children: model.administrative.committees.map(com) },
      { id: "executive", kind: "council", name: model.executive.name, who: model.executive.head?.name ?? "الرئاسة شاغرة", av: model.executive.head?.name ?? null, gender: model.executive.head?.gender ?? null, vac: !model.executive.head, children: model.executive.departments.map(dep) },
    ],
  };
}

const NW = 174, GX = 22, LY = 118, TOP = 16, CARD_H = 56;

export function LineageView({ model }: { model: StructureModel }) {
  const root = useMemo(() => buildTree(model), [model]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hot, setHot] = useState<string | null>(null);

  const { nodes, wires, W, H, parentOf } = useMemo(() => {
    const nodes: Placed[] = [];
    const parentOf = new Map<string, string>();
    let leaf = 0, maxD = 0;
    const walk = (n: TNode, depth: number, parent: string | null): Placed => {
      if (parent) parentOf.set(n.id, parent);
      maxD = Math.max(maxD, depth);
      const kids = collapsed.has(n.id) ? [] : n.children;
      const placed = kids.map((k) => walk(k, depth + 1, n.id));
      const x = placed.length ? (placed[0].x + placed[placed.length - 1].x) / 2 : (leaf++ * (NW + GX) + NW / 2);
      const p: Placed = { ...n, x, y: TOP + depth * LY };
      nodes.push(p);
      return p;
    };
    walk(root, 0, null);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const wires: { d: string; from: string; to: string }[] = [];
    for (const n of nodes) {
      if (collapsed.has(n.id)) continue;
      for (const k of n.children) {
        const c = byId.get(k.id); if (!c) continue;
        const px = n.x, py = n.y + CARD_H, cx = c.x, cy = c.y, m = (cy - py) / 2;
        wires.push({ d: `M${px},${py} C${px},${py + m} ${cx},${cy - m} ${cx},${cy}`, from: n.id, to: k.id });
      }
    }
    return { nodes, wires, W: Math.max(leaf * (NW + GX), NW + GX), H: TOP + maxD * LY + CARD_H + 16, parentOf };
  }, [root, collapsed]);

  // نسبٌ مُضاء: أسلاف العقدة + هي + ذرّيّتها الظاهرة
  const hotSet = useMemo(() => {
    const s = new Set<string>();
    if (!hot) return s;
    for (let cur: string | undefined = hot; cur; cur = parentOf.get(cur)) s.add(cur);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const desc = (id: string) => { const n = byId.get(id); if (!n) return; s.add(id); if (!collapsed.has(id)) n.children.forEach((k) => desc(k.id)); };
    desc(hot);
    return s;
  }, [hot, parentOf, nodes, collapsed]);

  const toggle = (id: string, hasKids: boolean) => {
    if (!hasKids) return;
    setCollapsed((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="lin-wrap">
      <div className="lin">
        <div className="lin-canvas" style={{ width: W, height: H }}>
          <svg className="lin-wires" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
            {wires.map((w, i) => <path key={i} className={hotSet.has(w.from) && hotSet.has(w.to) ? "hot" : undefined} d={w.d} />)}
          </svg>
          {nodes.map((n) => {
            const hasKids = n.children.length > 0;
            const isCol = collapsed.has(n.id);
            const cls = "lin-node lin-node-" + n.kind + (n.vac ? " lin-node-vac" : "") + (hotSet.has(n.id) ? " hot" : "");
            const badge = n.kind === "com" ? n.count : hasKids && isCol ? `+${ar(n.children.length)}` : undefined;
            return (
              <div key={n.id} className={cls} style={{ left: n.x, top: n.y } as CSSProperties}
                onMouseEnter={() => setHot(n.id)} onMouseLeave={() => setHot(null)}>
                <div className="lin-card" onClick={() => toggle(n.id, hasKids)}
                  role={hasKids ? "button" : undefined} tabIndex={hasKids ? 0 : undefined}
                  onKeyDown={(e) => { if (hasKids && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(n.id, hasKids); } }}>
                  <Avatar name={n.av ?? undefined} gender={n.gender} size="sm" />
                  <span className="lin-tx"><b>{n.name}</b><span>{n.who}</span></span>
                  {badge ? <span className="lin-cnt">{badge}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="lin-tip"><b>تلميح:</b> مرّر على عقدةٍ يُضِئ نسبها (أصلها وفروعها)، وانقر مجلسًا أو قسمًا لطيّه أو فتحه.</div>
    </div>
  );
}
