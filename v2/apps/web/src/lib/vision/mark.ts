import { arCount, type ArForms } from "@/lib/arabicCount";
import { hilal } from "./geometry";

const AR_LAYER: ArForms = ["طبقةٌ واحدة", "طبقتان", "طبقات", "طبقةً"];
const AR_TRACK: ArForms = ["مسارٌ واحد", "مساران", "مسارات", "مسارًا"];
const AR_PIECE: ArForms = ["قطعةٌ واحدة", "قطعتان", "قطع", "قطعةً"];
const AR_GOAL: ArForms = ["هدفٌ واحد", "هدفان", "أهداف", "هدفًا"];

/**
 * **علامةُ الرؤية** (محمد ٢٠٢٦-١١-٢٢: «لكلّ رؤيةٍ علامتها»، و«لو نحن صمّمناها؟») — بياناتٌ في الرؤية نفسِها (`visions.mark`):
 * - `hilal`: هلالُ الفسيفساء المبنيّ (`geometry.ts`) يتّسع لأيّ عددٍ من الأهداف.
 * - `svg`: رسمُ المصمّم من ملفٍّ رُفع في محرّر الرؤية (`svgMark.ts`): طبقةٌ لكلّ مسار، وقطعةٌ لكلّ هدفٍ بترتيبه. تُحفظ أشكالُه
 *   مساراتٍ مطلقةً بلا ألوانٍ ولا أصناف: الموقعُ يلوّنها بأدوار الهويّة (`.vz-tile`)، فالمضاءُ والباهتُ والوضعُ الداكن واحدٌ في كلّ علامة.
 *
 * وما يُرسم واحد: قطعٌ لكلٍّ منها طبقتُها (ترتيبُ مسارها) وموضعُها (ترتيبُ هدفها)، فلا يعرف `VisionMark` من أين جاءت.
 */
export type VisionMarkShape =
  | { kind: "hilal" }
  | { kind: "svg"; viewBox: string; layers: string[][]; file?: string };

export type MarkTile = { layer: number; index: number; d: string };
export type MarkGeometry = { viewBox: string; tiles: MarkTile[] };

export const HILAL: VisionMarkShape = { kind: "hilal" };

export function isMarkShape(x: unknown): x is VisionMarkShape {
  if (!x || typeof x !== "object") return false;
  const m = x as { kind?: unknown; viewBox?: unknown; layers?: unknown };
  if (m.kind === "hilal") return true;
  return m.kind === "svg" && typeof m.viewBox === "string" && Array.isArray(m.layers)
    && m.layers.every((l) => Array.isArray(l) && l.every((d) => typeof d === "string"));
}

/** القطعُ من العلامة، و`counts` عددُ أهداف كلّ مسار (الهلالُ يُبنى منه؛ والمرسومةُ ثابتةٌ برسمها) */
export function markGeometry(mark: VisionMarkShape | null | undefined, counts: number[]): MarkGeometry {
  if (!mark || mark.kind === "hilal") return hilal(counts);
  return {
    viewBox: mark.viewBox,
    tiles: mark.layers.flatMap((l, layer) => l.map((d, index) => ({ layer, index, d }))),
  };
}

/** عددُ قطع كلّ طبقةٍ في العلامة المرسومة — يُقابَل بعدد أهداف كلّ مسار */
export const markCounts = (mark: VisionMarkShape): number[] | null => (mark.kind === "svg" ? mark.layers.map((l) => l.length) : null);

/**
 * **ما لا يطابق** بين العلامة المرسومة والأهداف، جملةً تُقال لكاتب المسوّدة (`name` اسمُ المسار في الجمل: «مسار التمكين») — و`null` حين تطابق (والهلالُ يطابق دائمًا).
 * الطبقةُ الأولى للمسار الأوّل، وفي كلّ طبقةٍ قطعٌ بعدد أهداف مسارها.
 */
export function markMismatch(mark: VisionMarkShape, tracks: { name: string; goals: number }[]): string | null {
  if (mark.kind === "hilal") return null;
  if (mark.layers.length !== tracks.length) {
    return `في العلامة ${arCount(mark.layers.length, AR_LAYER)}، وفي الرؤية ${arCount(tracks.length, AR_TRACK)}: طبقةٌ لكلّ مسار.`;
  }
  const bad = tracks.map((t, i) => ({ t, have: mark.layers[i].length })).filter((x) => x.have !== x.t.goals);
  if (!bad.length) return null;
  return bad.map((x) => `طبقة ${x.t.name} فيها ${arCount(x.have, AR_PIECE)}، وفيه ${arCount(x.t.goals, AR_GOAL)}`).join("، ") + ".";
}

/** اسمُ العلامة مضافًا («هلال رؤية الهلال»، «قطعته في الهلال»): المعرّفُ بـ«ال» يسقط تعريفُه في الإضافة */
export const markConstruct = (noun: string) => noun.trim().replace(/^ال/, "");
