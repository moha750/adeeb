// تعليمُ كلمة البحث في النصّ الأصليّ. البحثُ يطابق بعد الطيّ (`foldSearch`: بلا تشكيلٍ ولا همزٍ
// ولا مسافات)، فموضعُ المطابقة في المطويّ غيرُ موضعها في الأصل. فيُطوى النصُّ حرفًا حرفًا ويُحفظ
// لكلّ محرفٍ مطويٍّ أصلُه، ثمّ يُردّ المدى إلى الأصل.

import { foldSearch } from "@adeeb/design-system";

function foldWithMap(text: string) {
  let out = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const f = foldSearch(text[i]);
    for (let k = 0; k < f.length; k++) {
      out += f[k];
      map.push(i);
    }
  }
  return { out, map };
}

export const searchTerms = (q: string) => q.split(/\s+/).map(foldSearch).filter(Boolean);

/** مدى كلّ ظهورٍ لكلمات البحث في النصّ الأصليّ، مرتّبةً مدموجة. */
export function matchRanges(text: string, terms: string[]): Array<[number, number]> {
  if (!terms.length || !text) return [];
  const { out, map } = foldWithMap(text);
  const r: Array<[number, number]> = [];
  for (const t of terms) {
    let at = out.indexOf(t);
    while (at !== -1) {
      r.push([map[at], map[at + t.length - 1] + 1]);
      at = out.indexOf(t, at + t.length);
    }
  }
  r.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const x of r) {
    const last = merged[merged.length - 1];
    if (last && x[0] <= last[1]) last[1] = Math.max(last[1], x[1]);
    else merged.push([...x]);
  }
  return merged;
}

/** مقتطفٌ حول أوّل ظهور: نافذةٌ تبدأ وتنتهي عند حدّ كلمة. */
export function snippet(text: string, terms: string[], span = 150): string {
  const first = matchRanges(text, terms)[0];
  if (!first || text.length <= span) return text.length <= span ? text : `${text.slice(0, text.lastIndexOf(" ", span))}…`;
  let from = Math.max(0, first[0] - Math.floor(span / 3));
  let to = Math.min(text.length, from + span);
  if (from > 0) from = text.indexOf(" ", from) + 1 || from;
  if (to < text.length) to = text.lastIndexOf(" ", to) > first[1] ? text.lastIndexOf(" ", to) : to;
  return `${from > 0 ? "…" : ""}${text.slice(from, to)}${to < text.length ? "…" : ""}`;
}
