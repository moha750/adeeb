import type { Capability, PermRole } from "./vocab";

/** فئةُ قدراتٍ بعنوانها العربيّ — تُبنى مرّةً في القشرة ويقرؤها التصميمان. */
export type CapGroup = { key: string; label: string; caps: Capability[] };

/**
 * مِقوَد اللوحة — الحالةُ والكتابةُ في القشرة وحدها، والتصميمان يعرضان وينادِيان.
 * فتبديلُ الشكل لا يبدّل السلوك: منحٌ واحدٌ وارتدادٌ واحدٌ ورسالةٌ واحدة مهما كان الشكل.
 */
export type PermCtl = {
  roles: PermRole[];
  groups: CapGroup[];
  /** عدد القدرات المعروضة كلّها — مقام النسبة في العدّادات. */
  capCount: number;
  has: (roleId: number, capId: number) => boolean;
  countFor: (roleId: number) => number;
  toggle: (roleId: number, cap: Capability, on: boolean) => void;
  /** المفتاح `roleId:capId` الذي تُكتَب حالته الآن (أو `null`). */
  busy: string | null;
};
