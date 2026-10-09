"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { countPhrase } from "@adeeb/design-system";
import { REDUCE_MOTION, useMediaFlag } from "@/lib/useMediaFlag";
import type { PubStructure } from "./data";
import { Face } from "./Face";
import { COMMITTEE, MEMBER, NodeFaces, NodeText, href } from "./parts";
import { buildTree, type TNode } from "./tree";

/**
 * **شجرةٌ تتفتّح** — أعادها المالك بعد خمسة نماذج: «أوّلُ مقترحٍ كان أفضلَهم» (٢٠٢٦-١٠-٠٩)،
 * وعيبُها الوحيد يومئذٍ أنّها تحتاج تمريرًا حين تُفتح فروعٌ كثيرة. فعولج ذلك بثلاثٍ لا بتغيير الفكرة:
 *
 * ١) **فرعٌ واحدٌ مفتوح**: فتحُ قسمٍ يطوي القسمَ المفتوح، وفتحُ لجنةٍ يطوي أختها. فالشجرةُ لا
 *    تتجاوز عرضَ الشاشة أبدًا.
 * ٢) **المستشارُ والإدارتان على الجذع لا تحته**: معلَّقون بجانب الخطّ النازل من الرئيس إلى رئيس
 *    التنفيذيّ (كمقاعد الأركان في الهياكل)، فيبقى عرضُ الشاشة كلُّه للأقسام ولجانها.
 * ٣) **أهلُ اللجنة في درجٍ عريضٍ تحت الشجرة** لا في عمودٍ تحت لجنتهم: العمودُ كان يمطّ الشجرة
 *    إلى الأسفل ويوسّع عمودَ لجنته. والدرجُ موصولٌ بلجنته بخطٍّ يُقاس من موضعها.
 *
 * والشجرةُ بمقاسها الطبيعيّ لا تُصغَّر، وما يُفتح تحت حافّة الشاشة تلحقه الصفحةُ بنعومة.
 */



function Node({ n, size, onClick, open, chip }: { n: TNode; size: string; onClick?: () => void; open?: boolean; chip?: string | null }) {
  const d = Math.min(n.depth, 3);
  const body = (
    <>
      <NodeFaces n={n} size={size} />
      <NodeText n={n} />
      {chip ? <span className={"tf-more" + (open ? " is-open" : "")}>{chip}</span> : null}
    </>
  );
  if (onClick) {
    return <button type="button" className={`tr-node tr-d${d}` + (open ? " is-open" : "")} aria-expanded={open} onClick={onClick} data-k={n.key}>{body}</button>;
  }
  const own = n.face && n.kind === "seat" ? href(n.face) : undefined;
  return own ? <a className={`tr-node tr-d${d}`} href={own} data-k={n.key}>{body}</a> : <div className={`tr-node tr-d${d}`} data-k={n.key}>{body}</div>;
}

function Drawer({ n, refEl }: { n: TNode; refEl: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={refEl} className="tf-drawer" role="region" aria-label={n.label}>
      <div className="tf-drawer-h">
        <span className="tf-drawer-t">{n.label}</span>
        <span className="tr-count">{countPhrase(n.total, MEMBER)}</span>
      </div>
      <div className="tf-members">
        {n.members.map((p) => {
          const h = href(p);
          const body = <><Face p={p} size="64px" /><span className="tr-leaf-nm">{p.name}</span></>;
          return h ? <a key={p.id} className="tr-leaf tf-member" href={h}>{body}</a> : <div key={p.id} className="tr-leaf tf-member">{body}</div>;
        })}
      </div>
    </div>
  );
}

