"use client";

/**
 * **لوحة المقاعد** — معاينةُ تبويب «تعيين المناصب» بالمكوّن الحيّ نفسه (`SeatBoard`)، ببياناتٍ مخترَعة.
 *
 * اعتمدها المالك ٢٠٢٦-١٠-١٠ بعد سبع جولاتٍ في هذه الصفحة:
 * - **الأولى** ثلاثُ أفكار (خريطة المقاعد، صفّ الصورة، بطاقة المقعد): قبِل فكرتَها وردّ رسمَها.
 * - **الثانية والثالثة** هيئاتٌ (الحالي، الشارات، الليل، الكتيّب): بقيت البنيةُ، وأخذ من الشارات زرَّ
 *   «تعيين» الذي ينزل منه القرار، وطلب: **الأزرار كلّها ظاهرة لا في ثلاث نقاط**.
 * - **الرابعة** ذيلُ أفعالٍ ظاهرٌ لكلّ مقعد: «هذا اليو اكس عظيم».
 * - **الخامسة** لوحاتُ ألوان (هادئ، طبقات، غسق): ليست ما قصد. فضرب مثلًا: **رأسُ الكرت بلونٍ صلبٍ
 *   فيه نقشٌ وأيقونة**، وقال: «تطويراتٌ لا تعديلات».
 * - **السادسة والسابعة** على منهجه: أيقونةُ الرتبة، وشارةُ الحالة على الوجه، وشريطُ مدّة التكليف، ووجهُ
 *   صاحب المقعد المجمَّد، وشارةُ الفجوة في عنوان اللجنة. ثمّ ملاحظاته: المجلسُ بتراتبيّته (الرئيس، فالتنفيذيّ،
 *   فالقائدان)، والنقشُ بمقياسه الأوّل يتكرّر عرضًا، والوجهُ الصغيرُ بألوانه لا رماديًّا، والهادمُ أحمرُ نصًّا
 *   وأيقونةً معًا.
 *
 * - **بعد الاعتماد** (٢٠٢٦-١٠-١٠): زرُّ «تعديل» صغيرٌ في رأس كلّ قسمٍ وبجانب اسم كلّ لجنةٍ يفتح نافذةً واحدة
 *   (الأيقونة، الوصف، رابط القروب)، والمنصبان الثابتان (الرئيس والتنفيذيّ) بشريط «منصبٌ ثابت» مكانَ أزرارهما.
 *   ثمّ (٢٠٢٦-١٠-١١) «إضافة لجنة» في ذيل كلّ قسم و«إضافة قسم» بعد الأقسام، بالنافذة نفسها وحقلِ اسم،
 *   وعنوانُ «المجلس التشغيلي» بين كرت المجلس الإداريّ والأقسام، وزرُّ تعديلٍ للمجلسين (الوصف والرابط).
 *   النافذةُ هنا لا تحفظ.
 *
 * وأنماطُه في المكتبة (`.seat-*` و`.acard-header-pattern`)، فما يُرى هنا هو ما في الصفحة الحيّة.
 * والأسماءُ مخترَعة: `/ui` عامّة.
 */
import { useState } from "react";
import { Container } from "@adeeb/design-system";
import { SeatBoard, buildSeatBoard, type SeatActions } from "../../dashboard/members/assignments/SeatBoard";
import type { Holder, Position, RawCommittee, RawCouncil, RawDept } from "../../dashboard/members/structure/model";
import { UnitEditModal, type EditableUnit } from "../../dashboard/members/assignments/UnitEditModal";

const DAY = 86_400_000;
const isoIn = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
const isoAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const H = (name: string, gender: "male" | "female", extra: Partial<Holder> = {}): Holder => ({
  userId: name, name, avatar: null, gender, roleName: "", roleAr: "", unitName: null,
  committeeId: null, departmentId: null, rowId: null, acting: null, frozen: null, ...extra,
});
const P = (key: string, roleName: string, roleAr: string, holders: Holder[], extra: Partial<Position> = {}): Position => ({
  key, roleName, roleAr, scope: "", council: "executive", committeeId: null, departmentId: null, holders,
  singleton: true, elected: true, voteWeight: 1, councilMember: true, prerequisite: null, prerequisiteAr: null,
  requiresMembership: true, actable: true, ...extra,
});
const admin = { council: "administrative" as const };

const DEPTS: RawDept[] = [
  { id: 1, name_ar: "قسم الإنتاج الإعلامي", display_order: 1, description: "يصنع مرئيّات النادي ويغطّي فعالياته", group_link: "https://chat.whatsapp.com/example", icon: "film-slate" },
  { id: 2, name_ar: "قسم التواصل المجتمعي", display_order: 2, description: null, group_link: null, icon: "handshake" },
  { id: 3, name_ar: "قسم صناعة المحتوى", display_order: 3, description: null, group_link: null, icon: "pen-nib" },
  { id: 4, name_ar: "قسم نظم المعلومات", display_order: 4, description: null, group_link: null, icon: "cpu" },
];
const com = (id: number, name: string, dept: number, icon: string): RawCommittee => ({
  id, committee_name_ar: name, icon, department_id: dept, council_id: "executive", leader_role_name: "committee_leader",
  member_role_name: "committee_member", description: null, group_link: null,
});
const COMMITTEES: RawCommittee[] = [
  com(5, "لجنة التصوير", 1, "camera"), com(6, "لجنة التصميم", 1, "paint-brush"), com(7, "لجنة التسويق", 1, "megaphone"),
  com(1, "لجنة الفعاليات", 2, "calendar-star"), com(4, "لجنة السفراء", 2, "identification-badge"),
  com(2, "لجنة الرواة", 3, "microphone"), com(3, "لجنة التأليف", 3, "feather"),
  com(18, "لجنة التقارير والأرشفة", 4, "archive"), com(24, "لجنة البرمجة", 4, "code"),
];

