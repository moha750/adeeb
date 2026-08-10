"use client";

import { Container } from "@adeeb/design-system";
import { LineageView } from "../../dashboard/members/structure/LineageView";
import { SpineView } from "../../dashboard/members/structure/SpineView";
import { CascadeView } from "../../dashboard/members/structure/CascadeView";
import { MapView, type YouAre } from "../../dashboard/members/structure/MapView";
import type { CommitteeNode, CouncilBody, DepartmentNode, Holder, StructureModel } from "../../dashboard/members/structure/model";

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

// ===== بيانات وهميّة — تُشكّل الأنماط ذاتها التي يبنيها model.ts من صفوف القاعدة =====
const P = (name: string, roleAr: string, roleName = "committee_member"): Holder => ({ userId: name, name, avatar: null, gender: null, roleName, roleAr, committeeId: null, departmentId: null });
const com = (id: number, name: string, kind: "operational" | "admin", leader: Holder | null, members: Holder[], deputy: Holder | null = null, hr: Holder | null = null, qa: Holder | null = null, desc: string | null = null): CommitteeNode =>
  ({ id, name, kind, desc, link: null, leaderRoleAr: kind === "admin" ? "قائد الإدارة" : "قائد اللجنة", leaderElected: kind !== "admin", leader, deputy, hrOverseer: hr, qaOverseer: qa, members, total: (leader ? 1 : 0) + (deputy ? 1 : 0) + members.length });
const dept = (id: number, name: string, head: Holder | null, coms: CommitteeNode[], desc: string | null = null): DepartmentNode =>
  ({ id, name, desc, link: null, headRoleAr: "منسّق القسم", headElected: true, head, committees: coms, total: coms.reduce((s, c) => s + c.total, 0) });
const seat = (roleName: string, roleAr: string, holders: Holder[], isHead = false, isElected = false) =>
  ({ roleName, roleAr, isHead, isElected, voteWeight: 1, holders });

const president = P("سارة العتيبي", "رئيس النادي", "club_president");
const execPresident = P("خالد المطيري", "رئيس المجلس التنفيذيّ", "exec_president");
const hrLeader = P("نورة الشهري", "قائدة إدارة الموارد", "hr_committee_leader");

const administrative: CouncilBody & { committees: CommitteeNode[] } = {
  id: "administrative", name: "المجلس الإداريّ", desc: "يرسم سياسة النادي ويتابع تنفيذها، وتحته إدارتا الموارد البشريّة والضمان والجودة.", link: null,
  headRoleName: "club_president", headRoleAr: "رئيس النادي", head: president,
  seats: [
    seat("club_president", "رئيس النادي", [president], true),
    seat("hr_committee_leader", "قائد إدارة الموارد البشريّة", [hrLeader]),
    seat("qa_committee_leader", "قائد إدارة الضمان والجودة", []),
    seat("club_advisor", "المستشار", []),
  ],
  memberCount: 2, subordinateCount: 0,
  committees: [
    com(101, "لجنة الموارد البشريّة", "admin", hrLeader, [P("ريّان", "عضو"), P("لمى", "عضو")], null, null, null,
      "تُعنى بالأعضاء: ضمُّهم وتوزيعُهم ومتابعةُ حضورهم وإنذاراتهم وشهاداتهم."),
    com(102, "لجنة الضمان والجودة", "admin", null, [P("تركي", "عضو")], null, null, null,
      "تدقّق عمل اللجان وتقيس جودته، وتحفظ أثر ما يُنجَز."),
  ],
};

