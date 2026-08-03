import "server-only";
import { createAdeebServerClient } from "@adeeb/core";

// عميل قراءة عامّ (مفتاح anon) — والبابُ دالّةٌ واحدة `verify_certificate` مُتاحةٌ للزائر،
// لا قراءةٌ من الجدول (RLS يمنعها). فما يخرج من هذا الباب هو ما قرّرته الدالّة لا أكثر.
const anon = () =>
  createAdeebServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export type VerifyResult =
  | { state: "empty" }
  | { state: "missing" }
  | { state: "error"; message: string }
  | {
      state: "valid" | "revoked";
      serial: string;
      holderName: string;
      positionTitle: string;
      periodFrom: string;
      periodTo: string;
      issuedOn: string;
      revokedOn: string | null;
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
    period_from?: string; period_to?: string; issued_on?: string; revoked_on?: string | null;
  };
  if (!r.found) return { state: "missing" };

  return {
    state: r.valid ? "valid" : "revoked",
    serial: r.serial ?? serial,
    holderName: r.holder_name ?? "",
    positionTitle: r.position_title ?? "",
    periodFrom: r.period_from ?? "",
    periodTo: r.period_to ?? "",
    issuedOn: r.issued_on ?? "",
    revokedOn: r.revoked_on ?? null,
  };
}