const POSITIONS: Position[] = [
  P("club_president", "club_president", "رئيس أدِيب", [H("عبد الله فهد المطيري", "male")], admin),
  P("executive_council_president", "executive_council_president", "الرئيس التنفيذي", [H("هند سالم الزهراني", "female")], admin),
  P("hr_committee_leader", "hr_committee_leader", "قائد إدارة الموارد البشرية", [H("منى عادل الغامدي", "female")], admin),
  P("qa_committee_leader", "qa_committee_leader", "قائد إدارة الضمان والجودة", [
    H("ماجد علي البقمي", "male", { acting: { until: isoIn(48), awaits: null, since: isoAgo(14) } }),
  ], admin),
  P("head-1", "department_head", "منسّق", [H("جود خالد العنزي", "female")]),
  P("head-2", "department_head", "منسّق", [H("تركي عبد الله السبيعي", "male")]),
  P("head-3", "department_head", "منسّق", [H("رهف عمر الجهني", "female")]),
  P("head-4", "department_head", "منسّق", []),
  P("lead-5", "committee_leader", "قائد", [H("نورة سعد الحربي", "female")]),
  P("dep-5", "deputy_committee_leader", "نائب", [
    H("سديم بندر القحطاني", "female", { frozen: { until: isoIn(30) } }),
    H("ريم سعود العتيبي", "female", { acting: { until: null, awaits: "سديم بندر القحطاني", since: isoAgo(5) } }),
  ]),
  P("lead-6", "committee_leader", "قائد", []),
  P("dep-6", "deputy_committee_leader", "نائب", [H("لمى ناصر الشهري", "female")]),
  P("lead-7", "committee_leader", "قائد", []),
  P("dep-7", "deputy_committee_leader", "نائب", []),
  P("lead-1", "committee_leader", "قائد", [H("شهد فيصل العمري", "female")]),
  P("dep-1", "deputy_committee_leader", "نائب", [H("دانة ماجد الرشيد", "female")]),
  P("lead-4", "committee_leader", "قائد", [H("يزن أحمد الخالدي", "male")]),
  P("dep-4", "deputy_committee_leader", "نائب", [H("فيصل ناصر الدوسري", "male", { frozen: { until: isoIn(60) } })]),
  P("lead-2", "committee_leader", "قائد", [H("غدير حسن الأحمد", "female")]),
  P("dep-2", "deputy_committee_leader", "نائب", [
    H("عبد الرحمن خالد الشيخ", "male", { acting: { until: isoIn(9), awaits: null, since: isoAgo(21) } }),
  ]),
  P("lead-3", "committee_leader", "قائد", [H("مها سليمان القرني", "female")]),
  P("dep-3", "deputy_committee_leader", "نائب", []),
  P("lead-18", "committee_leader", "قائد", []),
  P("dep-18", "deputy_committee_leader", "نائب", []),
  P("lead-24", "committee_leader", "قائد", [H("بسمة طلال العتيبي", "female")]),
  P("dep-24", "deputy_committee_leader", "نائب", []),
];

const noop = () => {};
const COUNCILS: RawCouncil[] = [
  { id: "administrative", name_ar: "المجلس الإداري", head_role_name: "club_president", description: "الجهة الإشرافية العليا للنادي", group_link: "https://chat.whatsapp.com/example" },
  { id: "executive", name_ar: "المجلس التشغيلي", head_role_name: "executive_council_president", description: "يضمّ الأقسام واللجان", group_link: "https://chat.whatsapp.com/example" },
];
const MODEL = buildSeatBoard(POSITIONS, DEPTS, COMMITTEES, COUNCILS);

export default function SeatsPreview() {
  const [edit, setEdit] = useState<EditableUnit | null>(null);
  const actions: SeatActions = { onAssign: noop, onReplace: noop, onRemove: noop, onAct: noop, onExtend: noop, onEnd: noop, onEditUnit: setEdit, onAddUnit: setEdit };
  return (
    <Container className="space-y-8 py-16">
      <h1 className="font-display text-4xl font-black text-content">تعيين المناصب</h1>
      <SeatBoard model={MODEL} actions={actions} />
      <UnitEditModal key={edit ? `unit-${edit.kind}-${edit.id ?? `new-${edit.parent?.id ?? ""}`}` : "unit-none"} unit={edit} busy={false}
        onClose={() => setEdit(null)} onSubmit={() => setEdit(null)} />
    </Container>
  );
}
