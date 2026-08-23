"use server";

import { createAdeebServiceClient } from "@adeeb/core";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { FINAL_NO_TEMPLATE_WHY } from "@/lib/warnings/delivery";

export type WarningResult = {
  ok: boolean;
  message: string;
  /** معرّفُ الإنذار الصادر — به يُرفَع خطابُه ويُرسَل عبر واتساب. */
  id?: string;
  /** رتبةُ الإنذار الصادر — منها يُبنى الخطاب والرسالة. */
  ordinal?: number;
  activeCount?: number;
  limit?: number;
  /** هل سُحبت العضويّة ببلوغ الحدّ؟ */
  terminated?: boolean;
  /** (للإلغاء) كان هذا الإنذار هو الذي سحب العضويّة، وصاحبه ما زال موقوفًا. */
  offerRestore?: boolean;
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * إصدار إنذار — **لا بوّابة قدرةٍ هنا، والحكم في القاعدة وحدها** (كما في إنهاء العضوية):
 * `issue_warning` تسأل `can_issue_warning` — قدرةَ الفعل ومدى السلطة معًا — فلا يُردّ صاحبُ
 * سلطةٍ حقيقيّة ولا يمرّ من لا يملكها. وبلوغُ الحدّ يسحب العضويّة داخل الدالّة نفسها.
 */
export async function issueWarning(input: {
  userId: string;
  category: string;
  reason: string;
  committeeId?: number | null;
  occurredOn?: string | null;
}): Promise<WarningResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("issue_warning", {
    p_actor: admin.id,
    p_user: input.userId,
    p_category: input.category,
    p_reason: input.reason,
    p_committee: input.committeeId ?? null,
    p_occurred: input.occurredOn || null,
  });
  if (error) return { ok: false, message: `تعذّر تسجيل الإنذار: ${error.message}` };

  const r = (data ?? {}) as {
    ok?: boolean; id?: string; message?: string; ordinal?: number;
    active_count?: number; limit?: number; terminated?: boolean;
  };
  if (r.ok) {
    /* صفُّ التسليم يُفتَح `pending` عقب التسجيل، فتقول الشاشةُ «بانتظار الإرسال» قبل أن
       يُرسَل شيء. **وسقوطُه لا يُسقط الإنذار**: الإنذارُ كُتب في القاعدة وانتهى أمرُه،
       وهذا خبرُ قناةٍ يُسجَّل ولا يُردّ به على المُصدِر. */
    const q = await sb.rpc("queue_warning_notification", { p_warning: r.id, p_channel: "whatsapp" });
    if (q.error) console.error("[warnings] queue failed", { warning_id: r.id, error: q.error.message });

    revalidatePath("/dashboard/members", "layout");
    revalidatePath("/dashboard");
  }
  return {
    ok: !!r.ok,
    message: r.message ?? (r.ok ? "سُجِّل الإنذار." : "تعذّر تسجيل الإنذار."),
    id: r.id,
    ordinal: r.ordinal,
    activeCount: r.active_count,
    limit: r.limit,
    terminated: !!r.terminated,
  };
}

/** إلغاء إنذار بقرارٍ مُسبَّب — يخرج من العدّ ويبقى في السجلّ مشطوبًا. */
export async function cancelWarning(input: { warningId: string; reason: string }): Promise<WarningResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const { data, error } = await sb.rpc("cancel_warning", {
    p_actor: admin.id,
    p_warning: input.warningId,
    p_reason: input.reason,
  });
  if (error) return { ok: false, message: `تعذّر إلغاء الإنذار: ${error.message}` };

  const r = (data ?? {}) as { ok?: boolean; message?: string; was_termination?: boolean; member_suspended?: boolean };
  if (r.ok) {
    revalidatePath("/dashboard/members", "layout");
    revalidatePath("/dashboard");
  }
  return {
    ok: !!r.ok,
    message: r.message ?? (r.ok ? "أُلغي الإنذار." : "تعذّر إلغاء الإنذار."),
    // العضويّة لا تُعاد صامتةً: نقول للواجهة أن تعرض الزرّ، وسلطتُه سلطةُ الإعادة لا الإلغاء.
    offerRestore: !!r.was_termination && !!r.member_suspended,
  };
}

/* ══ قناةُ واتساب : الإنذارُ يبلغ صاحبَه ══════════════════════════════════════
   **الواقعةُ منفصلةٌ عن وصولها.** ما فوق يكتب الإنذار في سجلّ الموارد البشريّة، وما تحت
   يحمل خبرَه إلى صاحبه. ولذلك لا يُنادى الثاني داخل الأوّل: لو تعطّلت القناةُ لبقي
   الإنذارُ مكتوبًا كما هو، ولم يُردّ على المُصدِر أنّ تسجيله فشل.

   **ولماذا يمرّ الخطابُ من هنا؟** لأنّ رسّامه (`lib/paper.ts`) يمسّ DOM، فلا يعمل في
   الخادم ولا في Deno. فالمتصفّح الذي أصدر الإنذار يرسمه ويرفعه إلى دلوٍ **خاصّ**، ثمّ
   تقرؤه دالّةُ الحافة برابطٍ موقَّعٍ قصيرِ الأجل تنزّله YCloud. ولا يُصنَع رسّامٌ ثانٍ.

   **ولا يُصدَّق العميل**: النصّ والتاريخ والرتبة والجوّال لا يُمرَّر منها شيء. المعرّفُ
   وحده، والباقي تقرؤه دالّةُ الحافة من القاعدة. */

