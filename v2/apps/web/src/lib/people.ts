import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import type { PersonOption } from "@adeeb/design-system";

/**
 * **بِركةُ النسبة: من يجوز أن يُنسَب إليه عمل.**
 *
 * أهلُ أدِيب على بابين — **عضوٌ ساري العضويّة** و**متطوّعٌ قائم** — ولا ثالثَ لهما ههنا:
 * صاحبُ الحساب المجرّد (٣١١ حسابًا نشطًا مقابل ١٦٢ في هذه البِركة) **صديقُ أدِيب**: لا يُنسَب
 * إليه عملُ النادي بمجرّد أنّه سجّل.
 *
 * والحدُّ **الساري لا كلُّ من مرّ**: الموقوفُ والمنتهيةُ عضويّتُه يخرجان، على سَنن سائر
 * كشوف الأعضاء في اللوحة (والنخلُ في المصدر لا في الشاشات).
 *
 * **والاسمُ هو القيمة**: المحفوظُ في `news.authors` وأخواتِها نصٌّ كما كان، فاختيارُ
 * الشخص من هذه البِركة يضمن الهجاءَ ولا يُنشئ ارتباطًا. وإذا تشابه اسمان (وفي السجلّ
 * اليوم اسمٌ لحسابين) طُوِيا في مدخلٍ واحد: القيمةُ واحدةٌ فلا معنى لصفّين يكتبانها.
 */
export type CreditPerson = PersonOption & { avatarUrl: string | null; gender: string | null };

export const MEMBERS_GROUP = "أعضاء أدِيب";
export const VOLUNTEERS_GROUP = "متطوّعو أدِيب";

export async function getCreditPeople(): Promise<CreditPerson[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return [];
  const sb = createAdeebServiceClient(url, key);

  const [mRes, vRes, urRes, cRes] = await Promise.all([
    sb.from("profiles").select("id, full_name, avatar_url, gender, joined_date, account_status")
      .eq("account_status", "active").not("joined_date", "is", null),
    sb.from("volunteers").select("user_id").eq("status", "active"),
    sb.from("user_roles").select("user_id, committee_id").eq("is_active", true).not("committee_id", "is", null),
    sb.from("committees").select("id, committee_name_ar"),
  ]);

  const committeeName = new Map((cRes.data ?? []).map((c) => [c.id as number, c.committee_name_ar as string]));
  // وحدةُ العضو تُقال تحت اسمه لتفصل بين متشابهَي الاسم — وأوّلُ صفٍّ يكفي: هي تمييزٌ
  // للعين لا بيانُ منصب، ولذلك لا تُركَّب ههنا جملةُ المنصب (مصدرُها `positionLabel`).
  const unitOf = new Map<string, string>();
  for (const r of urRes.data ?? []) {
    const nm = committeeName.get(r.committee_id as number);
    if (nm && !unitOf.has(r.user_id as string)) unitOf.set(r.user_id as string, nm);
  }

  const volunteerIds = new Set((vRes.data ?? []).map((v) => v.user_id as string));
  const members = (mRes.data ?? []) as { id: string; full_name: string | null; avatar_url: string | null; gender: string | null }[];
  const memberIds = new Set(members.map((m) => m.id));

  // المتطوّعون يُجلَبون بعد أن عُرفت أسماؤهم: صفُّ `volunteers` معرّفٌ وحده.
  const onlyVolunteers = [...volunteerIds].filter((id) => !memberIds.has(id));
  const { data: vProfiles } = onlyVolunteers.length
    ? await sb.from("profiles").select("id, full_name, avatar_url, gender")
        .in("id", onlyVolunteers).eq("account_status", "active")
    : { data: [] as typeof members };

  const out: CreditPerson[] = [];
  const seen = new Set<string>();
  const push = (p: { full_name: string | null; avatar_url: string | null; gender: string | null }, group: string, hint?: string) => {
    const name = (p.full_name ?? "").trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    out.push({ name, hint, group, avatarUrl: p.avatar_url, gender: p.gender });
  };

  const ar = (a: string, b: string) => a.localeCompare(b, "ar");
  for (const m of [...members].sort((a, b) => ar(a.full_name ?? "", b.full_name ?? ""))) {
    push(m, MEMBERS_GROUP, unitOf.get(m.id));
  }
  for (const v of [...(vProfiles ?? [])].sort((a, b) => ar(a.full_name ?? "", b.full_name ?? ""))) {
    push(v, VOLUNTEERS_GROUP, "متطوّع");
  }
  return out;
}
