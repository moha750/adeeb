import "server-only";
import { evaluationService } from "./db";
import { recordFor, type TallyRow } from "./score";

/**
 * **الحكمُ في الدورات المغلقة** — يناديه منفذُ `/api/evaluation/execute` (المؤقّت `evaluation-execute`).
 *
 * لكلّ دورةٍ مغلقة: تُقرأ المجاميعُ (`evaluation_tally`)، ويُحكم فيها بالدالّة النقيّة (`recordFor`)، وتُسلَّم
 * الأحكامُ لـ`evaluation_record` فتكتبها وتنفّذ الاستبعادَ في معاملةٍ واحدة (م٩/2). والقاعدةُ تطابق كلَّ
 * حكمٍ بمجاميعه الحاضرة، ويرفض قيدُها «باقيًا» نتيجتُه 40% أو أقلّ. ونداءٌ مكرَّرٌ لا يضرّ: الدورةُ
 * المنفَّذة لا تُعاد.
 */
export type ExecuteSummary = { cycles: number; removed: number; awaitingReturn: number; errors: string[] };

export async function executeClosedCycles(): Promise<ExecuteSummary> {
  const out: ExecuteSummary = { cycles: 0, removed: 0, awaitingReturn: 0, errors: [] };
  const svc = evaluationService();
  if (!svc) return { ...out, errors: ["مفتاح الخدمة غير مضبوط"] };

  const { data: cycles, error } = await svc
    .from("evaluation_cycles")
    .select("id")
    .eq("status", "closed")
    .lte("closes_at", new Date().toISOString())
    .order("due_on");
  if (error) return { ...out, errors: [error.message] };

  for (const c of (cycles ?? []) as { id: number }[]) {
    const tally = await svc.rpc("evaluation_tally", { p_cycle: c.id });
    if (tally.error) {
      out.errors.push(`${c.id}: ${tally.error.message}`);
      continue;
    }
    const results = ((tally.data ?? []) as TallyRow[]).map(recordFor);
    const rec = await svc.rpc("evaluation_record", { p_cycle: c.id, p_results: results });
    const body = rec.data as { ok?: boolean; removed?: number; awaitingReturn?: number; message?: string } | null;
    if (rec.error || !body?.ok) {
      out.errors.push(`${c.id}: ${rec.error?.message ?? body?.message ?? "تعذّر الحكم"}`);
      continue;
    }
    out.cycles += 1;
    out.removed += body.removed ?? 0;
    out.awaitingReturn += body.awaitingReturn ?? 0;
  }
  return out;
}
