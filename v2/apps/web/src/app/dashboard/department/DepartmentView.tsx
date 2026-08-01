"use client";

import { useMemo, useState } from "react";
import { Badge, Stat, matchesSearch } from "@adeeb/design-system";
import { ArrowSquareOut, Buildings, UserMinus, UsersFour } from "@phosphor-icons/react";
import { EmptyState } from "../_components/EmptyState";
import { Toolbar } from "../_components/Toolbar";
import { Committee } from "../members/structure/tree";
import type { CommitteeNode } from "../members/structure/model";

/**
 * «قسمي» — شاشة **منسّق القسم**، وهي **عرضٌ محض** (20260801): لجانُ قسمه، وقيادةُ كلٍّ
 * منها ونائبُها ومشرفاها وأعضاؤها. لا ضمَّ ولا إخراج ولا تعديل بيانات ولا إنهاء عضويّة —
 * المنسّق يعرف ما تحته، والأفعال تبقى حيث تقول القاعدة نعم.
 *
 * وشكلُها شكلُ الشجرة نفسه (`Committee` من `structure/tree`) بلا كرتٍ جديد ولا تنسيقٍ
 * شارد (ق١): ما يتحسّن هناك يتحسّن هنا. والطيُّ لأنّ اللجان عدّة — يُفتَح ما يُسأل عنه،
 * والبحثُ يفتحها كلَّها ويُسقط غيرَ المطابقين.
 */
export function DepartmentView({ name, committees, link }: { name: string; committees: CommitteeNode[]; link: string | null }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<number>>(new Set());
  const q = query.trim();
  const match = (n: string) => matchesSearch(q, n);
  const toggle = (id: number) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOpen = open.size === committees.length && committees.length > 0;

  const stats = useMemo(() => ({
    people: new Set(
      committees.flatMap((c) => [c.leader?.userId, c.deputy?.userId, ...c.members.map((m) => m.userId)].filter(Boolean) as string[]),
    ).size,
    gaps: committees.filter((c) => !c.leader || !c.deputy).length,
  }), [committees]);

  const visible = committees.filter(
    (c) => q === "" || match(c.name) || (c.leader && match(c.leader.name)) || (c.deputy && match(c.deputy.name)) || c.members.some((m) => match(m.name)),
  );

  return (
    <>
      <div className="ash-phead">
        <div>
          <div className="ash-crumb">أديب › <b>{name}</b></div>
          <h1>{name}</h1>
        </div>
      </div>

      <div className="stat-grid">
        <Stat icon={<Buildings weight="fill" />} value={committees.length} label="لجنة في قسمك" tone="brand" />
        <Stat icon={<UsersFour weight="fill" />} value={stats.people} label="عضوًا تحت قسمك" tone="success" />
        <Stat icon={<UserMinus weight="fill" />} value={stats.gaps} label="لجنة تنقصها قيادة" tone={stats.gaps ? "danger" : "success"} />
      </div>

      <Toolbar
        searchPlaceholder="ابحث عن عضو أو لجنة بالاسم…"
        search={query}
        onSearch={setQuery}
        actions={
          <>
            <Badge tone="info" variant="soft">عرضٌ فقط</Badge>
            <button type="button" className="org-btn" onClick={() => setOpen(allOpen ? new Set() : new Set(committees.map((c) => c.id)))}>
              {allOpen ? "طيّ الكلّ" : "توسيع الكلّ"}
            </button>
            {link ? (
              // رابطٌ بثوب الزرّ (سابقةٌ قائمة في اللوحة) — الوجهة خارجيّة فهو `<a>` لا زرّ
              <a className="abtn abtn-ghost abtn-sm" href={link} target="_blank" rel="noreferrer">
                <ArrowSquareOut size={16} aria-hidden /> قروب القسم
              </a>
            ) : null}
          </>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          variant="soft"
          icon={<UsersFour weight="duotone" />}
          title={q ? "لا مطابقون في قسمك" : "لا لجان في قسمك بعد"}
          description={q ? "جرّب اسمًا آخر — البحث يشمل اللجان وقادتها ونوّابها وأعضاءها." : "تُنسَب اللجان إلى الأقسام في القاعدة، وتظهر هنا حالما تُنسَب أولاها."}
        />
      ) : (
        <div className="org-coms">
          {visible.map((c) => (
            <Committee key={c.id} c={c} q={q} open={open.has(c.id)} onToggle={() => toggle(c.id)} edit={false} onMeta={() => {}} />
          ))}
        </div>
      )}
    </>
  );
}
