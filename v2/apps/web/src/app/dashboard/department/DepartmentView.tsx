"use client";

import { useMemo, useState } from "react";
import { Badge, Segmented, Stat, matchesSearch } from "@adeeb/design-system";
import { Buildings, UserMinus, UsersFour } from "@phosphor-icons/react";
import { ArrowSquareOut } from "@/app/_components/glyphs";
import { EmptyState } from "../_components/EmptyState";
import { Toolbar } from "../_components/Toolbar";
import { Committee } from "../members/structure/tree";
import { MembersView } from "../members/MembersView";
import type { MemberRow } from "../members/data";
import type { CommitteeNode } from "../members/structure/model";
import { PageHeader } from "../_components/PageHeader";

/**
 * «قسمي» — شاشة **منسّق القسم**، وهي **عرضٌ محض** (20260801): لجانُ قسمه، وقيادةُ كلٍّ
 * منها ونائبُها ومشرفاها وأعضاؤها. لا ضمَّ ولا إخراج ولا تعديل بيانات ولا إنهاء عضويّة —
 * المنسّق يعرف ما تحته، والأفعال تبقى حيث تقول القاعدة نعم.
 *
 * **وعينان على نطاقٍ واحد** (كـ«لجنتي» و«من أشرف عليهم»): «اللجان» شكلُ الشجرة نفسه
 * (`Committee` من `structure/tree`) بلا كرتٍ جديد ولا تنسيقٍ شارد (ق١) — والطيُّ لأنّ اللجان
 * عدّة، والبحثُ يفتحها ويُسقط غيرَ المطابقين. و«الأعضاء» سجلُّ من تحته جدولًا يُبحَث ويُرشَّح،
 * ومنه «عرض الملف» — وهو ما لا تجيبه الشجرة.
 *
 * والعرضُ المحض في منبعه: `readOnly` يُجفّف سلطةَ كلّ صفّ في `MembersView` فتغيب أفعالُه.
 */
export function DepartmentView({
  name,
  committees,
  link,
  members,
}: {
  name: string;
  committees: CommitteeNode[];
  link: string | null;
  members: MemberRow[];
}) {
  const [view, setView] = useState<"unit" | "member">("unit");
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
      <PageHeader title={name} crumbLeaf={name} />

      <div className="stat-grid">
        <Stat icon={<Buildings />} value={committees.length} label="لجنة في قسمك" tone="brand" />
        <Stat icon={<UsersFour />} value={stats.people} label="عضوًا تحت قسمك" tone="success" />
        <Stat icon={<UserMinus />} value={stats.gaps} label="لجنة تنقصها قيادة" tone={stats.gaps ? "danger" : "success"} />
      </div>

      <div className="viewbar">
        <Segmented
          aria-label="طريقة العرض"
          value={view}
          onValueChange={(v) => setView(v as "unit" | "member")}
          items={[{ value: "unit", label: "اللجان" }, { value: "member", label: "الأعضاء" }]}
        />
        <Badge tone="info" variant="soft">عرضٌ فقط</Badge>
      </div>

      {view === "member" ? (
        // شريطُ الجدول ومرشّحاتُه من `MembersView` نفسها — فلا شريطان في شاشةٍ واحدة
        <MembersView
          headless
          readOnly
          members={members}
          emptyNote="لا أعضاء تحت قسمك بعد، يُسنَدون إلى لجانه من «تعيين المناصب»."
        />
      ) : (
        <>
          <Toolbar
            searchPlaceholder="ابحث عن عضو أو لجنة بالاسم…"
            search={query}
            onSearch={setQuery}
            actions={
              <>
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
              icon={<UsersFour />}
              title={q ? "لا مطابقون في قسمك" : "لا لجان في قسمك بعد"}
              description={q ? "جرّب اسمًا آخر. البحث يشمل اللجان وقادتها ونوّابها وأعضاءها." : "تُنسَب اللجان إلى الأقسام في القاعدة، وتظهر هنا حالما تُنسَب أولاها."}
            />
          ) : (
            <div className="org-coms">
              {visible.map((c) => (
                <Committee key={c.id} c={c} q={q} open={open.has(c.id)} onToggle={() => toggle(c.id)} edit={false} onMeta={() => {}} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
