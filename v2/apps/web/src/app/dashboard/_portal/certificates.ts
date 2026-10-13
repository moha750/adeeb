import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import type { MyCertificate } from "@/app/me/volunteering";
import { counted } from "./time";

/**
 * **قارئُ «شهاداتي»**: يجمع لصاحب الحساب شهاداتِه كلَّها في قائمةٍ واحدة بنوعها:
 * مشاركاتُ تطوّعه (من `getMyVolunteering`)، وخبرتُه في لجان أدِيب (`experience_certificates`
 * السارية، وتبقى لمن خرج من العضويّة فصار صديقًا). والحضورُ في الفعاليّات نوعٌ ثالثٌ ينتظر قالبَه.
 *
 * وكلُّ ورقةٍ **لقطةٌ** من يوم إصدارها، فتُرسَم كما نُزّلت أوّل مرّة.
 */

export type CertKind = "vol" | "exp";
export type PortalCert = {
  id: string;
  kind: CertKind;
  title: string;
  serial: string;
  /** سطرُ الورقة المختارة: نوعُها وساعاتُها وتاريخُها */
  meta: string[];
  hours: number | null;
  date: string;
  star: boolean;
  quote: string | null;
  paper:
    | { as: "participation"; c: { name: string; serial: string; opportunity: string; gender: "male" | "female" | null; from: string; to: string; hours: number | null; distinction: string | null } }
    | { as: "letter"; c: { name: string; serial: string; position: string; gender: "male" | "female" | null; from: string; to: string } };
};

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

const hoursLabel = (h: number) => counted(h, "ساعة", "ساعتان", "ساعات", "ساعة");
/** مدّةُ الخبرة بسنواتها: «2025 إلى 2026»، أو سنةٌ واحدة إن لم تتجاوزها. */
const years = (from: string, to: string) => (from.slice(0, 4) === to.slice(0, 4) ? from.slice(0, 4) : `${from.slice(0, 4)} إلى ${to.slice(0, 4)}`);

export async function getMyCertificates(
  userId: string,
  gender: "male" | "female" | null,
  participation: MyCertificate[],
): Promise<{ certs: PortalCert[]; error: string | null }> {
  const vol: PortalCert[] = participation.map((c) => ({
    id: c.id,
    kind: "vol",
    title: c.opportunityTitle,
    serial: c.serial,
    meta: ["تطوّع", ...(c.hours ? [hoursLabel(c.hours)] : []), c.distinction ? "بتميّز" : c.issuedLabel],
    hours: c.hours,
    date: c.issuedLabel,
    star: !!c.distinction,
    quote: c.distinction,
    paper: { as: "participation", c: { name: c.holderName, serial: c.serial, opportunity: c.opportunityTitle, gender: c.gender ?? gender, from: c.servedFrom, to: c.servedTo, hours: c.hours, distinction: c.distinction } },
  }));

  const sb = service();
  if (!sb) return { certs: vol, error: "تعذّر الوصول إلى شهادات الخبرة الآن." };
  const { data, error } = await sb
    .from("experience_certificates")
    .select("id, serial, holder_name, paper_name, position_title, period_from, period_to, created_at")
    .eq("user_id", userId).eq("status", "valid").order("created_at", { ascending: false });
  if (error) return { certs: vol, error: "تعذّر جلبُ شهادات الخبرة الآن." };

  const exp: PortalCert[] = ((data ?? []) as {
    id: string; serial: string; holder_name: string; paper_name: string | null; position_title: string;
    period_from: string; period_to: string; created_at: string;
  }[]).map((c) => ({
    id: c.id,
    kind: "exp",
    title: c.position_title,
    serial: c.serial,
    meta: ["خبرة", years(c.period_from, c.period_to)],
    hours: null,
    date: years(c.period_from, c.period_to),
    star: false,
    quote: null,
    // الورقةُ باسمه اليوم إن تغيّر بعد الإصدار (`paper_name`)، كما في «عضويتي»
    paper: { as: "letter", c: { name: c.paper_name ?? c.holder_name, serial: c.serial, position: c.position_title, gender, from: c.period_from, to: c.period_to } },
  }));
  return { certs: [...vol, ...exp], error: null };
}
