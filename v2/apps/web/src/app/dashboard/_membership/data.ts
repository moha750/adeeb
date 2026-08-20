// عضويّة **صاحب الجلسة** — خادميّ حصرًا (مفتاح الخدمة بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح).
//
// لا يقرأ إلّا سجلّ صاحب الجلسة: هويّته من `getCurrentAdmin` (عميل الجلسة)، ثمّ استعلاماتٌ
// مقيَّدة بمعرّفه. فليس هنا بابٌ لقراءة عضويّة غيره ولو بُدِّل معامل.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { getCurrentAdmin } from "@/lib/auth";
import { fmtDateOnly, fmtDate } from "@/lib/dates";
import { MEMBER_STATUS_OF, type MemberStatus } from "@/lib/memberStatus";
import { roleRank } from "@/lib/roleOrder";
import { positionLine, positionParts } from "@/lib/positionLabel";

/** محطّةٌ في المسيرة: الانضمام، أو تولّي منصب. */
export type JourneyStop = {
  key: string;
  kind: "join" | "role";
  title: string;
  scope: string | null; // وحدات المنصب (لجنة/قسم) أو مجلسه — مفصولةٌ بـ« · » إن تعدّدت
  date: string;         // منسّق للعرض
  at: number;           // للفرز الزمنيّ
  current: boolean;     // منصبٌ قائمٌ الآن
};

export type Membership = {
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  status: MemberStatus;
  // الموضع الحاليّ **بوحدته** (٢٠٢٦-٠٨-١٠، قرار المالك): «قائد لجنة الفعاليات» لا «قائد» مجرّدة —
  // فالرتبةُ ووحدتُها خبرٌ واحد يُقرأ بمسافة (`positionLine`).
  // **ولا سلسلةَ انتماءٍ فوقها** (٢٠٢٦-٠٨-٠٨): لا مجلسَ ولا قسمًا فوق اللجنة؛ ذاك مقولٌ في
  // `journey` وفي شجرة الهيكلة. وذهب معه `chainOf` وخريطةُ `committeeDept` التي لم تخدم سواه.
  role: string | null;
  // (الإشراف لا يُقال هنا — تكليفٌ لا منصب، ومكانُه تبويب «من أشرف عليهم» بكرتٍ كاملٍ لكلّ لجنة)
  // الزمن
  joined: string;
  duration: string; // «٦ أشهر و١٠ أيام»
  journey: JourneyStop[];
  /** إنذاراتُه السارية — يراها صاحبُها بأسبابها كما كُتبت (قرار المالك). */
  warnings: { id: string; ordinal: number; category: string; reason: string; date: string }[];
  /** حدُّ الإنذارات من القاعدة — لا رقمٌ محفور في الشاشة. */
  warningLimit: number;
  /**
   * شهاداتُ خبرته السارية — **يُنزّلها متى شاء بلا مراجعة أحد**، وهذا أكبرُ ما يكسبه العضو
   * من نقل الشهادة إلى البوّابة. وكلُّ صفٍّ **لقطةٌ** كما رُسمت يومَها، فالورقةُ لا تتبدّل
   * بتبدّل منصبه بعدها.
   */
  certificates: {
    id: string;
    serial: string;
    holderName: string;
    positionTitle: string;
    periodFrom: string;
    periodTo: string;
    date: string;
  }[];
};

