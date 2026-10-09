"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { countPhrase } from "@adeeb/design-system";
import type { PubPerson, PubStructure } from "./data";
import { Face } from "./Face";
import { COMMITTEE, MEMBER, NodeFaces, NodeText, href } from "./parts";
import { buildTree, type TNode } from "./tree";

/**
 * **«تتفتّح» كما عُرضت أوّلَ مرّة** — أعادها المالك للموازنة بجانب الحاليّة (`GrowTree`) (٢٠٢٦-١٠-٠٩).
 * الفرقُ بينهما: هنا المستشارُ والإدارتان صفٌّ تحت الرئيس مع رئيس التنفيذيّ، وتُفتح الفروعُ معًا
 * بلا طيّ لغيرها، وأهلُ اللجنة عمودُ وجوهٍ تحتها. ولذلك تتّسع وتطول حين تُفتح فروعٌ كثيرة،
 * فتُسحب أفقيًّا في إطارها — وهو العيبُ الذي عالجته الحاليّة.
 */

function Leaves({ people }: { people: PubPerson[] }) {
  return (
    <div className="tr-leafwrap tf-grow">
      <div className="tr-leaves" style={{ ["--tr-cols" as string]: people.length > 12 ? 3 : 2 }}>
        {people.map((p) => {
          const h = href(p);
          const body = <><Face p={p} size="var(--tr-fl)" /><span className="tr-leaf-nm">{p.name}</span></>;
          return h ? <a key={p.id} className="tr-leaf" href={h}>{body}</a> : <div key={p.id} className="tr-leaf">{body}</div>;
        })}
      </div>
    </div>
  );
}

function Branch({ n, open, toggle }: { n: TNode; open: Set<string>; toggle: (k: string) => void }) {
  const d = Math.min(n.depth, 3);
  const has = n.children.length > 0 || n.members.length > 0;
  const isOpen = open.has(n.key);
  const chip = n.children.length ? countPhrase(n.children.length, COMMITTEE) : countPhrase(n.total, MEMBER);
  const own = n.face && n.kind === "seat" ? href(n.face) : undefined;
  const body = <><NodeFaces n={n} size={`var(--tr-f${d})`} /><NodeText n={n} /></>;
  return (
    <li className={"tr-li" + (n.depth === 0 ? " tr-top" : "")}>
      {has ? (
        <button type="button" className={`tr-node tr-d${d}`} aria-expanded={isOpen} onClick={() => toggle(n.key)}>
          {body}
          {!isOpen ? <span className="tf-more">{chip}</span> : null}
        </button>
      ) : own ? (
        <a className={`tr-node tr-d${d}`} href={own}>{body}</a>
      ) : (
        <div className={`tr-node tr-d${d}`}>{body}</div>
      )}
      {isOpen && n.children.length ? <ul className="tr-ul tf-grow">{n.children.map((c) => <Branch key={c.key} n={c} open={open} toggle={toggle} />)}</ul> : null}
      {isOpen && n.members.length ? <Leaves people={n.members} /> : null}
    </li>
  );
}

export function PrevTree({ s }: { s: PubStructure }) {
  const root = useMemo(() => buildTree(s), [s]);
  // كما كانت: الرئيسُ ورئيسُ التنفيذيّ مفتوحان، وما تحتهما بنقرة
  const [open, setOpen] = useState<Set<string>>(() => new Set(root ? [root.key, ...root.children.filter((c) => c.children.length).map((c) => c.key)] : []));
  const toggle = (k: string) => setOpen((o) => { const x = new Set(o); if (x.has(k)) x.delete(k); else x.add(k); return x; });
  const scrollRef = useRef<HTMLDivElement>(null);

  // الجذرُ في منتصف الإطار عند البدء (الشجرةُ قد تكون أعرض منه)
  useEffect(() => {
    const el = scrollRef.current;
    const top = el?.querySelector(".tr-top > .tr-node");
    if (!el || !top) return;
    const a = el.getBoundingClientRect();
    const b = top.getBoundingClientRect();
    el.scrollBy({ left: b.left + b.width / 2 - (a.left + a.width / 2) });
  }, []);

  if (!root) return null;
  return (
    <div className="tf tr tr-down tf-prev">
      <div ref={scrollRef} className="tr-scroll">
        <ul className="tr-ul tr-root"><Branch n={root} open={open} toggle={toggle} /></ul>
      </div>
    </div>
  );
}
