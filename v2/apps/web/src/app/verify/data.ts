import "server-only";
import { createAdeebServerClient } from "@adeeb/core";

// عميل قراءة عامّ (مفتاح anon) — والبابُ دالّةٌ واحدة `verify_certificate` مُتاحةٌ للزائر،
// لا قراءةٌ من الجدول (RLS يمنعها). فما يخرج من هذا الباب هو ما قرّرته الدالّة لا أكثر.
const anon = () =>
  createAdeebServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

/** اسمٌ حملته الشهادةُ قبل اسمها الحاليّ، ويومُ انتهائه («YYYY-MM-DD» بساعة الرياض). */
export type FormerName = { name: string; until: string };

export type VerifyResult =
  | { state: "empty" }
  | { state: "missing" }
  | { state: "error"; message: string }
  | {
      state: "valid" | "revoked";
      serial: string;
      /** اسمُ صاحبها اليوم — وبه تُرسَم الورقةُ إن تغيّر بعد الإصدار. */
      holderName: string;
      /**
       * **ما حملته الشهادةُ قبله** (٢٠٢٦-١٠-٠١): من صحّح اسمَه بعد الإصدار تبعته شهادتُه، ونسخُها القديمةُ
       * بيد جهاتٍ أخرى تحمل الاسمَ السابق. فالصفحةُ تقولها كلَّها، فتُطابَق الورقةُ ولا تبدو مزوّرة.
       */
      formerNames: FormerName[];
      positionTitle: string;
      periodFrom: string;
      periodTo: string;
      issuedOn: string;
      revokedOn: string | null;
      /** ساعاتُ التطوّع في شهادة المشاركة (٢٠٢٦-١٠-٠٣)، و`null` لشهادة الخبرة وللمرنة ولما صدر قبل حسابها. */
      hours: number | null;
      /** جملةُ التميّز في شهادة المشاركة «بتميّز»، كما طُبعت في الورقة. */
      distinction: string | null;
    };

/**
 * التحقّق من شهادةٍ بالرقم المرجعيّ كاملًا.
 *
 * **ولا استعلامَ بغيره**: لا اسمَ يُبحَث به ولا سردَ يُطلَب — فالصفحة تؤكّد ورقةً بيد صاحبها
 * ولا تكشف سجلًّا. والرقمُ نفسه يحمل رمزًا عشوائيًّا (٢٠٢٦-٠٨-٠٣) فلا يُخمَّن بالعدّ.
 */
export async function verifyCertificate(code: string | undefined): Promise<VerifyResult> {
  const serial = (code ?? "").trim();
  if (!serial) return { state: "empty" };

  const { data, error } = await anon().rpc("verify_certificate", { p_serial: serial });
  if (error) return { state: "error", message: error.message };

  const r = (data ?? {}) as {
    found?: boolean; valid?: boolean; serial?: string; holder_name?: string; position_title?: string;
    former_names?: { name?: string; until?: string }[];
    period_from?: string; period_to?: string; issued_on?: string; revoked_on?: string | null;
    hours?: number | string | null; distinction?: string | null;
  };
  if (!r.found) return { state: "missing" };

  return {
    state: r.valid ? "valid" : "revoked",
    serial: r.serial ?? serial,
    holderName: r.holder_name ?? "",
    formerNames: (r.former_names ?? [])
      .filter((f): f is { name: string; until: string } => Boolean(f?.name && f?.until))
      .map((f) => ({ name: f.name, until: f.until })),
    positionTitle: r.position_title ?? "",
    periodFrom: r.period_from ?? "",
    periodTo: r.period_to ?? "",
    issuedOn: r.issued_on ?? "",
    revokedOn: r.revoked_on ?? null,
    hours: r.hours == null ? null : Number(r.hours),
    distinction: r.distinction ?? null,
  };
}
