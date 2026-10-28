"use server";

import { revalidatePath } from "next/cache";
import { createAdeebServiceClient } from "@adeeb/core";
import { getCurrentAdmin } from "@/lib/auth";
import { blocksToText, type StatementDoc } from "@/lib/statements/paper";

export type IssueResult = { ok: boolean; message: string; number?: string };

/**
 * **إصدارُ بيان** — يُحفظ في السجلّ برقمه في سنته (`issue_statement`، والقاعدةُ هي الحَكَم: للرئيسين وحدهما).
 * يُحفظ ما يُرسَم لا الصورة؛ فالرسمُ والتنزيل في المتصفّح بعد أن يعود الرقم.
 */
export async function issueStatement(input: StatementDoc & { pages: number }): Promise<IssueResult> {
  const admin = await getCurrentAdmin();
  if (!admin?.caps.includes("issue_statements")) return { ok: false, message: "إصدارُ البيانات للرئيسين وحدهما." };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  // لا يُحفظ من الأسماء إلّا من يوقّع
  const names = input.signers === "both" ? input.names
    : input.signers === "president" ? { president: input.names.president } : { ceo: input.names.ceo };
  const blocks = input.blocks.map((b) => ({ kind: b.kind, text: b.text.replace(/\s+/g, " ").trim() })).filter((b) => b.text);
  const { data, error } = await createAdeebServiceClient(url, key).rpc("issue_statement", {
    p_actor: admin.id,
    p_title: input.title,
    p_body: blocksToText(blocks),
    p_blocks: blocks,
    p_signers: input.signers,
    p_signer_names: names,
    p_pages: input.pages,
  });
  if (error) return { ok: false, message: `تعذّر الإصدار: ${error.message}` };
  const r = (data ?? {}) as { ok?: boolean; message?: string; year?: number; seq?: number };
  if (!r.ok) return { ok: false, message: r.message ?? "تعذّر الإصدار." };
  revalidatePath("/dashboard/statements");
  return { ok: true, message: "صدر البيان.", number: `${r.year}/${r.seq}` };
}
