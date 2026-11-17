import type { Position, RawCommittee, RawCouncil, RawDept } from "../structure/model";

/**
 * **نموذجُ لوحة المقاعد** — أُخرج من `SeatBoard.tsx` (٢٠٢٦-١١-١٤) دالّةً خالصةً بلا رسم، فتقرؤه اللوحةُ القديمة وغرفةُ «تعيين المناصب»
 * على الهويّة الجديدة (`_ad/rooms/AssignmentsRoom.tsx`) من مصدرٍ واحد. بلا تغيير.
 */
/** بياناتُ الوحدة الوصفيّة معها (الوصف ورابط القروب)، تملأ نافذةَ «تعديل الوحدة» حين تُفتح. */
type UnitMeta = { icon: string | null; description: string | null; link: string | null };
export type SeatCommittee = UnitMeta & { id: number; name: string; lead: Position | null; dep: Position | null };
export type SeatDept = UnitMeta & { id: number | null; name: string; head: Position | null; committees: SeatCommittee[] };
/** المجلسان ببياناتهما الوصفيّة (الوصف ورابط القروب) لزرّ تعديلهما؛ والاسمُ من القاعدة. */
export type SeatCouncil = { id: string; name: string; description: string | null; link: string | null };
export type SeatBoardModel = { council: Position[]; depts: SeatDept[]; admin: SeatCouncil | null; ops: SeatCouncil | null };

/**
 * يجمع المقاعدَ المسطّحة (`buildPositions`) في بنيتها: المجلسُ، ثمّ الأقسامُ بترتيب عرضها ولجانُها.
 * ولجنةٌ تشغيليّةٌ بلا قسمٍ حيٍّ لا تسقط: تُجمع في كرتٍ أخير «لجانٌ بلا قسم».
 */
export function buildSeatBoard(positions: Position[], departments: RawDept[], committees: RawCommittee[], councils: RawCouncil[] = []): SeatBoardModel {
  const byKey = new Map(positions.map((p) => [p.key, p]));
  const scoped = /^(head|lead|dep)-/;
  const council = positions.filter((p) => !scoped.test(p.key));
  const ops = committees.filter((c) => c.council_id !== "administrative").sort((a, b) => a.id - b.id);
  const seatCom = (c: RawCommittee): SeatCommittee => ({
    id: c.id, name: c.committee_name_ar ?? `لجنة #${c.id}`, icon: c.icon ?? null, description: c.description, link: c.group_link, lead: byKey.get(`lead-${c.id}`) ?? null, dep: byKey.get(`dep-${c.id}`) ?? null,
  });
  const live = new Set(departments.map((d) => d.id));
  const depts: SeatDept[] = [...departments]
    .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
    .map((d) => ({
      id: d.id, name: d.name_ar ?? `قسم #${d.id}`, icon: d.icon ?? null, description: d.description, link: d.group_link, head: byKey.get(`head-${d.id}`) ?? null,
      committees: ops.filter((c) => c.department_id === d.id).map(seatCom),
    }));
  const orphans = ops.filter((c) => c.department_id == null || !live.has(c.department_id));
  if (orphans.length) depts.push({ id: null, name: "لجانٌ بلا قسم", icon: null, description: null, link: null, head: null, committees: orphans.map(seatCom) });
  const meta = (id: string, fallback: string): SeatCouncil | null => {
    const c = councils.find((x) => x.id === id);
    return c ? { id, name: c.name_ar ?? fallback, description: c.description, link: c.group_link } : null;
  };
  return { council, depts, admin: meta("administrative", "المجلس الإداري"), ops: meta("executive", "المجلس التشغيلي") };
}

