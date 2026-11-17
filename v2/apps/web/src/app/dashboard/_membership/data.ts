// عضويّة **صاحب الجلسة** — خادميّ حصرًا (مفتاح الخدمة بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح).
//
// لا يقرأ إلّا سجلّ صاحب الجلسة: هويّته من `getCurrentAdmin` (عميل الجلسة)، ثمّ استعلاماتٌ
// مقيَّدة بمعرّفه. فليس هنا بابٌ لقراءة عضويّة غيره ولو بُدِّل معامل.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { getCurrentAdmin } from "@/lib/auth";
import { fmtDateOnly, fmtDate } from "@/lib/dates";
import { arCount } from "@/lib/arabicCount";
import { MEMBER_STATUS_OF, type MemberStatus } from "@/lib/memberStatus";
import { roleRank } from "@/lib/roleOrder";
import { actingLine, positionLine, positionParts } from "@/lib/positionLabel";
import { membershipDuration } from "@adeeb/core/membership";

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
  warnings: {
    id: string; ordinal: number; category: string; reason: string; date: string;
    /** (٢٠٢٦-١١-١٤) ما يطّلع عليه العضو بنصّ نظام الانضباط (م١٢: «ومن أصدرها ومن ألغاها»، وم٧: تاريخُ الواقعة إلزاميّ) —
     *  ولقطةُ منصبه ولجنته يومَ الإصدار ليُرسم خطابُه كما رسمته الموارد البشريّة */
    occurred: string | null; issuer: string | null; issuedAt: string; roleAr: string | null; committee: string | null;
  }[];
  /**
   * **أوسمتُه** (٢٠٢٦-١١-١٤، «نعم»): تُحسب **حيّةً عند القراءة** بقواعدها في القاعدة (`badge_awards()`، قراءةٌ محضة) — جدولُ
   * `member_badges` كُتب مرّةً في ٢٠٢٦-٠٨-١٠ ولا شيء يحدّثه بعدها. والمقفلُ يظهر إن شاء الوسامُ ذلك (`show_locked`)، ومعه ما بلغه منه.
   */
  badges: { key: string; name: string; how: string; icon: string; earnedOn: string | null; progress: string | null }[];
  /** إنذاراتُه **الملغاة** — تخرج من العدّ وتبقى في سجلّه مشطوبةً (م١٥)، ويطّلع عليها بمن ألغاها وسببه (م١٢) */
  cancelled: { id: string; category: string; reason: string; date: string; cancelledOn: string; canceller: string | null; cancelReason: string | null }[];
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
    sb.from("user_roles").select("role_name, department_id, committee_id, assigned_at, is_active, is_acting, frozen_by").eq("user_id", me.id),
    sb.from("roles").select("role_name, role_name_ar, council_type, home_committee_id"),
    sb.from("departments").select("id, name_ar"),
    sb.from("committees").select("id, committee_name_ar"),
    sb.from("councils").select("id, name_ar"),
    // إنذاراتُ صاحب الجلسة **السارية** وحدها — الملغى خرج من العدّ فلا يُعاد ذكرُه عليه.
    // ورتبتُها ترتيبُها الزمنيّ (كما تحسبها القاعدة)، فالفرزُ هنا هو نفسه هناك.
    // والملغاةُ معها (٢٠٢٦-١١-١٤): يطّلع عليها صاحبُها مشطوبةً (نظام الانضباط م١٢ وم١٥) — والعدُّ والرتبةُ من السارية وحدها كما كان
    sb.from("member_warnings").select("id, category, reason, created_at, occurred_on, issued_by, role_at_issue, committee_id, status, cancelled_by, cancelled_at, cancel_reason")
      .eq("user_id", me.id).in("status", ["active", "cancelled"]).order("created_at"),
    sb.rpc("warning_limit"),
    // شهاداتُ خبرته السارية — «لكلٍّ شهاداتُ نفسه» بندٌ في `can_view_certificate_of`
    sb.from("experience_certificates")
      .select("id, serial, holder_name, paper_name, position_title, period_from, period_to, created_at")
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

  type Assignment = { role_name: string; department_id: number | null; committee_id: number | null; assigned_at: string | null; is_active: boolean | null; is_acting: boolean | null; frozen_by: number | null };
  const assignments = (urRes.data ?? []) as Assignment[];

  /**
   * **منصبٌ واحدٌ لا صفوفٌ عدّة:** من أُسنِد في اللحظة نفسها بالدور نفسه إلى أكثر من وحدة
   * (عضوٌ في لجنتين مثلًا) تُجمَع صفوفه محطّةً واحدة نطاقُها وحداتُها كلّها — لا جدارَ تكرار.
   *
   * وكان أثقلَ الحالات المشرفُ الإداريّ: تسعةُ صفوفٍ لأنّ إشرافه كان يُكتب مناصبَ في اللجان.
   * فُصل الإشراف عن الانتماء (20260731) فصار له صفٌّ واحد، وبقي الجمع لمن يستحقّه حقًّا.
   */
  // والتكليف (20261010) محطّةٌ بلفظها «… تكليفًا»، والأصيلُ المجمَّد قائمٌ لا منتهٍ: مقعدُه محجوزٌ له
  // ويعود إليه حين ينتهي تكليفه، فلا يُروى كمنصبٍ مضى.
  const groups = new Map<string, { roleName: string; at: string | null; active: boolean; acting: boolean; items: Assignment[] }>();
  for (const a of assignments) {
    const live = !!a.is_active || a.frozen_by != null;
    const k = `${a.role_name}|${a.assigned_at ?? ""}|${live ? "1" : "0"}|${a.is_acting ? "t" : ""}`;
    const g = groups.get(k);
    if (g) g.items.push(a);
    else groups.set(k, { roleName: a.role_name, at: a.assigned_at, active: live, acting: !!a.is_acting, items: [a] });
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
  // والأصيلُ قبل التكليف: التكليف فوق الموضع لا هو (20261010)
  const current = groupList.filter((g) => g.active).sort((a, b) => Number(a.acting) - Number(b.acting) || roleRank(a.roleName) - roleRank(b.roleName))[0] ?? null;
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
      ? [{ key: "join", kind: "join" as const, title: "انضمامك إلى أدِيب", scope: null, date: fmtDateOnly(p.joined_date), at: Date.parse(`${p.joined_date}T00:00:00Z`), current: false }]
      : []),
    ...groupList.map((g, i) => {
      const units = [...new Set(g.items.map(unitOf).filter(Boolean) as string[])];
      const title = actingLine(roleAr.get(g.roleName) ?? g.roleName, g.acting) ?? g.roleName;
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

  type WarnRow = {
    id: string; category: string; reason: string; created_at: string; occurred_on: string | null; issued_by: string | null;
    role_at_issue: string | null; committee_id: number | null; status: string; cancelled_by: string | null; cancelled_at: string | null; cancel_reason: string | null;
  };
  const allW = (wRes.data ?? []) as WarnRow[];
  const activeW = allW.filter((w) => w.status === "active");
  const cancelledW = allW.filter((w) => w.status === "cancelled").reverse();
  // أسماءُ من أصدر ومن ألغى — من سجلّ الأعضاء بمفتاح الخدمة، مقيَّدةً بمعرّفات إنذاراته هو وحده
  const peopleIds = [...new Set(allW.flatMap((w) => [w.issued_by, w.cancelled_by]).filter((x): x is string => !!x))];
  const people = peopleIds.length ? (await sb.from("profiles").select("id, full_name").in("id", peopleIds)).data ?? [] : [];
  const personName = new Map(people.map((x) => [x.id as string, (x.full_name as string | null) ?? null]));
  const nameOf = (id: string | null) => (id ? personName.get(id) ?? null : null);

  // الأوسمة: قواعدُها في القاعدة وحدها (مصدرٌ واحد)، والاستحقاقُ يُصفّى لصاحب الجلسة هنا
  const [bRes, awRes, attRes] = await Promise.all([
    // المحسوبةُ وحدها: `badge_awards()` لا يعرف غيرها، فالوسامُ اليدويُّ (إن جاء) يبقى مقفلًا أبدًا هنا لو قُرئ
    sb.from("badges").select("badge_key, name_ar, description_ar, icon, rule_key, threshold, show_locked, sort_order, id").eq("is_active", true).eq("kind", "computed").order("sort_order"),
    sb.rpc("badge_awards"),
    // عدُّ الحضور بقاعدة المحرّك نفسِها (`attended_at` قائم) — وإلّا قرأ «حضرت 3 من 3» والوسامُ مقفل
    sb.from("activity_reservations").select("id", { count: "exact", head: true }).eq("user_id", me.id).eq("attendance_status", "attended").not("attended_at", "is", null),
  ]);
  type Award = { user_id: string; badge_id: string; earned_at: string };
  const mine = new Map(((awRes.data ?? []) as Award[]).filter((x) => x.user_id === me.id).map((x) => [x.badge_id, x.earned_at]));
  const attended = attRes.count ?? 0;
  const tenureDays = p.joined_date ? Math.floor((Date.now() - Date.parse(`${p.joined_date}T00:00:00Z`)) / 86_400_000) : 0;
  type BadgeRow = { id: string; badge_key: string; name_ar: string; description_ar: string; icon: string; rule_key: string; threshold: number; show_locked: boolean };
  // وإن تعذّرت قراءةٌ منها غاب القسمُ كلُّه: أوسمةٌ منالةٌ تُعرض مقفلةً بـ«حضرت 0» معلومةٌ خاطئة، لا قسمٌ فارغ
  const badgesFailed = !!(bRes.error || awRes.error || attRes.error);
  const badges = badgesFailed ? [] : ((bRes.data ?? []) as BadgeRow[])
    .filter((b) => mine.has(b.id) || b.show_locked)
    .map((b) => {
      const at = mine.get(b.id) ?? null;
      // ما بلغه من المقفل — للعدديّ وحده (الحضور والمدّة)؛ والقيادةُ والترشّحُ نعم أو لا
      const progress = at ? null
        : b.rule_key === "events_attended" ? `حضرت ${attended} من ${b.threshold}`
          : b.rule_key === "tenure_days" ? `بقي ${arCount(Math.max(1, b.threshold - tenureDays), ["يومٌ واحد", "يومان", "أيّام", "يومًا"])}`
            : null;
      return { key: b.badge_key, name: b.name_ar, how: b.description_ar, icon: b.icon, earnedOn: at ? fmtDate(at) : null, progress };
    })
    // المنالُ أوّلًا بترتيب الأوسمة، ثمّ المقفل
    .sort((x, y) => Number(!x.earnedOn) - Number(!y.earnedOn));

  return {
    membership: {
      name: p.full_name ?? me.fullName ?? "",
      avatar: p.avatar_url ?? null,
      gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
      status: MEMBER_STATUS_OF[p.account_status] ?? "inactive",
      role: current ? actingLine(positionLine(roleAr.get(current.roleName) ?? current.roleName, currentUnit), current.acting) : null,
      joined: fmtDateOnly(p.joined_date),
      duration: membershipDuration(p.joined_date, Date.now()),
      journey,
      warnings: activeW.map((w, i) => ({
        id: w.id, ordinal: i + 1, category: w.category, reason: w.reason, date: fmtDate(w.created_at),
        occurred: w.occurred_on ? fmtDateOnly(w.occurred_on) : null, issuer: nameOf(w.issued_by), issuedAt: w.created_at,
        roleAr: w.role_at_issue ? roleAr.get(w.role_at_issue) ?? w.role_at_issue : null,
        committee: w.committee_id != null ? committeeName.get(w.committee_id) ?? null : null,
      })),
      badges,
      cancelled: cancelledW.map((w) => ({
        id: w.id, category: w.category, reason: w.reason, date: fmtDate(w.created_at),
        cancelledOn: fmtDate(w.cancelled_at), canceller: nameOf(w.cancelled_by), cancelReason: w.cancel_reason,
      })),
      warningLimit: typeof wlRes.data === "number" ? wlRes.data : 3,
      certificates: ((certRes.data ?? []) as {
        id: string; serial: string; holder_name: string; paper_name: string | null; position_title: string;
        period_from: string; period_to: string; created_at: string;
      }[]).map((c) => ({
        id: c.id,
        serial: c.serial,
        // الورقةُ تُرسَم باسمه اليوم إن تغيّر بعد الإصدار (`paper_name`، ٢٠٢٦-١٠-٠١)، والتحقّقُ يعرف ما قبله
        holderName: c.paper_name ?? c.holder_name,
        positionTitle: c.position_title,
        periodFrom: c.period_from,
        periodTo: c.period_to,
        date: fmtDate(c.created_at),
      })),
    },
    error: null,
  };
}
