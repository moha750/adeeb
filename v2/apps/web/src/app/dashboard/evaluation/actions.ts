"use server";

import { revalidatePath } from "next/cache";
import { getEvaluationViewer } from "@/lib/evaluation/authz";
import { evaluationService } from "@/lib/evaluation/db";
import { recordFor, type TallyRow } from "@/lib/evaluation/score";
import { kickDispatch } from "@/lib/notifications/emit";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_ITEMS, COUNCIL_ITEMS } from "@/lib/evaluation/score";
import { OPEN_MAX, type Part } from "./vocab";
import { getElectorate, type ElectorRow } from "./data";

export type EvaluationResult = { ok: boolean; message: string };

const ROOM = "/dashboard/evaluation";

/** رسالةُ دالّة القاعدة إن كانت عربيّة من عندنا، وإلّا احتياطيٌّ نظيف (نهج الانتخابات). */
function rpcMessage(error: { message?: string } | null, fallback: string): string {
  const m = error?.message?.trim();
  return m && /[؀-ۿ]/.test(m) ? m.replace(/^EVAL_[A-Z]+:\s*/, "") : fallback;
}

// ══ ورقةُ المقيِّم ══════════════════════════════════════════════════════════

/**
 * إرسالُ الورقة بجلسة صاحبها (م٢/4): القاعدةُ تقرأ المقيِّمَ من `auth.uid()`، وتتحقّق من اللقطة والموعد
 * والبنود، وتمنع الورقةَ الثانية. وهنا تُعاد التحقّقاتُ نفسُها شكلًا فلا يُطرَق الخادمُ بما يُرفض.
 */
export async function submitSheet(input: {
  targetId: number;
  part: Part;
  scores: number[];
  keep?: string | null;
  change?: string | null;
}): Promise<EvaluationResult> {
  const items = input.part === "members" ? MEMBER_ITEMS : COUNCIL_ITEMS;
  if (
    !Number.isInteger(input.targetId) ||
    input.scores.length !== items ||
    input.scores.some((s) => !Number.isInteger(s) || s < 1 || s > 5)
  ) {
    return { ok: false, message: "قيّم كلَّ البنود من 1 إلى 5." };
  }
  const keep = input.part === "members" ? input.keep?.trim() || null : null;
  const change = input.part === "members" ? input.change?.trim() || null : null;
  if ((keep?.length ?? 0) > OPEN_MAX || (change?.length ?? 0) > OPEN_MAX) {
    return { ok: false, message: "الإجابةُ أطولُ من ألف حرف." };
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, message: "سجّل الدخول ثمّ أعِد المحاولة." };

  const { data, error } = await sb.rpc("evaluation_submit", {
    p_target: input.targetId,
    p_scores: input.scores,
    p_keep: keep,
    p_change: change,
  });
  if (error) return { ok: false, message: "تعذّر إرسال التقييم." };
  const res = data as { ok: boolean; message: string };
  if (res.ok) revalidatePath(`${ROOM}/rate`);
  return res;
}

// ══ التصحيح (م١٠/3) ══════════════════════════════════════════════════════

async function manager() {
  const viewer = await getEvaluationViewer();
  if (!viewer?.canManage) return null;
  const svc = evaluationService();
  return svc ? { viewer, svc } : null;
}

/**
 * يعيد حسابَ مقيَّمٍ واحد بدالّة الكود ويكتبه، فيعمل بما يترتّب: إعادةٌ إلى المقعد، أو استبعاد
 * (قرار محمد في المسألة ٥)، أو تصحيحُ السجلّ وحده (المسألة ١).
 */
