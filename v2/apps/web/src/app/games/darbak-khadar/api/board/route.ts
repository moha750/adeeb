import { service } from "@/lib/darb/player";
import { fail } from "@/lib/darb/http";

/**
 * **اللوحةُ العامّة: الاسمُ المستعارُ والرقمُ والترتيب، ولا شيءَ غيرُها.**
 *
 * واحدةٌ للجميع، فتُخزَّن نصفَ دقيقةٍ على الحافّة: خمسون جوّالًا يفتحونها معًا بعد
 * منشورٍ لا يعني خمسين استعلامًا. وحالُ «أنت» في بابٍ آخر (`me`) لأنّها لا تُخزَّن.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") === "candy" ? "candy" : "dist";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100);

  const sb = service();
  if (!sb) return fail(503, "الخادمُ غيرُ مهيّأ بعد.");

  const { data, error } = await sb.rpc("darb_board", { p_kind: kind, p_limit: limit });
  if (error) return fail(500, "تعذّرت قراءةُ اللوحة.");

  const rows = ((data ?? []) as { rank: number; nickname: string; value: number }[]).map((x) => ({
    rank: Number(x.rank),
    name: x.nickname,
    value: x.value,
  }));
  return Response.json(
    { ok: true, kind, rows },
    { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