/** جمعُ العربيّة: مفرد · مثنّى · جمع قلّة (٣–١٠) · تمييزٌ مفردٌ منصوب (١١+). */
const plural = (n: number, one: string, two: string, few: string, many: string): string =>
  n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`;

/**
 * «٦ أشهر و١٠ أيام» — مدّة العضويّة بالتقويم لا بقسمة الأيام (فالشهور متفاوتة).
 * تُحسب خادميًّا بتاريخ اليوم فتخرج جاهزةً في HTML — لا ساعةَ متصفّحٍ تُخالف الخادم فتُهشّم الترطيب.
 * وتُقال بوحدتين لا ثلاث: «سنة و٣ أشهر» أبلغ من «سنة و٣ أشهر و١٢ يومًا».
 */
export function membershipDuration(isoDate: string | null, todayMs: number): string {
  const [y, m, d] = (isoDate ?? "").split("-").map(Number);
  if (!y || !m || !d) return "";
  const t = new Date(todayMs);
  const [ty, tm, td] = [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
  if (Date.UTC(ty, tm - 1, td) < Date.UTC(y, m - 1, d)) return ""; // تاريخُ انضمامٍ في المستقبل — لا مدّة تُقال

  let years = ty - y;
  let months = tm - m;
  let days = td - d;
  // الاستلاف: أيّامُ الشهر **السابق ليوم اليوم** (يوم 0 من شهر اليوم = آخر أيّام ما قبله)
  if (days < 0) { months -= 1; days += new Date(Date.UTC(ty, tm - 1, 0)).getUTCDate(); }
  if (months < 0) { years -= 1; months += 12; }

  const parts = [
    years ? plural(years, "سنة", "سنتان", "سنوات", "سنة") : null,
    months ? plural(months, "شهر", "شهران", "أشهر", "شهرًا") : null,
    days ? plural(days, "يوم", "يومان", "أيام", "يومًا") : null,
  ].filter(Boolean) as string[];
  return parts.length ? parts.slice(0, 2).join(" و") : "اليوم";
}

/**
 * عضويّة صاحب الجلسة. `null` إن لم تكن هناك جلسة (التخطيط يحوّل للدخول قبل أن نصل هنا)،
 * و`error` إن غاب مفتاح الخدمة أو ردّت القاعدة بخطأ — يُقال ولا يُبتلَع.
 */
export async function getMyMembership(): Promise<{ membership: Membership | null; error: string | null }> {
  const me = await getCurrentAdmin();
  if (!me) return { membership: null, error: null };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { membership: null, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const sb = createAdeebServiceClient(url, key);

  const [pRes, urRes, rRes, dRes, cRes, coRes, wRes, wlRes, certRes] = await Promise.all([
    sb.from("profiles").select("full_name, avatar_url, gender, account_status, joined_date").eq("id", me.id).maybeSingle(),
    // التعيينات كلّها لا النشطة وحدها — المسيرة تروي ما مضى كما تروي ما هو قائم
    sb.from("user_roles").select("role_name, department_id, committee_id, assigned_at, is_active").eq("user_id", me.id),
    sb.from("roles").select("role_name, role_name_ar, council_type, home_committee_id"),
    sb.from("departments").select("id, name_ar"),
    sb.from("committees").select("id, committee_name_ar"),
    sb.from("councils").select("id, name_ar"),
    // إنذاراتُ صاحب الجلسة **السارية** وحدها — الملغى خرج من العدّ فلا يُعاد ذكرُه عليه.
    // ورتبتُها ترتيبُها الزمنيّ (كما تحسبها القاعدة)، فالفرزُ هنا هو نفسه هناك.
    sb.from("member_warnings").select("id, category, reason, created_at").eq("user_id", me.id).eq("status", "active").order("created_at"),
    sb.rpc("warning_limit"),
    // شهاداتُ خبرته السارية — «لكلٍّ شهاداتُ نفسه» بندٌ في `can_view_certificate_of`
    sb.from("experience_certificates")
      .select("id, serial, holder_name, position_title, period_from, period_to, created_at")
      .eq("user_id", me.id).eq("status", "valid").order("created_at", { ascending: false }),
  ]);

  const firstErr = pRes.error || urRes.error || rRes.error || dRes.error || cRes.error || coRes.error || wRes.error || wlRes.error || certRes.error;
  if (firstErr) return { membership: null, error: firstErr.message };
  const p = pRes.data;
  if (!p) return { membership: null, error: "لا سجلّ لحسابك في «الأعضاء». راجِع إدارة الموارد البشريّة." };

  const roleCouncil = new Map((rRes.data ?? []).map((r) => [r.role_name, r.council_type as string | null]));
  const roleHome = new Map((rRes.data ?? []).map((r) => [r.role_name, r.home_committee_id as number | null]));
  const councilName = new Map((coRes.data ?? []).map((c) => [c.id as string, c.name_ar as string | null]));
  const deptName = new Map((dRes.data ?? []).map((d) => [d.id as number, d.name_ar as string | null]));
  const committeeName = new Map((cRes.data ?? []).map((c) => [c.id as number, c.committee_name_ar as string | null]));

  // **شخصٌ لا مقعد**: رتبتُه كما هي، ووحدتُه من خانة إسناده وحدها (20260811)
  const roleAr = new Map((rRes.data ?? []).map((r) => [r.role_name, (r.role_name_ar as string | null) ?? r.role_name]));

  type Assignment = { role_name: string; department_id: number | null; committee_id: number | null; assigned_at: string | null; is_active: boolean | null };
  const assignments = (urRes.data ?? []) as Assignment[];

  /**
   * **منصبٌ واحدٌ لا صفوفٌ عدّة:** من أُسنِد في اللحظة نفسها بالدور نفسه إلى أكثر من وحدة
   * (عضوٌ في لجنتين مثلًا) تُجمَع صفوفه محطّةً واحدة نطاقُها وحداتُها كلّها — لا جدارَ تكرار.
   *
   * وكان أثقلَ الحالات المشرفُ الإداريّ: تسعةُ صفوفٍ لأنّ إشرافه كان يُكتب مناصبَ في اللجان.
   * فُصل الإشراف عن الانتماء (20260731) فصار له صفٌّ واحد، وبقي الجمع لمن يستحقّه حقًّا.
   */
  const groups = new Map<string, { roleName: string; at: string | null; active: boolean; items: Assignment[] }>();
  for (const a of assignments) {
    const k = `${a.role_name}|${a.assigned_at ?? ""}|${a.is_active ? "1" : "0"}`;
    const g = groups.get(k);
    if (g) g.items.push(a);
    else groups.set(k, { roleName: a.role_name, at: a.assigned_at, active: !!a.is_active, items: [a] });
  }

  /** وحدة التعيين: اللجنة، وإلّا القسم. و`null` لمن لا وحدة له (الإدارة العليا). */
  const unitOf = (a: Assignment): string | null =>
    a.committee_id != null ? committeeName.get(a.committee_id) ?? null
      : a.department_id != null ? deptName.get(a.department_id) ?? null
        : null;
  const councilOf = (roleName: string): string | null => {
    const c = roleCouncil.get(roleName);
    return c ? councilName.get(c) ?? null : null;
  };

  const groupList = [...groups.values()];
  // الموضع الحاليّ = أعلى منصبٍ **قائم** بالترتيب القياسيّ (بالاسم لا برقم — أُعدم role_level)
  const current = groupList.filter((g) => g.active).sort((a, b) => roleRank(a.roleName) - roleRank(b.roleName))[0] ?? null;
  /**
   * وحدةُ المنصب القائم كما تُحسب في المسيرة — تُوصل برتبته على البطاقة: «قائد لجنة الفعاليات».
   *
   * **وحدةً واحدةً لا سردًا:** من امتدّ منصبه على وحداتٍ عدّة (عضو ضمانٍ في تسع لجان) تبقى
   * رتبتُه عاريةً هنا وتُسرَد وحداتُه في «مسيرتي» — سطرُ الهويّة لا يحتمل تسعةَ أسماء.
   * ولا تُستبدَل بالمجلس عند غيابها (خلافًا للمسيرة): الإدارةُ العليا يقول اسمُها موضعَها.
   */
  const curUnits = current ? [...new Set(current.items.map(unitOf).filter(Boolean) as string[])] : [];
  const currentUnit = curUnits.length === 1 ? curUnits[0] : null;

  const journey: JourneyStop[] = [
    ...(p.joined_date
      ? [{ key: "join", kind: "join" as const, title: "انضمامك إلى أديب", scope: null, date: fmtDateOnly(p.joined_date), at: Date.parse(`${p.joined_date}T00:00:00Z`), current: false }]
      : []),
    ...groupList.map((g, i) => {
      const units = [...new Set(g.items.map(unitOf).filter(Boolean) as string[])];
      const title = roleAr.get(g.roleName) ?? g.roleName;
      // بلا وحدةٍ يقع المنصب في مجلسه مباشرةً (الإدارة العليا) — فيُقال المجلس لا «غير متوفّر»
      const rawScope = units.length ? units.join("، ") : councilOf(g.roleName);
      // المحطّة تضع الرتبةَ في سطرٍ ونطاقَها تحته، فلا تصلهما — فالقطعتان من المصدر
      // الواحد (`positionParts`) لا نصّان يُركَّبان هنا.
      return {
        key: `role-${i}`,
        kind: "role" as const,
        ...positionParts(title, rawScope),
        date: fmtDate(g.at),
        at: Date.parse(g.at ?? "") || 0,
        current: g.active,
      };
    }),
  ].sort((a, b) => a.at - b.at);

  return {
    membership: {
      name: p.full_name ?? me.fullName ?? "",
      avatar: p.avatar_url ?? null,
      gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
      status: MEMBER_STATUS_OF[p.account_status] ?? "inactive",
      role: current ? positionLine(roleAr.get(current.roleName) ?? current.roleName, currentUnit) : null,
      joined: fmtDateOnly(p.joined_date),
      duration: membershipDuration(p.joined_date, Date.now()),
      journey,
      warnings: ((wRes.data ?? []) as { id: string; category: string; reason: string; created_at: string }[])
        .map((w, i) => ({ id: w.id, ordinal: i + 1, category: w.category, reason: w.reason, date: fmtDate(w.created_at) })),
      warningLimit: typeof wlRes.data === "number" ? wlRes.data : 3,
      certificates: ((certRes.data ?? []) as {
        id: string; serial: string; holder_name: string; position_title: string;
        period_from: string; period_to: string; created_at: string;
      }[]).map((c) => ({
        id: c.id,
        serial: c.serial,
        holderName: c.holder_name,
        positionTitle: c.position_title,
        periodFrom: c.period_from,
        periodTo: c.period_to,
        date: fmtDate(c.created_at),
      })),
    },
    error: null,
  };
}
