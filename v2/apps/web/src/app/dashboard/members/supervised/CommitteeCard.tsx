"use client";

import { Badge, Card } from "@adeeb/design-system";
import { ArrowSquareOut } from "@/app/_components/glyphs";
import { Person, Vacant } from "../structure/tree";
import type { Holder } from "../structure/model";
import { membersLabel, type MyCommittee } from "./model";

/**
 * كرت اللجنة المُشرَف عليها — **قراءةٌ لا إدارة**: يقول من يقودها ومن ينوبه ومن نظيرُك فيها
 * وكم عضوًا تحتك، ويفتح قروبها. ولا فعلَ فيه: قائد اللجنة ونائبها **خارج سلطة المشرف**
 * عمدًا (`membership_authority`)، فزرٌّ عليهما وعدٌ تردّه القاعدة. الأفعال تبقى حيث تقول
 * القاعدة نعم — في سجلّ الأعضاء وحده.
 *
 * بلا تنسيقٍ شارد (ق١، المسار الأوّل): بدنُه `.pcard-*` كسائر الكروت، وصفوفُ القيادة
 * `.org-subrow` + شريحة `Person` — العائلتان في المكتبة، تُستعملان كما هما.
 *
 * النغمة تقول اكتمال القيادة لا حجم اللجنة: brand = قائدٌ ونائب · warning = ينقصها أحدهما.
 */
export function CommitteeCard({ committee: c }: { committee: MyCommittee }) {
  const seats: { label: string; holder: Holder | null; vacant: string }[] = [
    { label: "القائد", holder: c.leader, vacant: "بلا قائد" },
    { label: "النائب", holder: c.deputy, vacant: "بلا نائب" },
    ...(c.peer ? [{ label: `مشرف ${peerShort(c.peer.unitName)}`, holder: c.peer.holder, vacant: "بلا مشرف" }] : []),
  ];

  return (
    <Card tone={c.leader && c.deputy ? "brand" : "warning"} className="pcard">
      <div className="pcard-id">
        <h3 className="pcard-role">{c.name}</h3>
        <span className="pcard-scope">{c.dept ?? "بلا قسم"}</span>
      </div>

      <div className="pcard-chips">
        <Badge tone="info" variant="soft">{membersLabel(c.members.length)}</Badge>
        {c.leader ? null : <Badge tone="danger" variant="soft">بلا قائد</Badge>}
        {c.deputy ? null : <Badge tone="warning" variant="soft">بلا نائب</Badge>}
      </div>

      <div className="pcard-holders">
        {seats.map((s) => (
          <div key={s.label} className="pcard-holder org-subrow">
            <span className="org-sublbl">{s.label}</span>
            {s.holder ? <Person h={s.holder} /> : <Vacant label={s.vacant} />}
          </div>
        ))}
      </div>

      {!c.link ? null : (
        // رابطٌ بثوب الزرّ (سابقةٌ قائمة في اللوحة) — الوجهة خارجيّة فهو `<a>` لا زرّ
        <a className="abtn abtn-ghost abtn-sm" href={c.link} target="_blank" rel="noreferrer">
          <ArrowSquareOut size={16} aria-hidden /> قروب اللجنة
        </a>
      )}
    </Card>
  );
}

/** «إدارة الضمان والجودة» ⇐ «الضمان» — تسمية المقعد لا تحتمل جملةً كاملة. */
function peerShort(unitName: string): string {
  return unitName.replace(/^إدارة\s+/, "").split(/\s+و/)[0];
}
