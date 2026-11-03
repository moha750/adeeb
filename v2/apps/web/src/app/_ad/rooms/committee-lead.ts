import type { CommitteeNode, Holder } from "@/app/dashboard/members/structure/model";
import type { MyCommittee } from "@/app/dashboard/members/supervised/model";

/**
 * **قيادةُ لجنةٍ كما تقولها غرفُ الأشخاص** (محمد ٢٠٢٦-١١-٠٣): «من أشرف عليهم» و«قسمي» و«لجنتي» — اللجنةُ موضعٌ في غرفة أعضائها،
 * ومقاعدُ قيادتها صفٌّ فوق كروتهم (`AdSeats`). شكلٌ واحدٌ خفيفٌ لمصدرين: عقدةُ الهيكلة (`CommitteeNode`، القسمُ واللجنة) ولجنةُ
 * المشرف (`MyCommittee`).
 */
export type SeatPerson = {
  id: string; name: string; avatar: string | null; gender: "male" | "female" | null;
  /** منذ متى في المقعد، وأهو تكليف — سطرُ «منذ…» تحت الاسم */
  since?: string | null; acting?: boolean;
};
export type CommitteeLead = {
  id: number;
  name: string;
  leader: SeatPerson | null;
  /** أمنتخَبٌ مقعدُ قيادتها — لغةُ الشاغر: «لم يُنتخب بعد» أو «لم يُعيَّن بعد» */
  leaderElected?: boolean;
  deputy: SeatPerson | null;
  /** قسمُها («قسم الإنتاج الإعلامي») — سطرُ القائد والنائب الأوّل كما إدارةُ المشرف سطرُه (محمد ٢٠٢٦-١١-٠٣: «الاتّساقُ البصريّ») */
  dept?: string | null;
  /** مشرفوها باسم إدارتهم كاملًا («إدارة الضمان والجودة»، محمد ٢٠٢٦-١١-٠٣) — وللمشرف نفسِه مقعدُه ونظيرُه. */
  supervisors: { unit: string; person: SeatPerson | null }[];
};
/** مقعدُ رأس الوحدة فوق لجانها (منسّقُ القسم في «قسمي»). */
export type HeadSeat = { title: string; person: SeatPerson | null; /** اسمُ الوحدة: «قيادة قسم الإنتاج الإعلامي» */ unit: string };

export const seatOf = (h: Holder | null | undefined): SeatPerson | null =>
  h ? { id: h.userId, name: h.name, avatar: h.avatar, gender: h.gender, since: h.acting?.since ?? h.since ?? null, acting: !!h.acting } : null;
const HR = "إدارة الموارد البشرية";
const QA = "إدارة الضمان والجودة";

export function leadFromNode(c: CommitteeNode, dept?: string | null): CommitteeLead {
  return {
    id: c.id,
    name: c.name,
    dept: dept ?? null,
    leader: seatOf(c.leader),
    leaderElected: c.leaderElected,
    deputy: seatOf(c.deputy),
    supervisors: [
      { unit: c.hrOverseer?.unitName ?? HR, person: seatOf(c.hrOverseer) },
      { unit: c.qaOverseer?.unitName ?? QA, person: seatOf(c.qaOverseer) },
    ],
  };
}

/** ولجنةُ المشرف: هو نفسُه مقعدُ إدارته («أنت»)، ونظيرُه مقعدُ الأخرى — المواردُ أوّلًا كما في عقدة الهيكلة */
export function leadFromMine(c: MyCommittee, self?: { unitName: string; person: SeatPerson; since?: (committeeId: number) => string | null }): CommitteeLead {
  const sups = [
    ...(self ? [{ unit: self.unitName, person: { ...self.person, since: self.since?.(c.id) ?? null } }] : []),
    ...(c.peer ? [{ unit: c.peer.unitName, person: seatOf(c.peer.holder) }] : []),
  ].sort((a, b) => Number(!a.unit.includes("الموارد")) - Number(!b.unit.includes("الموارد")));
  return { id: c.id, name: c.name, dept: c.dept, leader: seatOf(c.leader), deputy: seatOf(c.deputy), supervisors: sups };
}
