import { actingLine, rankFor } from "@/lib/positionLabel";
import type { CommitteeNode, Holder, StructureModel } from "../dashboard/members/structure/model";

/**
 * **هيكلةُ أدِيب كما تُقال للناس، بناءً جديدًا** (٢٠٢٦-١١-٢١، محمد: «نحتاج هدمه بالكامل وبناءه من جديد»).
 * دالّةٌ خالصةٌ بلا قاعدة، من نموذج غرفة الهيكلة نفسِه (`buildStructure`)، تقول ما اختاره محمد للصفحة:
 * - **المجلسان ومن يجلس فيهما**: مقاعدُ كلّ مجلسٍ من القاعدة (`membership_kind = member`)، فارغةً أو مشغولة.
 * - **المشرفون على كلّ لجنة**: مقعدان لكلّ لجنة، من الموارد البشريّة ومن الضمان والجودة، فارغين أو مشغولين.
 * - **أعضاءُ كلّ لجنةٍ بأسمائهم**، و**تعريفُ كلّ وحدة** (`description`).
 * (كان الشكلُ السابق `shape.ts` يُسقط المشرفين والتعريفات عمدًا، فعدل محمد عن ذلك.)
 */

export type OrgPerson = {
  id: string;
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  /** صفحتُه العلنيّة `/m/<slug>` إن كانت له */
  slug: string | null;
  /** «تكليفًا» لمن يشغل مقعده تكليفًا */
  acting: boolean;
};

/** مقعدٌ يُقال فارغًا كان أو مشغولًا: الفارغُ «لم يُعيَّن» أو «لم يُنتخب» بحسب طريق شغله */
export type OrgSeat = { person: OrgPerson | null; elected: boolean };

export type OrgUnit = {
  id: number;
  kind: "administration" | "committee";
  name: string;
  desc: string | null;
  leader: OrgSeat;
  /** للّجان وحدها مقعدُ نائب */
  deputy: OrgSeat | null;
  /** للّجان وحدها: مشرفٌ من كلّ إدارة (`from` اسمُ الإدارة) */
  supervisors: { from: string; seat: OrgSeat }[];
  members: OrgPerson[];
  /** رمزُ الوحدة كما اختارته الإدارة (`UnitIcon`)، أو لا رمز */
  icon?: string | null;
};

export type OrgDepartment = { id: number; name: string; desc: string | null; head: OrgSeat; units: OrgUnit[]; icon?: string | null };

export type OrgCouncilSeat = { title: string; head: boolean; holders: OrgPerson[]; elected: boolean };

/** `head`: رئيسُ المجلس ولقبُ مقعده — رئيسُ المجلس التشغيليّ مقعدُه في الإداريّ (الرئيسُ التنفيذيّ)، فلا يظهر في مقاعد التشغيليّ */
export type OrgCouncil = { id: string; name: string; desc: string | null; head: OrgPerson | null; headTitle: string; seats: OrgCouncilSeat[] };

export type PubOrg = {
  administrative: OrgCouncil & { units: OrgUnit[] };
  executive: OrgCouncil & { departments: OrgDepartment[] };
  stats: { administrations: number; departments: number; committees: number; people: number };
};

/** اسمُ كلّ إدارةٍ مُشرِفة بدور أعضائها — يُقرأ من النموذج لا يُحفر */
const SUPERVISING: { role: "hrOverseer" | "qaOverseer"; memberRole: string }[] = [
  { role: "hrOverseer", memberRole: "hr_admin_member" },
  { role: "qaOverseer", memberRole: "qa_admin_member" },
];

/** التعريفُ كما يُقرأ: أسطرُ القاعدة (`\r\n`) بلا أسطرٍ فارغةٍ بينها — كان سطرٌ فارغٌ بعد «وتشمل مهامّها:» يفتح فجوةً في النافذة */
const tidy = (t: string | null) => (t ? t.replace(/\r/g, "").replace(/\n{2,}/g, "\n").trim() || null : null);

export function toPublicOrg(model: StructureModel, slugOf: Map<string, string | null>, memberRoleUnit: Map<string, string>): PubOrg {
  const person = (h: Holder): OrgPerson => ({
    id: h.userId,
    name: h.name,
    avatar: h.avatar,
    gender: h.gender,
    slug: slugOf.get(h.userId) ?? null,
    acting: !!h.acting,
  });
  const byName = (a: OrgPerson, b: OrgPerson) => a.name.localeCompare(b.name, "ar");

  const unit = (n: CommitteeNode): OrgUnit => {
    const committee = n.kind === "operational";
    return {
      id: n.id,
      kind: committee ? "committee" : "administration",
      name: n.name,
      desc: tidy(n.desc),
      leader: { person: n.leader ? person(n.leader) : null, elected: n.leaderElected },
      deputy: committee ? { person: n.deputy ? person(n.deputy) : null, elected: true } : null,
      supervisors: committee
        ? SUPERVISING.map((s) => ({
            from: n[s.role]?.unitName ?? memberRoleUnit.get(s.memberRole) ?? "",
            seat: { person: n[s.role] ? person(n[s.role] as Holder) : null, elected: false },
          }))
        : [],
      members: n.members.map(person).sort(byName),
    };
  };

  const council = (c: StructureModel["administrative"] | StructureModel["executive"]): OrgCouncil => ({
    id: c.id,
    name: c.name,
    desc: tidy(c.desc),
    head: c.head ? person(c.head) : null,
    headTitle: c.headRoleAr,
    seats: c.seats.map((s) => ({ title: s.roleAr, head: s.isHead, holders: s.holders.map(person), elected: s.isElected })),
  });

  const units = model.administrative.committees.map(unit);
  const departments = model.executive.departments.map((d): OrgDepartment => ({
    id: d.id,
    name: d.name,
    desc: tidy(d.desc),
    head: { person: d.head ? person(d.head) : null, elected: d.headElected },
    units: d.committees.map(unit),
  }));

  return {
    administrative: { ...council(model.administrative), units },
    executive: { ...council(model.executive), departments },
    stats: {
      administrations: units.length,
      departments: departments.length,
      committees: departments.reduce((s, d) => s + d.units.length, 0),
      people: model.stats.people,
    },
  };
}

/** لقبُ صاحب المقعد بجنسه ولفظ تكليفه: «قائدة»، «قائد تكليفًا» */
export const rankOf = (title: string, p: OrgPerson) => actingLine(rankFor(title, p.gender), p.acting);
