import "server-only";
import { createElement, type ComponentType, type ReactNode } from "react";
import * as Phosphor from "@phosphor-icons/react/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";

/**
 * **فهرسُ أيقونات الوحدات — مكتبةُ Phosphor كلُّها** (المالك ٢٠٢٦-١٠-١١: «الأيقونات قد تغطّي حاليًّا،
 * ومستقبلًا قد لا»). القائمةُ المقترحة (`lib/unitIcons.ts`) تبقى أوّلَ ما يُرى، ومن ورائها بحثٌ في المكتبة
 * كلّها (قرابة ١٥٠٠) داخل نافذة الوحدة، فلا يُخرَج إلى موقع المكتبة ولا يُكتب اسمٌ بيدٍ فيُخطأ.
 *
 * **خادميٌّ وحده** (`server-only`): المكتبةُ كاملةً تُستورد هنا من مدخل `ssr`، فلا يحملها المتصفّح. وما يصل
 * العميلَ رسمُ الأيقونة المطلوبة وحدها (عقدةُ `svg` في حمولة الخادم): أيقوناتُ الوحدات القائمة من الصفحة،
 * ونتائجُ البحث من إجرائه. ومدخلُ `ssr` لا يقرأ سياقَ الوزن، فيُمرَّر `ICON_WEIGHT` صراحةً (`lib/iconWeight.ts`).
 *
 * **والوزنُ duotone للجميع** ولو كان الاسمُ من مستثنَي `glyphs.tsx` (نجمة، علامة +): الاستثناءُ هناك لرموز
 * **الفعل** في الأزرار والأشرطة، وأيقونةُ الوحدة **هويّةٌ** في مربّعها، تُرسم بلغة المقترحة كلِّها.
 *
 * **المفتاح** اسمُ المكتبة بشرطات كما في موقعها (`RocketLaunch` ← `rocket-launch`)، وهو ما يقبله قيدُ
 * العمود في القاعدة (`^[a-z][a-z0-9-]{1,39}$`) بلا ترحيل.
 */

type Glyph = ComponentType<{ weight?: string; "aria-hidden"?: boolean }>;
const NS = Phosphor as unknown as Record<string, unknown>;

/** `RocketLaunch` ← `rocket-launch`، و`ArrowUDownLeft` ← `arrow-u-down-left` (كأسماء موقع المكتبة). */
const toKey = (name: string) =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();

let catalog: Map<string, string> | null = null;
/** المفتاح ← اسمُ المكوّن. كلُّ أيقونةٍ مصدَّرةٌ باسمين (`Rocket` و`RocketIcon`)، فيُعرف الأصلُ بتوأمه. */
function entries(): Map<string, string> {
  if (catalog) return catalog;
  const m = new Map<string, string>();
  for (const name of Object.keys(NS)) {
    if (name.endsWith("Icon") || NS[`${name}Icon`] !== NS[name]) continue;
    const key = toKey(name);
    if (/^[a-z][a-z0-9-]{1,39}$/.test(key) && !m.has(key)) m.set(key, name);
  }
  return (catalog = m);
}

/** مفتاحٌ تعرفه المكتبة؟ (يحرس الحفظَ في `createOrgUnit` و`updateOrgUnit`). */
export const isCatalogIcon = (key: string | null | undefined): key is string => !!key && entries().has(key);

/** رسمُ أيقونةٍ بمفتاحها، أو لا شيء إن جُهلت. */
export function unitIconNode(key: string): ReactNode | null {
  const name = entries().get(key);
  return name ? createElement(NS[name] as Glyph, { weight: ICON_WEIGHT, "aria-hidden": true }) : null;
}

/** رسومُ مفاتيحَ عدّة (أيقوناتُ الوحدات القائمة خارج المقترحة)، والمجهولُ يُسقَط. */
export function unitIconNodes(keys: Iterable<string>): Record<string, ReactNode> {
  const out: Record<string, ReactNode> = {};
  for (const k of new Set(keys)) {
    const n = unitIconNode(k);
    if (n) out[k] = n;
  }
  return out;
}

/**
 * البحثُ بالاسم الإنجليزيّ: كلُّ كلمةٍ في الاستعلام جزءٌ من المفتاح (`music` ← `music-note`،
 * `rocket launch` ← `rocket-launch`). والأقربُ أوّلًا: المطابقُ تمامًا، فما يبدأ بالكلمة الأولى،
 * فما فيه الكلمةُ مقطعًا كاملًا، فالأقصر.
 */
export function searchCatalog(query: string, limit = 35): string[] {
  const words = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [];
  const joined = words.join("-");
  const hits: [number, string][] = [];
  for (const key of entries().keys()) {
    if (!words.every((w) => key.includes(w))) continue;
    const parts = key.split("-");
    const score =
      (key === joined ? 0 : 100) +
      (key.startsWith(words[0]) ? 0 : 20) +
      (parts.includes(words[0]) ? 0 : 10) +
      key.length / 100;
    hits.push([score, key]);
  }
  return hits.sort((a, b) => a[0] - b[0]).slice(0, limit).map(([, k]) => k);
}

/** بحثٌ بكلماتٍ عدّة (ترجمةُ استعلامٍ عربيّ): نتائجُ الأولى أوّلًا، ثمّ ما تزيده التالية، بلا تكرار. */
export function searchCatalogMany(keywords: readonly string[], limit = 35): string[] {
  const out = new Set<string>();
  for (const kw of keywords) {
    for (const k of searchCatalog(kw, limit)) {
      out.add(k);
      if (out.size >= limit) return [...out];
    }
  }
  return [...out];
}