export async function recomputeTarget(targetId: number, reason: string): Promise<EvaluationResult> {
  const m = await manager();
  if (!m) return { ok: false, message: "لا تملك تصحيح تقييم القيادات." };
  if (reason.trim().length < 3) return { ok: false, message: "اكتب سبب التصحيح." };

  const t = await m.svc.from("evaluation_targets").select("cycle_id").eq("id", targetId).maybeSingle();
  if (t.error || !t.data) return { ok: false, message: "التقييم غير موجود." };

  const tally = await m.svc.rpc("evaluation_tally", { p_cycle: (t.data as { cycle_id: number }).cycle_id, p_target: targetId });
  const row = ((tally.data ?? []) as TallyRow[])[0];
  if (tally.error || !row) return { ok: false, message: "تعذّرت قراءة المجاميع." };

  const { data, error } = await m.svc.rpc("evaluation_apply_correction", {
    p_actor: m.viewer.userId,
    p_result: recordFor(row),
    p_reason: reason.trim(),
  });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر التصحيح.") };
  const res = data as { ok: boolean; message?: string; outcome?: string };
  if (!res.ok) return { ok: false, message: res.message ?? "تعذّر التصحيح." };

  kickDispatch();
  revalidatePath(ROOM, "layout");
  const said: Record<string, string> = {
    restored: "صُحّحت النتيجة، وأُعيد إلى منصبه.",
    removed: "صُحّحت النتيجة، ونُفّذ الاستبعاد.",
    awaiting_return: "صُحّحت النتيجة، والاستبعادُ ينتظر لجنةً يعود إليها.",
    unchanged: "صُحّحت النتيجة، ولم يتغيّر الحكم.",
    not_executed: "صُحّحت النتيجة، وسقط الاستبعادُ قبل تنفيذه.",
  };
  return { ok: true, message: said[res.outcome ?? ""] ?? "صُحّحت النتيجة، وسُجّل أنّ الإعادة تعذّرت." };
}

/** يُخرج من اللقطة من دخلها خطأً، أو يُدخل من سقط منها خطأً، ثمّ يعيد الحساب إن كان قد حُكم فيه. */
export async function correctRater(input: {
  targetId: number;
  raterId: string;
  action: "remove" | "add";
  part?: Part;
  reason: string;
}): Promise<EvaluationResult> {
  const m = await manager();
  if (!m) return { ok: false, message: "لا تملك تصحيح تقييم القيادات." };
  const reason = input.reason.trim();
  if (reason.length < 3) return { ok: false, message: "اكتب سبب التصحيح." };

  const { data, error } = await m.svc.rpc("evaluation_correct_rater", {
    p_actor: m.viewer.userId,
    p_target: input.targetId,
    p_rater: input.raterId,
    p_action: input.action,
    p_part: input.part ?? null,
    p_reason: reason,
  });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر التصحيح.") };
  const res = data as { ok: boolean; message: string; needsRecompute?: boolean };
  if (!res.ok) return res;
  if (res.needsRecompute) return recomputeTarget(input.targetId, reason);
  revalidatePath(ROOM, "layout");
  return res;
}

/** يختار قائدُ الموارد لجنةً لمنسّقٍ مستبعَدٍ لا لجنةَ سابقةَ له، فيُنفَّذ استبعادُه (المسألة ٤). */
export async function chooseReturn(targetId: number, committeeId: number): Promise<EvaluationResult> {
  const m = await manager();
  if (!m) return { ok: false, message: "لا تملك إدارة تقييم القيادات." };
  const { data, error } = await m.svc.rpc("evaluation_choose_return", {
    p_actor: m.viewer.userId,
    p_target: targetId,
    p_committee: committeeId,
  });
  if (error) return { ok: false, message: rpcMessage(error, "تعذّر تنفيذ الاستبعاد.") };
  const res = data as EvaluationResult;
  if (res.ok) {
    kickDispatch();
    revalidatePath(ROOM, "layout");
  }
  return res;
}

/** مقيِّمو مقيَّمٍ واحد لنافذة التفصيل: لمن يرى الغرفة (النتائجُ أو الإدارة) وحده. */
export async function loadElectorate(targetId: number): Promise<ElectorRow[]> {
  const viewer = await getEvaluationViewer();
  if (!viewer) return [];
  return (await getElectorate(targetId)).data;
}
