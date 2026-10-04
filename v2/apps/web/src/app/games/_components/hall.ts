/**
 * **أدواتُ الصالة الصغيرة** — الأعدادُ بأرقامٍ غربيّة (بكسلُ Rooyin يرسمها كما في اللعبة)،
 * وتمييزُ العدد العربيّ: واحدٌ ومثنًّى، وجمعٌ للعشرة وما دونها، ومفردٌ منصوبٌ لما فوقها.
 * وحدةٌ مستقلّةٌ بلا "use client" لأنّ الصالةَ ترسمها في الخادم أيضًا.
 */
const fmt = new Intl.NumberFormat("en-US");
export const num = (x: number) => fmt.format(x);

type Forms = { one: string; two: string; few: string; many: string };
export function countAr(k: number, f: Forms): string {
  if (k === 1) return f.one;
  if (k === 2) return f.two;
  const t = k % 100;
  return `${num(k)} ${t >= 3 && t <= 10 ? f.few : f.many}`;
}

export const PLAYERS: Forms = { one: "لاعبٌ واحد", two: "لاعبان", few: "لاعبين", many: "لاعبًا" };
export const RUNS: Forms = { one: "جولةٌ واحدة", two: "جولتان", few: "جولات", many: "جولة" };

/** وحداتُ «أعلى النقاط»: المسافةُ بالمتر، والأكوابُ والنقاطُ عدًّا. */
export type ScoreUnit = "m" | "cups" | "pts";
const CUPS: Forms = { one: "كوبٌ واحد", two: "كوبان", few: "أكواب", many: "كوبًا" };
const PTS: Forms = { one: "نقطةٌ واحدة", two: "نقطتان", few: "نقاط", many: "نقطة" };
export function score(unit: ScoreUnit, v: number): string {
  if (unit === "m") return `${num(v)} م`;
  return countAr(v, unit === "cups" ? CUPS : PTS);
}

/** العدّادُ بساعاتٍ لا تُطوى في أيّام (مسابقاتُنا يومان أو ثلاثة): ٤٧:٥٩:٥٩. */
export function clock(ms: number | null): string {
  if (ms == null) return "--:--:--";
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}
