/**
 * **سجلُّ «مدارس الأصول الأهلية»** — اللعبةُ صفحةٌ ساكنة (`public/games/osool/game.html`)، فتخبر هذا المسارَ
 * بما جرى: فُتحت، بدأت جولة، انتهت بفوزٍ أو خسارة، حُفظت الشهادةُ أو شوركت. طلبُ المالك ليلةَ الإطلاق
 * (٢٠٢٦-١١-١٦): «كم شخص دخل، كم أكمل، كم أُصدرت له شهادة، وما أسماؤهم».
 *
 * ## لماذا مسارٌ لا دالّةٌ تناديها الصفحة
 * «الجلسةُ هي الحقيقة»: إن كان اللاعبُ داخلًا بحسابه عُرف من كوكيز طلبه هنا، لا من معرّفٍ ترسله الصفحة.
 * والجدولُ `osool_plays` مغلقٌ على الكلّ، يكتبه هذا المسارُ وحده بمفتاح الخدمة.
 *
 * ## الصيغة
 * `{ t, id, visit, player, … }` — `t`: `open` | `round` | `end` | `cert`. المعرّفاتُ تولّدها الصفحة، فإعادةُ
 * الإرسال تحدّث الصفَّ نفسَه ولا تكرّره، وكلُّ حدثٍ يكتب أعمدتَه وحدها (`upsert` يدمج ولا يمحو).
 * ولا يُردّ على اللعبة بشيءٍ تعتمد عليه: السجلُّ لا يعطّل لعبًا، فأيُّ خطأٍ هنا يُبلع.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdeebServiceClient } from "@adeeb/core";
import { getSessionClaims } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = ["order", "full", "shake", "more", "late"] as const;

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

const int = (v: unknown, lo: number, hi: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : null;

function device(ua: string): "ios" | "android" | "desktop" {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

const done = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  const raw = await req.text().catch(() => "");
  if (!raw || raw.length > 2000) return done();
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(raw);
  } catch {
    return done();
  }
  const t = p.t;
  const id = typeof p.id === "string" && UUID.test(p.id) ? p.id : null;
  const visit = typeof p.visit === "string" && UUID.test(p.visit) ? p.visit : null;
  const player = typeof p.player === "string" && UUID.test(p.player) ? p.player : null;
  if (!id || !visit || !player || !["open", "round", "end", "cert"].includes(t as string)) return done();

  const sb = service();
  if (!sb) return done();

  const row: Record<string, unknown> = {
    id,
    visit,
    player,
    kind: t === "open" ? "open" : "round",
    updated_at: new Date().toISOString(),
  };
  const claims = await getSessionClaims().catch(() => null);
  if (claims?.sub) row.user_id = claims.sub;

  if (t === "open") {
    row.device = device(req.headers.get("user-agent") ?? "");
    if (typeof p.ref === "string" && p.ref.trim()) row.ref = p.ref.trim().slice(0, 60);
  } else if (t === "round") {
    const name = typeof p.name === "string" ? p.name.trim().slice(0, 24) : "";
    if (name) row.name = name;
    if (p.majlis === "m" || p.majlis === "f") row.majlis = p.majlis;
    row.outcome = "playing";
    row.device = device(req.headers.get("user-agent") ?? "");
  } else if (t === "end") {
    if (p.outcome === "won" || p.outcome === "lost") row.outcome = p.outcome;
    const f = (p.faults ?? {}) as Record<string, unknown>;
    row.faults = Object.fromEntries(KINDS.map((k) => [k, int(f[k], 0, 99) ?? 0]));
    row.hearts = int(p.hearts, 0, 3);
    if (Array.isArray(p.grades) && p.grades.length === 3) row.grades = p.grades.map((g) => int(g, 0, 2) ?? 2);
    row.secs = int(p.secs, 0, 86400);
  } else if (t === "cert") {
    if (p.saved === true) row.cert_saved = true;
    if (p.shared === true) row.cert_shared = true;
  }

  await sb.from("osool_plays").upsert(row, { onConflict: "id" });
  return done();
}
