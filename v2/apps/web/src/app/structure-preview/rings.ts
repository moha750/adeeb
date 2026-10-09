import { positionLine } from "@/lib/positionLabel";
import type { PubPerson, PubStructure, PubUnit } from "./data";

/**
 * **هندسةُ «حلقات الوجوه»** — معادةٌ للموازنة (٢٠٢٦-١٠-٠٩). القلبُ رئيسُ النادي، وكلُّ حلقةٍ تبعد
 * رتبة (المجلس الإداريّ، فالمنسّقون، فالقادةُ ونوابُهم، فالأعضاءُ صفوفًا)، والدائرةُ قطاعاتٌ لكلّ
 * قسمٍ قوسُه ولكلّ لجنةٍ قوسٌ داخله. والشخصُ يُوضع مرّةً في أقرب حلقةٍ يستحقّها.
 * الزوايا من الأعلى عكسَ عقارب الساعة.
 */

export type Placed = { key: string; p: PubPerson; x: number; y: number; size: number; ring: number; unit: string | null; line: string };
export type Sector = { key: string; name: string; a0: number; a1: number };
export type RingsLayout = { size: number; center: number; faces: Placed[]; sectors: Sector[]; guides: number[]; labelR: number; sealR: number };

const FACE = { core: 132, r1: 84, r2: 70, r3: 56, mem: 42 };
const RAD = { r1: 158, r2: 272, r3: 366, mem0: 452 };
const STEP = 48;
const PITCH = 47;
const HEAD_GAP = 66;
const GAP_GROUP = 0.075;
const GAP_UNIT = 0.022;

type Group = { key: string; name: string; head: PubPerson | null; units: PubUnit[] };

export function layoutRings(s: PubStructure): RingsLayout {
  const placed = new Set<string>();
  const faces: Omit<Placed, "x" | "y">[] = [];
  const pos: { a: number; r: number }[] = [];
  const put = (p: PubPerson, ring: number, size: number, a: number, r: number, unit: string | null, line: string) => {
    if (placed.has(p.id)) return;
    placed.add(p.id);
    faces.push({ key: `${ring}-${p.id}`, p, size, ring, unit, line });
    pos.push({ a, r });
  };

  const [core, ...seats] = s.administrative.seats;
  if (core) put(core, 0, FACE.core, 0, 0, null, core.title ?? "");
  seats.forEach((p, i) => put(p, 1, FACE.r1, (i / Math.max(seats.length, 1)) * Math.PI * 2 + Math.PI / Math.max(seats.length, 1), RAD.r1, null, p.title ?? ""));
  if (s.executive.head) put(s.executive.head, 1, FACE.r1, Math.PI, RAD.r1, null, s.executive.head.title ?? "");

  const groups: Group[] = [
    { key: "adm", name: s.administrative.name, head: null, units: s.administrative.units },
    ...s.executive.departments.map((d) => ({ key: `d${d.id}`, name: d.name, head: d.head, units: d.units })),
  ].filter((g) => g.units.length > 0 || g.head);

  const headsOf = (u: PubUnit) => [u.leader, u.deputy].filter((x): x is PubPerson => !!x && !placed.has(x.id));
  const minSpan = (u: PubUnit) => Math.max((headsOf(u).length * HEAD_GAP) / RAD.r3, PITCH / RAD.mem0, 0.07);
  const units = groups.flatMap((g) => g.units);
  const gaps = groups.length * GAP_GROUP + Math.max(units.length - groups.length, 0) * GAP_UNIT;
  const mins = units.map(minSpan);
  const free = Math.max(Math.PI * 2 - gaps - mins.reduce((a, b) => a + b, 0), 0);
  const weight = units.reduce((a, u) => a + u.members.length, 0) || 1;
  const spanOf = new Map(units.map((u, i) => [u.id, mins[i] + (free * u.members.length) / weight]));

  const sectors: Sector[] = [];
  let a = GAP_GROUP / 2;
  let maxR = RAD.r3;
  for (const g of groups) {
    const g0 = a;
    g.units.forEach((u, ui) => {
      if (ui > 0) a += GAP_UNIT;
      const span = spanOf.get(u.id) ?? 0.1;
      const u0 = a;
      const mid = u0 + span / 2;
      const ukey = `u${u.id}`;
      const unitLine = (p: PubPerson) => positionLine(p.title ?? "عضو", u.name) ?? u.name;
      const heads = headsOf(u);
      heads.forEach((h, hi) => put(h, 3, FACE.r3, mid + ((hi - (heads.length - 1) / 2) * HEAD_GAP) / RAD.r3, RAD.r3, ukey, unitLine(h)));
      const rest = u.members.filter((m) => !placed.has(m.id));
      let row = 0;
      let i = 0;
      while (i < rest.length) {
        const r = RAD.mem0 + row * STEP;
        const cap = Math.max(1, Math.floor((span * r) / PITCH));
        const n = Math.min(cap, rest.length - i);
        for (let k = 0; k < n; k++) put(rest[i + k], 4 + row, FACE.mem, u0 + ((k + 0.5) / n) * span, r, ukey, unitLine(rest[i + k]));
        maxR = Math.max(maxR, r);
        i += n;
        row += 1;
      }
      a = u0 + span;
    });
    if (g.head) put(g.head, 2, FACE.r2, (g0 + a) / 2, RAD.r2, null, positionLine(g.head.title, g.name) ?? g.name);
    sectors.push({ key: g.key, name: g.name, a0: g0, a1: a });
    a += GAP_GROUP;
  }

  const labelR = maxR + FACE.mem / 2 + 44;
  const sealR = labelR + 30;
  const size = Math.ceil((sealR + 24) * 2);
  const center = size / 2;
  return { size, center, faces: faces.map((f, i) => ({ ...f, ...xy(center, pos[i].r, pos[i].a) })), sectors, guides: [RAD.r1, RAD.r2, RAD.r3], labelR, sealR };
}

export function xy(c: number, r: number, a: number) {
  const q = (v: number) => Math.round(v * 100) / 100;
  return { x: q(c - r * Math.sin(a)), y: q(c - r * Math.cos(a)) };
}

/** قوسُ تسمية القسم، والنصفُ الأسفل معكوسٌ كي لا يُقرأ الاسمُ مقلوبًا. */
export function labelArc(c: number, r: number, a0: number, a1: number, lift: number): string {
  const bottom = Math.cos((a0 + a1) / 2) < 0;
  const rr = bottom ? r + lift : r;
  const p0 = xy(c, rr, a0);
  const p1 = xy(c, rr, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return bottom ? `M ${p0.x} ${p0.y} A ${rr} ${rr} 0 ${large} 0 ${p1.x} ${p1.y}` : `M ${p1.x} ${p1.y} A ${rr} ${rr} 0 ${large} 1 ${p0.x} ${p0.y}`;
}
