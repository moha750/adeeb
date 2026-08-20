import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdeebServiceClient } from "@adeeb/core";
import { fmtDate, fmtSince } from "@/lib/dates";

/**
 * **طلباتُ إنهاء العضويّة** — ما يراه القاضي فيها.
 *
 * والقراءةُ **بجلسة صاحبها**: سياسةُ `membership_exit_select` تُدخل القاضيَ في الكشف كلِّه
 * وتحبس غيرَه في صفّه. فلا مفتاحَ خدمةٍ ههنا إلّا لأسماء أصحاب الطلبات ومقاعدهم — وذلك
 * لأنّ `profiles` لا يُقرأ صفُّ غيرك منه بسياسته، والاسمُ بلا صاحبٍ لا يُقضى به.
 */

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

export type ExitRow = {
  id: string;
  userId: string;
  name: string;
  /** «قائد» أو «عضو» … مقعدُه اليومَ، فالقرارُ يُتّخذ وهو يُرى. */
  seats: string[];
  reason: string;
  at: string;
  since: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  decisionReason: string | null;
  decidedAt: string | null;
  /** أيقضي **هذا** القارئُ في **هذا** الطلب؟ السلطةُ تتبع مقعدَ صاحبه (٢٠٢٦-٠٨-٢٠). */
  canDecide: boolean;
};

export type ExitsData = {
  /** أمن أهل القضاء هو أصلًا؟ (لفتح الغرفة، والفصلُ في كلّ طلبٍ في صفّه) */
  mayDecide: boolean;
  pending: ExitRow[];
  past: ExitRow[];
  error: string | null;
};

export async function getExitRequests(): Promise<ExitsData> {
  const sb = await createClient();
  const svc = service();

  const meId = (await sb.auth.getUser()).data.user?.id ?? null;
  const [{ data: may }, reqRes] = await Promise.all([
    sb.rpc("can_decide_membership_exit", { p_actor: meId }),
    sb.from("membership_exit_requests")
      .select("id, user_id, reason, status, created_at, decision_reason, decided_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (reqRes.error) return { mayDecide: may === true, pending: [], past: [], error: reqRes.error.message };
  const rows = (reqRes.data ?? []) as {
    id: string; user_id: string; reason: string; status: ExitRow["status"];
    created_at: string; decision_reason: string | null; decided_at: string | null;
  }[];

  const ids = [...new Set(rows.map((r) => r.user_id))];
  const names = new Map<string, string>();
  const seats = new Map<string, string[]>();

  if (svc && ids.length) {
    const [pRes, rRes] = await Promise.all([
      svc.from("profiles").select("id, full_name").in("id", ids),
      svc.from("user_roles").select("user_id, role_name").in("user_id", ids).eq("is_active", true),
    ]);
    for (const p of (pRes.data ?? []) as { id: string; full_name: string | null }[]) {
      names.set(p.id, p.full_name ?? "بلا اسم");
    }
    // أسماءُ الأدوار بالعربيّة تُقرأ من جدولها، فلا تُكتب ههنا نسخةٌ ثانيةٌ تشيخ
    const roleNames = [...new Set(((rRes.data ?? []) as { role_name: string }[]).map((r) => r.role_name))];
    const arRes = roleNames.length
      ? await svc.from("roles").select("role_name, role_name_ar").in("role_name", roleNames)
      : { data: [] as { role_name: string; role_name_ar: string }[] };
    const ar = new Map(((arRes.data ?? []) as { role_name: string; role_name_ar: string }[])
      .map((r) => [r.role_name, r.role_name_ar]));
    for (const r of (rRes.data ?? []) as { user_id: string; role_name: string }[]) {
      const list = seats.get(r.user_id) ?? [];
      list.push(ar.get(r.role_name) ?? r.role_name);
      seats.set(r.user_id, list);
    }
  }

  // **الحُكمُ في كلّ طلبٍ من القاعدة لا من نسخةٍ ثانيةٍ للقاعدة ههنا**: القاضون يتبعون مقعدَ
  // صاحب الطلب، فلو كُتبت القسمةُ في هذا الملفّ لصارت مصدرًا ثانيًا يشيخ. والطلباتُ المعلَّقة
  // قليلةٌ بطبعها، فنداءٌ لكلّ واحدٍ منها لا يثقل.
  const pendingIds = rows.filter((r) => r.status === "pending");
  const decidable = new Map<string, boolean>();
  if (meId) {
    const answers = await Promise.all(
      pendingIds.map((r) => sb.rpc("can_decide_membership_exit", { p_actor: meId, p_target: r.user_id })),
    );
    pendingIds.forEach((r, i) => decidable.set(r.id, answers[i].data === true));
  }

  const shape = (r: (typeof rows)[number]): ExitRow => ({
    id: r.id,
    userId: r.user_id,
    name: names.get(r.user_id) ?? "عضوٌ في أديب",
    seats: seats.get(r.user_id) ?? [],
    reason: r.reason,
    at: fmtDate(r.created_at),
    since: fmtSince(r.created_at),
    status: r.status,
    decisionReason: r.decision_reason,
    decidedAt: r.decided_at ? fmtDate(r.decided_at) : null,
    canDecide: decidable.get(r.id) === true,
  });

  return {
    mayDecide: may === true,
    pending: rows.filter((r) => r.status === "pending").map(shape),
    past: rows.filter((r) => r.status !== "pending").map(shape),
    error: null,
  };
}
