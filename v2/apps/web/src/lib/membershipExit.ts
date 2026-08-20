import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "./dates";

/**
 * **بابُ الخروج الذي يراه صاحبُ الحساب** — قراءةٌ واحدةٌ تقرؤها ثلاثُ شاشات.
 *
 * والحكمُ ليس ههنا بل في `membership_exit_door` بالقاعدة (قرارُ المالك ٢٠٢٦-٠٨-٢٠)، وهذا
 * ناقلٌ له: لو حُسب في الكود لَافترق ما يُعرَض عمّا يُنفَّذ يومَ يتغيّر أحدُهما.
 *
 * **وبجلسة صاحبها لا بمفتاح الخدمة**: الدالّةُ تقرأ `auth.uid()`، وسياسةُ الطلبات تُدخِل
 * صاحبَها في صفّه والقاضينَ في الكشف. فلا يقرأ هذا الملفُّ شأنَ غيره ولو أراد.
 */

/**
 * أربعُ حالاتٍ لا خامسة، وهي نفسُها قيمُ الدالّة في القاعدة.
 * و`sealed` لرئيس النادي وحدَه: لا يزيله أحدٌ ولا يزيل نفسَه (٢٠٢٦-٠٨-٢٠)، فلا بابَ له.
 */
export type ExitDoor = "sealed" | "request" | "end_now" | "delete";

export type ExitRequest = {
  id: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  reason: string;
  /** «١٩ أغسطس ٢٠٢٦» */
  at: string;
  decisionReason: string | null;
};

/**
 * أسماءُ القاضين كما تُعرَض. والقاعدةُ تُخرج مفاتيحَ الأدوار (`exit_decider_roles`)، وتُسمّى
 * ههنا بأسمائها الكاملة لا بـ`role_name_ar` وحدَه: ذاك يقول «قائد» لقائد الموارد وقائد
 * الضمان معًا، فلا يُفرَّق بينهما في جملةٍ تُقرأ.
 */
const DECIDER_AR: Record<string, string> = {
  club_president: "رئيس النادي",
  executive_council_president: "رئيس المجلس التنفيذي",
  hr_committee_leader: "قائد إدارة الموارد البشرية",
  qa_committee_leader: "قائد إدارة ضمان الجودة",
};

export type MyExit = {
  door: ExitDoor;
  /** من يقضي في طلبه — يتبع مقعدَه هو (٢٠٢٦-٠٨-٢٠). */
  deciders: string[];
  /** طلبٌ ينتظر القرار، إن كان. */
  pending: ExitRequest | null;
  /** آخرُ ردٍّ وصله (رفضٌ غالبًا) — يُقال ولا يُبتلَع. */
  lastAnswer: ExitRequest | null;
};

export async function getMyExit(): Promise<MyExit> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { door: "delete", deciders: [], pending: null, lastAnswer: null };

  const [doorRes, decRes, reqRes] = await Promise.all([
    sb.rpc("membership_exit_door", { p_user: user.id }),
    sb.rpc("exit_decider_roles", { p_user: user.id }),
    // **وشرطُ `user_id` لازمٌ وإن حرست السياسةُ الكشف**: القاضي في الطلبات يقرأ طلبات
    // الناس كلِّهم بحقّه، فلولا هذا الشرطُ لَرأى طلبَ غيره في موضع طلبِ نفسه.
    sb.from("membership_exit_requests")
      .select("id, status, reason, created_at, decision_reason")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const rows = (reqRes.data ?? []) as {
    id: string; status: ExitRequest["status"]; reason: string; created_at: string; decision_reason: string | null;
  }[];
  const shape = (r: (typeof rows)[number]): ExitRequest => ({
    id: r.id, status: r.status, reason: r.reason, at: fmtDate(r.created_at), decisionReason: r.decision_reason,
  });

  const pending = rows.find((r) => r.status === "pending") ?? null;
  const answered = rows.find((r) => r.status === "rejected" || r.status === "approved") ?? null;

  return {
    door: ((doorRes.data as string | null) ?? "delete") as ExitDoor,
    deciders: ((decRes.data as string[] | null) ?? []).map((r) => DECIDER_AR[r] ?? r),
    pending: pending ? shape(pending) : null,
    lastAnswer: answered ? shape(answered) : null,
  };
}