const executive: CouncilBody & { departments: DepartmentNode[] } = {
  id: "executive", name: "المجلس التنفيذيّ", desc: "يدير العمل اليوميّ: أقسامٌ تجمع لجانًا، ولكلّ لجنةٍ قائدها ونائبها وأعضاؤها.", link: null,
  headRoleName: "exec_president", headRoleAr: "رئيس المجلس التنفيذيّ", head: execPresident,
  seats: [
    seat("exec_president", "رئيس المجلس التنفيذيّ", [execPresident], true),
    seat("department_head", "منسّق القسم", [P("ليان القحطاني", "منسّق القسم", "department_head"), P("ريم السالم", "منسّق القسم", "department_head")], false, true),
    seat("committee_leader", "قائد اللجنة", [P("هند العمري", "قائدة اللجنة", "committee_leader")], false, true),
  ],
  memberCount: 2, subordinateCount: 0,
  departments: [
    dept(1, "قسم الإعلام والتصميم", P("ليان القحطاني", "منسّق القسم", "department_head"), [
      com(1, "لجنة التصميم", "operational", P("هند العمري", "قائدة اللجنة", "committee_leader"), [P("ريم السالم", "عضو"), P("فهد الحربي", "مصمّم", "designer")], P("سلمى النعيمي", "النائب", "deputy_committee_leader"), P("عبدالله الغامدي", "مشرف الموارد", "hr_admin_member"), null,
        "تصنع هويّة أديب البصريّة: شعارات الفعاليّات ومنشوراتها وقوالبها."),
      com(2, "لجنة التصوير", "operational", P("فيصل الدوسري", "قائد اللجنة", "committee_leader"), [P("ماجد", "عضو")], null, null, null,
        "توثّق فعاليّات النادي صورةً ومقطعًا، وتحفظ أرشيفها."),
      com(3, "لجنة السوشال ميديا", "operational", null, [P("ريما", "عضو")], null, null, null,
        "تدير حسابات النادي وتكتب محتواها وتتابع تفاعل الجمهور."),
    ], "مظلّةُ ما يُرى من أديب: التصميم والتصوير وحسابات التواصل."),
    dept(2, "قسم الفعاليّات", P("ريم السالم", "منسّق القسم", "department_head"), [
      com(4, "لجنة التنظيم", "operational", P("عبدالله الغامدي", "قائد اللجنة", "committee_leader"), [P("سعد", "عضو"), P("صالح", "عضو")], null, null, null,
        "تخطّط الفعاليّة من فكرتها إلى يومها: المكان والجدول والتنفيذ."),
      com(5, "لجنة الاستقبال", "operational", P("سلمى النعيمي", "قائدة اللجنة", "committee_leader"), [P("طيف", "عضو")], null, null, null,
        "تستقبل الحضور وتنظّم دخولهم وتقيس رضاهم."),
    ], "يصنع لقاءات أديب: تخطيطًا وتنفيذًا واستقبالًا."),
    dept(3, "قسم العلاقات", null, [
      com(6, "لجنة الشراكات", "operational", P("ماجد الحربي", "قائد اللجنة", "committee_leader"), [P("علي", "عضو")], null, null, null,
        "تبني جسور أديب مع الأندية والجهات الراعية."),
    ], "بابُ أديب إلى خارجه: الشراكات والرعاة والجهات."),
  ],
};

const mock: StructureModel = {
  administrative, executive,
  stats: { councils: 2, administrations: 2, departments: 3, committees: 6, assignments: 22, people: 18 },
  anomalies: [],
};

/** موضعُ قارئٍ وهميّ — ليُرى وسمُ «أنت هنا» وزرُّ «موقعي» في المعرض كما يراهما العضو. */
const you: YouAre = { committees: [1], departments: [1], councils: ["executive"], home: 1 };

export default function StructureUIPage() {
  return (
    <main className="py-16">
      <Container className="max-w-5xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Component, Tree, 3 Designs</p>
        <h1 className="mt-1 font-display text-4xl font-black text-content">الشجرة: ثلاثة تصاميم متطوّرة</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          مبدأ الشجرة نفسه، ثلاث لغات: <b>الأنساب</b> (موصولة)، <b>المِحوَر</b> (مُزاح)، <b>الأعمدة</b> (متتالٍ).
          كلّها المكوّنات الحقيقيّة من نظام التصميم، تفاعليّة. جرّب الطيّ والتمرير والتنقّل.
        </p>

        <div className="mt-12 space-y-14">
          <section>
            <Lab>المقترح: خريطة العضو (بحث، وصفُ الوحدة، مقاعدُ المجلس، أهلُ اللجنة، «أنت هنا»)</Lab>
            <MapView model={mock} you={you} />
          </section>
          <section>
            <Lab>تصميم ١: الأنساب (شجرة موصولة، مرّر لإضاءة النسب، انقر للطيّ)</Lab>
            <LineageView model={mock} />
          </section>
          <section>
            <Lab>تصميم ٢: المِحوَر (outline مُزاح، اطوِ الأقسام)</Lab>
            <SpineView model={mock} />
          </section>
          <section>
            <Lab>تصميم ٣: الأعمدة (تنقّل متتالٍ، اختر عمودًا بعد عمود)</Lab>
            <CascadeView model={mock} />
          </section>
        </div>
      </Container>
    </main>
  );
}
