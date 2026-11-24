import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import type { PersonOption } from "@adeeb/design-system";
import { actingLine, positionLine, rankFor } from "./positionLabel";

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
/** `id` معرّفُ الملفّ — لمن يربط الشخصَ بحسابه لا باسمه (ضيوفُ الفعاليّة، ٢٠٢٦-١١-١٥)؛ والنسبةُ تبقى بالاسم */
export type CreditPerson = PersonOption & { avatarUrl: string | null; gender: string | null; id?: string };

export const MEMBERS_GROUP = "أعضاء أدِيب";
export const VOLUNTEERS_GROUP = "متطوّعو أدِيب";

export async function getCreditPeople(): Promise<CreditPerson[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return [];
  const sb = createAdeebServiceClient(url, key);

  const [mRes, vRes, urRes, cRes, clubRes] = await Promise.all([
    sb.from("profiles").select("id, full_name, avatar_url, gender, joined_date, account_status")
      .eq("account_status", "active").not("joined_date", "is", null),
    sb.from("volunteers").select("user_id").eq("status", "active"),
    // الأصيلُ قبل التكليف (20261010): الوحدةُ المميِّزة وحدةُ موضعه
    sb.from("user_roles").select("user_id, committee_id").eq("is_active", true).not("committee_id", "is", null).order("is_acting", { ascending: true }),
    sb.from("committees").select("id, committee_name_ar"),
    // **حسابُ النادي مؤسّسةٌ لا شخص** (المالك ٢٠٢٦-١٠-١٨): لا يُنسب إليه خبرٌ ولا صورة، فيُستثنى من بِركة النسبة (٢٠٢٦-١١-١٣)
    sb.from("user_roles").select("user_id").eq("role_name", "adeeb_admin").eq("is_active", true),
  ]);
  const club = new Set((clubRes.data ?? []).map((r) => r.user_id as string));

  const committeeName = new Map((cRes.data ?? []).map((c) => [c.id as number, c.committee_name_ar as string]));
  // وحدةُ العضو تُقال تحت اسمه لتفصل بين متشابهَي الاسم — وأوّلُ صفٍّ يكفي: هي تمييزٌ
  // للعين لا بيانُ منصب، ولذلك لا تُركَّب ههنا جملةُ المنصب (مصدرُها `positionLabel`).
  const unitOf = new Map<string, string>();
  for (const r of urRes.data ?? []) {
    const nm = committeeName.get(r.committee_id as number);
    if (nm && !unitOf.has(r.user_id as string)) unitOf.set(r.user_id as string, nm);
  }

  const volunteerIds = new Set((vRes.data ?? []).map((v) => v.user_id as string));
  const members = ((mRes.data ?? []) as { id: string; full_name: string | null; avatar_url: string | null; gender: string | null }[]).filter((m) => !club.has(m.id));
  const memberIds = new Set(members.map((m) => m.id));

  // المتطوّعون يُجلَبون بعد أن عُرفت أسماؤهم: صفُّ `volunteers` معرّفٌ وحده.
  const onlyVolunteers = [...volunteerIds].filter((id) => !memberIds.has(id));
  const { data: vProfiles } = onlyVolunteers.length
    ? await sb.from("profiles").select("id, full_name, avatar_url, gender")
        .in("id", onlyVolunteers).eq("account_status", "active")
    : { data: [] as typeof members };

  const out: CreditPerson[] = [];
  const seen = new Set<string>();
  const push = (p: { id: string; full_name: string | null; avatar_url: string | null; gender: string | null }, group: string, hint?: string) => {
    const name = (p.full_name ?? "").trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    out.push({ name, hint, group, avatarUrl: p.avatar_url, gender: p.gender, id: p.id });
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

/**
 * **المنصبُ تحت الاسم لا الوحدة** — لمنتقٍ يختار لمقعد قيادة (فريقُ الرؤية، ٢٠٢٦-١١-٢٢): «قائدة لجنة السُفراء»
 * لا «لجنة السُفراء»، و«الرئيسة التنفيذية» و«رئيس أدِيب» وكانا بلا وصف (مقعداهما بلا لجنة).
 *
 * المسمّى كما تقوله `position_title_of` في القاعدة: رتبةُ كلّ مقعدٍ حيّ ووحدةُ إسناده، والتكليفُ بلفظه آخرًا،
 * والمقاعدُ موصولةٌ بالواو (الأصيلُ قبل التكليف ثمّ الأقدم) — ويُؤنَّث كلُّ مقعدٍ بجنس صاحبه (`rankFor`)، وهو ما لا تفعله الدالّة.
 * ومن لا مقعدَ حيًّا له يبقى وصفُه الأوّل (وحدتُه، أو «متطوّع»).
 */
export async function withPositionTitles(people: CreditPerson[]): Promise<CreditPerson[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key || !people.length) return people;
  const sb = createAdeebServiceClient(url, key);

  const [urRes, rRes, cRes, dRes] = await Promise.all([
    // الحيُّ كما في الدالّة: الساري، والمجمَّدُ ما دام مجمَّدًا
    sb.from("user_roles").select("user_id, role_name, committee_id, department_id, is_acting, assigned_at")
      .or("is_active.eq.true,frozen_by.not.is.null"),
    sb.from("roles").select("role_name, role_name_ar"),
    sb.from("committees").select("id, committee_name_ar"),
    sb.from("departments").select("id, name_ar"),
  ]);
  if (urRes.error || rRes.error || cRes.error || dRes.error) return people;

  const rankAr = new Map((rRes.data ?? []).map((r) => [r.role_name as string, (r.role_name_ar as string | null) ?? ""]));
  const committee = new Map((cRes.data ?? []).map((c) => [c.id as number, c.committee_name_ar as string]));
  const dept = new Map((dRes.data ?? []).map((d) => [d.id as number, d.name_ar as string]));

  type Seat = { acting: boolean; at: string; title: string };
  const seats = new Map<string, Seat[]>();
  for (const r of (urRes.data ?? []) as { user_id: string; role_name: string; committee_id: number | null; department_id: number | null; is_acting: boolean | null; assigned_at: string | null }[]) {
    const unit = r.committee_id != null ? committee.get(r.committee_id) : r.department_id != null ? dept.get(r.department_id) : null;
    const title = positionLine(rankAr.get(r.role_name), unit);
    if (!title) continue;
    const list = seats.get(r.user_id) ?? [];
    list.push({ acting: !!r.is_acting, at: r.assigned_at ?? "", title });
    seats.set(r.user_id, list);
  }

  return people.map((p) => {
    const list = p.id ? seats.get(p.id) : undefined;
    if (!list?.length) return p;
    const line = [...list]
      .sort((a, b) => Number(a.acting) - Number(b.acting) || a.at.localeCompare(b.at))
      .map((s) => actingLine(rankFor(s.title, p.gender), s.acting))
      .join(" و");
    return { ...p, hint: line };
  });
}