export function GrowTree({ s }: { s: PubStructure }) {
  const root = useMemo(() => buildTree(s), [s]);
  const reduce = useMediaFlag(REDUCE_MOTION);
  const exec = root?.children.find((c) => c.children.some((d) => d.kind === "dept")) ?? null;
  const staff = root ? root.children.filter((c) => c !== exec) : [];
  const half = Math.ceil(staff.length / 2);

  const [dept, setDept] = useState<string | null>(null);
  const [unit, setUnit] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const deptsRef = useRef<HTMLUListElement>(null);
  const [stem, setStem] = useState<{ x: number; y: number; h: number } | null>(null);

  const units = useMemo(() => {
    const m = new Map<string, TNode>();
    staff.filter((n) => n.kind === "unit").forEach((n) => m.set(n.key, n));
    exec?.children.forEach((d) => d.children.forEach((u) => m.set(u.key, u)));
    return m;
  }, [staff, exec]);
  const openUnit = unit ? units.get(unit) ?? null : null;
  const staffOpen = !!openUnit && staff.includes(openUnit);

  const toggleDept = (k: string) => { setDept((d) => (d === k ? null : k)); setUnit(null); };
  const toggleUnit = (k: string) => setUnit((u) => (u === k ? null : k));

  // الخطُّ من اللجنة المفتوحة إلى درجها: يُقاس من موضعيهما، ويُعاد مع كلّ تغيّرٍ في المقاس
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const dr = drawerRef.current;
    if (!wrap || !dr || !unit) { setStem(null); return; }
    const measure = () => {
      const node = wrap.querySelector<HTMLElement>(`[data-k="${unit}"] .tr-faces`) ?? wrap.querySelector<HTMLElement>(`[data-k="${unit}"]`);
      const btn = wrap.querySelector<HTMLElement>(`[data-k="${unit}"]`);
      if (!node || !btn) { setStem(null); return; }
      const w = wrap.getBoundingClientRect();
      const f = node.getBoundingClientRect();
      const b = btn.getBoundingClientRect();
      const d = dr.getBoundingClientRect();
      const y = b.bottom - w.top + 6;
      setStem({ x: f.left + f.width / 2 - w.left, y, h: Math.max(d.top - w.top - y, 0) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [unit, dept]);

  // ما فُتح تحت حافّة الشاشة تلحقه الصفحة (ولا تقفز إن كان ظاهرًا أصلًا)
  useEffect(() => {
    const el = unit ? drawerRef.current : dept ? deptsRef.current?.querySelector<HTMLElement>(`[data-open="1"] > .tr-ul`) : null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 16) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [unit, dept, reduce]);

  if (!root) return null;
  const staffNode = (n: TNode) => (
    <div key={n.key} className="tf-staff-n">
      {n.kind === "unit" && n.members.length
        ? <Node n={n} size="var(--tr-f1)" onClick={() => { setDept(null); toggleUnit(n.key); }} open={unit === n.key} chip={countPhrase(n.total, MEMBER)} />
        : <Node n={n} size="var(--tr-f1)" />}
    </div>
  );

  return (
    <div ref={wrapRef} className="tf tr tr-down">
      <div className="tf-head"><Node n={root} size="var(--tr-f0)" /></div>

      {staff.length ? (
        <div className="tf-staff">
          <div className="tf-side tf-side-a">{staff.slice(0, half).map(staffNode)}</div>
          <span className="tf-trunk" aria-hidden />
          <div className="tf-side tf-side-b">{staff.slice(half).map(staffNode)}</div>
        </div>
      ) : null}

      {staffOpen && openUnit ? <Drawer key={openUnit.key} n={openUnit} refEl={drawerRef} /> : null}

      {exec ? (
        <>
          <div className="tf-exec"><Node n={exec} size="var(--tr-f1)" /></div>
          <ul ref={deptsRef} className="tr-ul tf-depts">
            {exec.children.map((d) => {
              const isOpen = dept === d.key;
              return (
                <li key={d.key} className="tr-li" data-open={isOpen ? "1" : undefined}>
                  <Node n={d} size="var(--tr-f2)" onClick={() => toggleDept(d.key)} open={isOpen} chip={d.children.length ? countPhrase(d.children.length, COMMITTEE) : null} />
                  {isOpen && d.children.length ? (
                    <ul className="tr-ul tf-grow">
                      {d.children.map((u) => (
                        <li key={u.key} className="tr-li">
                          {u.members.length
                            ? <Node n={u} size="var(--tr-f3)" onClick={() => toggleUnit(u.key)} open={unit === u.key} chip={countPhrase(u.total, MEMBER)} />
                            : <Node n={u} size="var(--tr-f3)" />}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {!staffOpen && openUnit ? <Drawer key={openUnit.key} n={openUnit} refEl={drawerRef} /> : null}
      {stem && stem.h > 0 ? <span className="tf-stem" style={{ left: stem.x, top: stem.y, height: stem.h }} aria-hidden /> : null}
    </div>
  );
}

