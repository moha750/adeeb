"use client";

import { Container } from "@adeeb/design-system";
import { LineageView } from "../../dashboard/members/structure/LineageView";
import { SpineView } from "../../dashboard/members/structure/SpineView";
import { CascadeView } from "../../dashboard/members/structure/CascadeView";
import type { CommitteeNode, CouncilBody, DepartmentNode, Holder, StructureModel } from "../../dashboard/members/structure/model";

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

// ===== بيانات وهميّة — تُشكّل الأنماط ذاتها التي يبنيها model.ts من صفوف القاعدة =====
const P = (name: string, roleAr: string, roleName = "committee_member"): Holder => ({ userId: name, name, avatar: null, gender: null, roleName, roleAr, committeeId: null, departmentId: null });
const com = (id: number, name: string, kind: "operational" | "admin", leader: Holder | null, members: Holder[], deputy: Holder | null = null, hr: Holder | null = null, qa: Holder | null = null): CommitteeNode =>
  ({ id, name, kind, desc: null, link: null, leader, deputy, hrOverseer: hr, qaOverseer: qa, members, total: (leader ? 1 : 0) + (deputy ? 1 : 0) + members.length });
const dept = (id: number, name: string, head: Holder | null, coms: CommitteeNode[]): DepartmentNode =>
  ({ id, name, desc: null, link: null, head, committees: coms, total: coms.reduce((s, c) => s + c.total, 0) });

const administrative: CouncilBody & { committees: CommitteeNode[] } = {
  id: "administrative", name: "المجلس الإداريّ", desc: null, link: null,
  headRoleName: "club_president", headRoleAr: "رئيس النادي", head: P("سارة العتيبي", "رئيس النادي"),
  seats: [], memberCount: 2, subordinateCount: 0,
  committees: [
    com(101, "لجنة الموارد البشريّة", "admin", P("نورة الشهري", "قائدة اللجنة", "committee_leader"), [P("ريّان", "عضو"), P("لمى", "عضو")]),
    com(102, "لجنة الضمان والجودة", "admin", null, [P("تركي", "عضو")]),
  ],
};

const executive: CouncilBody & { departments: DepartmentNode[] } = {
  id: "executive", name: "المجلس التنفيذيّ", desc: null, link: null,
  headRoleName: "exec_president", headRoleAr: "رئيس المجلس التنفيذيّ", head: P("خالد المطيري", "رئيس المجلس التنفيذيّ"),
  seats: [], memberCount: 2, subordinateCount: 0,
  departments: [
    dept(1, "قسم الإعلام والتصميم", P("ليان القحطاني", "منسّق القسم", "department_head"), [
      com(1, "لجنة التصميم", "operational", P("هند العمري", "قائدة اللجنة", "committee_leader"), [P("ريم السالم", "عضو"), P("فهد الحربي", "مصمّم", "designer")], P("سلمى النعيمي", "النائب", "deputy_committee_leader"), P("عبدالله الغامدي", "مشرف الموارد", "hr_admin_member"), null),
      com(2, "لجنة التصوير", "operational", P("فيصل الدوسري", "قائد اللجنة", "committee_leader"), [P("ماجد", "عضو")]),
      com(3, "لجنة السوشال ميديا", "operational", null, [P("ريما", "عضو")]),
    ]),
    dept(2, "قسم الفعاليّات", P("ريم السالم", "منسّق القسم", "department_head"), [
      com(4, "لجنة التنظيم", "operational", P("عبدالله الغامدي", "قائد اللجنة", "committee_leader"), [P("سعد", "عضو"), P("صالح", "عضو")]),
      com(5, "لجنة الاستقبال", "operational", P("سلمى النعيمي", "قائدة اللجنة", "committee_leader"), [P("طيف", "عضو")]),
    ]),
    dept(3, "قسم العلاقات", null, [
      com(6, "لجنة الشراكات", "operational", P("ماجد الحربي", "قائد اللجنة", "committee_leader"), [P("علي", "عضو")]),
    ]),
  ],
};

const mock: StructureModel = {
  administrative, executive,
  stats: { councils: 2, administrations: 2, departments: 3, committees: 6, assignments: 0, people: 0 },
  anomalies: [],
};

export default function StructureUIPage() {
  return (
    <main className="py-16">
      <Container className="max-w-5xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Component · Tree · 3 Designs</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">الشجرة — ثلاثة تصاميم متطوّرة</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          مبدأ الشجرة نفسه، ثلاث لغات: <b>الأنساب</b> (موصولة) · <b>المِحوَر</b> (مُزاح) · <b>الأعمدة</b> (متتالٍ).
          كلّها المكوّنات الحقيقيّة من نظام التصميم، تفاعليّة — جرّب الطيّ والتمرير والتنقّل.
        </p>

        <div className="mt-12 space-y-14">
          <section>
            <Lab>تصميم ١ — الأنساب (شجرة موصولة · مرّر لإضاءة النسب، انقر للطيّ)</Lab>
            <LineageView model={mock} />
          </section>
          <section>
            <Lab>تصميم ٢ — المِحوَر (outline مُزاح · اطوِ الأقسام)</Lab>
            <SpineView model={mock} />
          </section>
          <section>
            <Lab>تصميم ٣ — الأعمدة (تنقّل متتالٍ · اختر عمودًا بعد عمود)</Lab>
            <CascadeView model={mock} />
          </section>
        </div>
      </Container>
    </main>
  );
}