/** دلوُ خطابات الإنذار : خاصّ، لا يبلغه إلّا مفتاح الخدمة. */
const LETTERS_BUCKET = "warning-letters";

export type WhatsappResult = {
  ok: boolean;
  message: string;
  /** أيصلح لإعادة محاولةٍ لاحقة؟ (عطلٌ عارضٌ عند YCloud مثلًا.) */
  retryable?: boolean;
};

/**
 * يرفع خطابَ الإنذار ثمّ يُشغّل إرسالَ القالب.
 *
 * `formData`: `warningId` نصًّا، و`letter` صورةَ PNG رسمها المتصفّح.
 */
export async function sendWarningWhatsapp(formData: FormData): Promise<WhatsappResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "جلستك غير صالحة." };

  const sb = service();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص (مفتاح الخدمة)." };

  const warningId = String(formData.get("warningId") ?? "").trim();
  if (!warningId) return { ok: false, message: "لا إنذار مقصود." };

  const letter = formData.get("letter");
  if (!(letter instanceof File) || letter.size === 0) return { ok: false, message: "لم يُرفَق خطاب الإنذار." };
  if (letter.type !== "image/png") return { ok: false, message: "خطاب الإنذار يُرفَع صورةَ PNG." };

  /* السلطةُ سلطةُ الإنذار نفسِه: من يبلغه إصدارُه على هذا العضو يبلغه إبلاغُه. والحَكَم
     في القاعدة (`can_issue_warning`) لا قائمةَ قدراتٍ تُقرأ ههنا. */
  const { data: w, error: wErr } = await sb
    .from("member_warnings")
    .select("id, user_id, status")
    .eq("id", warningId)
    .maybeSingle<{ id: string; user_id: string; status: string }>();
  if (wErr) return { ok: false, message: `تعذّر قراءة الإنذار: ${wErr.message}` };
  if (!w) return { ok: false, message: "لا وجود لهذا الإنذار." };
  if (w.status !== "active") return { ok: false, message: "الإنذار ملغًى، فلا يُبلَّغ." };

  const { data: mayIssue, error: capErr } = await sb.rpc("can_issue_warning", {
    p_actor: admin.id,
    p_target: w.user_id,
  });
  if (capErr) return { ok: false, message: `تعذّر التحقّق من الصلاحية: ${capErr.message}` };
  if (mayIssue !== true) return { ok: false, message: "صلاحيتك لا تبلغ إنذارات هذا العضو." };

  // اسمُ الملفّ معرّفُ الإنذار نفسُه: صفٌّ واحدٌ وخطابٌ واحد، و`upsert` يستبدل رسمةً قديمة
  const { error: upErr } = await sb.storage
    .from(LETTERS_BUCKET)
    .upload(`${warningId}.png`, letter, { contentType: "image/png", upsert: true });
  if (upErr) return { ok: false, message: `تعذّر رفع خطاب الإنذار: ${upErr.message}` };

  const { data, error } = await sb.functions.invoke("send-warning-whatsapp", {
    body: { warning_id: warningId },
  });

  if (error) {
    const said = await readWhatsappError(error);
    return { ok: false, message: said.message, retryable: said.retryable };
  }

  const res = (data ?? {}) as {
    ok?: boolean; skipped?: boolean; message?: string; error?: string; recorded?: boolean;
  };
  if (!res.ok) return { ok: false, message: res.error ?? "تعذّر إرسال الرسالة." };

  revalidatePath("/dashboard/members", "layout");
  if (res.skipped) return { ok: true, message: res.message ?? "أُرسل هذا الإنذار من قبل." };
  return {
    ok: true,
    message: res.recorded === false
      ? "خرجت الرسالة إلى واتساب، وتعذّر تسجيلها في السجلّ."
      : "أُرسلت رسالة الإنذار عبر واتساب.",
  };
}

/** جوابُ دالّة الحافة حين تردّ بحالةِ خطأ : يُقال سببُه بلغة صاحب اللوحة. */
async function readWhatsappError(error: unknown): Promise<{ message: string; retryable: boolean }> {
  const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
  if (ctx?.json) {
    try {
      const j = (await ctx.json()) as { code?: string; error?: string; retryable?: boolean };
      if (j?.code === "DISABLED") {
        return { message: "قناةُ واتساب معطّلة في إعدادات الخادم.", retryable: false };
      }
      // ليس عطلًا بل قاعدة: تُقال كما هي بلا «تعذّر الإرسال» في صدرها
      if (j?.code === "FINAL_WARNING_NO_TEMPLATE") {
        return { message: j.error ?? FINAL_NO_TEMPLATE_WHY, retryable: false };
      }
      if (j?.code === "NOT_CONFIGURED" || j?.code === "NO_TEMPLATE") {
        return { message: "إعدادُ YCloud ناقصٌ في أسرار دوالّ الحافة.", retryable: false };
      }
      if (j?.code === "NO_LETTER") {
        return { message: "لم يبلغ خطابُ الإنذار الخادمَ، أعِد المحاولة.", retryable: true };
      }
      if (j?.error) return { message: `تعذّر الإرسال: ${j.error}`, retryable: !!j.retryable };
    } catch {
      /* جسدٌ غير قابل للقراءة : نسقط إلى نصّ الخطأ */
    }
  }
  return {
    message: error instanceof Error ? `تعذّر الإرسال: ${error.message}` : "تعذّر إرسال الرسالة.",
    retryable: true,
  };
}
