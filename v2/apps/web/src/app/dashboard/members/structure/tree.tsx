"use client";

// الأجزاء العرضيّة لشجرة هيكلة أديب — مصدرٌ واحد يستهلكه العارض (StructureView)
// ومعرض /ui/structure معًا (فلسفة المعرض: المكوّن الحقيقيّ نفسه، لا محاكاة).
// التنسيق كلّه من عائلة `.org-*` في المكتبة (components.css) — لا تنسيق شارد هنا.
import { Badge, matchesSearch } from "@adeeb/design-system";
import { CaretDown, PencilSimple, Users, Warning } from "@phosphor-icons/react";
import { Avatar } from "../../_components/Avatar";
import type { Holder, CommitteeNode, CouncilBody } from "./model";

// شريحة الشخص — أفتار + اسم + دور (اختياريّ)؛ نغمتا رتبة: gold للقيادة، steel للعضويّة.
export function Person({ h, role, tone }: { h: Holder; role?: boolean; tone?: "gold" | "steel" }) {
  return (
    <div className={"org-person" + (tone ? ` org-person-${tone}` : "")}>
      <Avatar name={h.name} src={h.avatar ?? undefined} gender={h.gender} size="sm" />
      <span className="org-person-tx"><b>{h.name}</b>{role ? <span>{h.roleAr}</span> : null}</span>
    </div>
  );
}

// منصبٌ شاغر — إشارة danger صريحة (لا يُخفى: «المستشار» منصبٌ قائم بلا شاغل، وإخفاؤه يكذب).
export const Vacant = ({ label }: { label: string }) => <span className="org-vacant"><Warning /> {label}</span>;

// زرّ تعديل البيانات الوصفيّة (وصف + رابط) — light للنسخة الزجاجيّة فوق ترويسة المجلس.
export const MetaBtn = ({ onClick, light }: { onClick: () => void; light?: boolean }) => (
  <button type="button" className={"org-meta" + (light ? " lt" : "")} onClick={onClick} aria-label="تعديل البيانات" title="تعديل الوصف والرابط"><PencilSimple /></button>
);

// المجلس هيئةٌ لا حاوية: مقاعده تُقرأ من القاعدة (roles.membership_kind='member')،
// ورئيسه من councils.head_role_name. أضِف دورًا عضوًا في القاعدة فيظهر هنا بلا شيفرة.
export function Seats({ body, q }: { body: CouncilBody; q: string }) {
  const match = (n: string) => matchesSearch(q, n);
  return (
    <div className="org-seats">
      {body.seats.map((s) => {
        const shown = s.holders.filter((h) => match(h.name));
        if (q !== "" && shown.length === 0) return null;
        return (
          <div key={s.roleName} className="org-seat">
            <span className="org-seat-lbl">
              {s.roleAr}
              {s.isHead ? <Badge tone="warning" variant="soft">يرأس المجلس</Badge> : null}
            </span>
            {shown.length ? (
              <div className="org-people">
                {shown.map((h, i) => <Person key={h.userId + i} h={h} tone={s.isHead ? "gold" : "steel"} />)}
              </div>
            ) : <Vacant label="شاغر" />}
          </div>
        );
      })}
    </div>
  );
}

// اللجنة — كرتٌ مطويّ: قائدها ونائبها ومشرفاها (للتشغيليّة) وأعضاؤها.
export function Committee({ c, q, open, onToggle, edit, onMeta }: {
  c: CommitteeNode; q: string; open: boolean; onToggle: () => void; edit: boolean; onMeta: () => void;
}) {
  const match = (n: string) => matchesSearch(q, n);
  const members = q === "" ? c.members : c.members.filter((m) => match(m.name));
  const expanded = q !== "" ? true : open;
  const isOp = c.kind === "operational";
  return (
    <div className="org-com">
      <div className="org-com-head">
        <button type="button" className="org-com-toggle" onClick={onToggle} aria-expanded={expanded}>
          <CaretDown className={"org-caret" + (expanded ? " on" : "")} />
          <span className="org-com-name">{c.name}</span>
        </button>
        {c.leader ? (
          <span className="org-com-leader"><Avatar name={c.leader.name} src={c.leader.avatar ?? undefined} gender={c.leader.gender} size="xs" /><span>{c.leader.name}</span></span>
        ) : (
          <span className="org-com-leader org-com-leaderless"><Warning /> بلا قائد</span>
        )}
        {edit ? <MetaBtn onClick={onMeta} /> : null}
        <Badge tone="neutral" variant="soft"><Users /> {c.total}</Badge>
      </div>
      {expanded ? (
        <div className="org-com-body">
          {c.deputy ? <div className="org-subrow"><span className="org-sublbl">النائب</span><Person h={c.deputy} /></div> : null}
          {isOp ? (
            <>
              <div className="org-subrow">
                <span className="org-sublbl">مشرف الموارد</span>
                {c.hrOverseer ? <Person h={c.hrOverseer} role /> : <span className="org-ov-vac">— يُسنَد من «تعيين المناصب»</span>}
              </div>
              <div className="org-subrow">
                <span className="org-sublbl">مشرف الضمان</span>
                {c.qaOverseer ? <Person h={c.qaOverseer} role /> : <span className="org-ov-vac">— يُسنَد من «تعيين المناصب»</span>}
              </div>
            </>
          ) : null}
          {members.length ? (
            <div className="org-people">{members.map((m, i) => <Person key={m.userId + i} h={m} role={m.roleName !== "committee_member"} />)}</div>
          ) : <p className="org-empty">{q ? "لا مطابقون هنا." : "لا أعضاء بعد."}</p>}
        </div>
      ) : null}
    </div>
  );
}
