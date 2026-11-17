import { actingLine, rankFor } from "@/lib/positionLabel";
import type { CommitteeNode, Holder, StructureModel } from "../dashboard/members/structure/model";

/**
 * **شكلُ الهيكلة العلنيّ** — أُخرج من `data.ts` (٢٠٢٦-١١-١٤) دالّةً خالصةً بلا قاعدة، فيرسم الشجرةَ المعتمدة («المخطوطة») من
 * نموذج الغرفة نفسِه مصدران: الصفحةُ العلنيّة بمفتاح الزائر، وغرفةُ «هيكلة أدِيب» في البوّابة بنموذجها الكامل. والقصُّ قصُّها كما كان.
 */

export type PubPerson = {
  id: string;
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  /** المسمّى بجنس صاحبه — «قائدة» · «منسّق» · «رئيسة أدِيب». فارغٌ للعضو داخل لجنته. */
  title: string | null;
  /** صفحتُه العلنيّة `/m/<slug>`. */
  slug: string | null;
};

export type PubUnit = {
  id: number;
  name: string;
  leader: PubPerson | null;
  deputy: PubPerson | null;
  members: PubPerson[];
  total: number;
};

export type PubDepartment = { id: number; name: string; head: PubPerson | null; units: PubUnit[]; total: number };

export type PubStructure = {
  /** المجلسُ الإداريّ: مقاعدُه المشغولة (رئيسُه أوّلُها دائمًا) وإدارتاه. */
  administrative: { name: string; seats: PubPerson[]; units: PubUnit[] };
  /** المجلسُ التنفيذيّ: رئيسُه وأقسامُه بلجانها. */
  executive: { name: string; head: PubPerson | null; departments: PubDepartment[] };
};

/** النموذجُ (`buildStructure`) مقصوصًا إلى ما تُرسم به الشجرة، و`slugOf` صفحةُ كلّ شخصٍ العلنيّة (`/m/<slug>`) إن كانت له. */
export function toPublicStructure(model: StructureModel, slugOf: Map<string, string | null>): PubStructure {
  const person = (h: Holder, title: string | null): PubPerson => ({
    id: h.userId,
    name: h.name,
    avatar: h.avatar,
    gender: h.gender,
    // والتكليف بلفظه (20261010): «قائد لجنة التسويق تكليفًا»؛ والعضو المكلَّف بلا رتبةٍ «تكليفًا» وحدها
    title: title ? actingLine(rankFor(title, h.gender), !!h.acting) : h.acting ? "تكليفًا" : null,
    slug: slugOf.get(h.userId) ?? null,
  });
  const byName = (a: PubPerson, b: PubPerson) => a.name.localeCompare(b.name, "ar");

  const unit = (n: CommitteeNode): PubUnit => ({
    id: n.id,
    name: n.name,
    leader: n.leader ? person(n.leader, n.leader.roleAr) : null,
    deputy: n.deputy ? person(n.deputy, n.deputy.roleAr) : null,
    members: n.members.map((m) => person(m, null)).sort(byName),
    total: n.total,
  });
  // كلُّ وحدةٍ قائمة تُعرض وإن خلت (٢٠٢٦-١٠-١٧، المالك): الهيكلُ تخطيطٌ ثابت لا يتبدّل بمن حضر —
  // «يدخل اليوم فلا يجد قائدًا للتقارير والأرشفة، ثمّ يدخل بعد أسبوعٍ فيرى العكس». والخالي يُرسم فارغًا.

  // رئيسُ المجلس أوّلًا (`isHead`) — الصفحةُ تضعه في القلب، فلا يُستنتَج من ترتيب الأدوار
  const seats = [...model.administrative.seats.filter((s) => s.isHead), ...model.administrative.seats.filter((s) => !s.isHead)]
    .flatMap((s) => s.holders.map((h) => person(h, s.roleAr)));

  const departments = model.executive.departments
    .map((dn): PubDepartment => {
      const units = dn.committees.map(unit);
      return { id: dn.id, name: dn.name, head: dn.head ? person(dn.head, dn.head.roleAr) : null, units, total: units.reduce((s, u) => s + u.total, 0) };
    });

  return {
    administrative: { name: model.administrative.name, seats, units: model.administrative.committees.map(unit) },
    executive: { name: model.executive.name, head: model.executive.head ? person(model.executive.head, model.executive.headRoleAr) : null, departments },
  };
}
