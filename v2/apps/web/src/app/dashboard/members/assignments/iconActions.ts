"use server";

import type { ReactNode } from "react";
import { getCurrentAdmin } from "@/lib/auth";
import { liveProvider } from "@/lib/deebo/providers";
import { arabicKeywords, hasArabic, normalizeArabic } from "@/lib/unitIconArabic";
import { searchCatalog, searchCatalogMany, unitIconNode } from "@/lib/unitIconCatalog";

/**
 * بحثُ نافذة الوحدة في مكتبة الأيقونات كلِّها (`lib/unitIconCatalog.ts`). يعيد المفاتيحَ ورسومَها، فلا
 * يحمل المتصفّحُ المكتبة.
 *
 * **والعربيّةُ تُفهَم** (المالك ٢٠٢٦-١٠-١١: «ليس الجميع يفهم الإنجليزيّة»): أسماءُ المكتبة إنجليزيّة،
 * فالاستعلامُ العربيّ يُترجَم إلى كلمات بحثٍ إنجليزيّة بطبقتين: القاموسُ (`lib/unitIconArabic.ts`) أوّلًا،
 * فوريٌّ مجّانيّ، وما بقي فيه من كلمةٍ لا يعرفها يُسأل عنه نموذجُ ديبو الحيّ (`liveProvider`) ويُحفظ جوابُه
 * في ذاكرة الخادم، فلا تُسأل الكلمةُ مرّتين. ولو تعطّل النموذجُ بقي ما وجده القاموس.
 *
 * والبحثُ الإنجليزيّ والقاموسُ قراءةٌ لفهرسٍ عامّ بلا قفل؛ أمّا سؤالُ النموذج فله ثمن، فلا يُسأل إلّا لمن يملك
 * `manage_positions` (صاحبُ النافذة وحده).
 */
export async function searchUnitIcons(query: string): Promise<{ key: string; node: ReactNode }[]> {
  const q = String(query ?? "").trim().slice(0, 40);
  if (!q) return [];
  let keys: string[];
  if (!hasArabic(q)) keys = searchCatalog(q);
  else {
    const { keywords, missing } = arabicKeywords(q);
    keys = searchCatalogMany(missing ? [...keywords, ...(await aiKeywords(q))] : keywords);
  }
  return keys.map((key) => ({ key, node: unitIconNode(key) }));
}

const AI_CACHE = new Map<string, string[]>();
const AI_SYSTEM =
  "You translate an Arabic search phrase into English keywords for searching the Phosphor icon library (names like music-note, film-slate, hand-heart). " +
  "Reply with only 3 to 8 lowercase English words or Phosphor icon names, comma-separated, the most fitting first. No other text.";

/** كلماتُ بحثٍ إنجليزيّة من النموذج لاستعلامٍ عربيّ لم يكفِه القاموس. فارغةٌ عند أيّ عطلٍ أو بلا صلاحية. */
async function aiKeywords(query: string): Promise<string[]> {
  const key = normalizeArabic(query);
  const cached = AI_CACHE.get(key);
  if (cached) return cached;
  const admin = await getCurrentAdmin();
  if (!admin?.caps.includes("manage_positions")) return [];
  try {
    const answer = await Promise.race([
      liveProvider().ask(AI_SYSTEM, query),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    if (!answer || !answer.ok) return [];
    const words = answer.text.toLowerCase().split(/[,،\n]+/).map((w) => w.trim()).filter((w) => /^[a-z][a-z0-9 -]{1,39}$/.test(w)).slice(0, 8);
    if (AI_CACHE.size > 500) AI_CACHE.clear();
    AI_CACHE.set(key, words);
    return words;
  } catch {
    return [];
  }
}
