"use client";

/**
 * غرفةُ «أعضاء أدِيب» على قالب «قائمة السجلّات» بكرت الشخص (٢٠٢٦-١١-٠٣) — السلوكُ سلوكُ `members/MembersView.tsx` القديم،
 * والشكلُ شكلُ المختبر الذي أقرّه محمد (`dashboard/ad/people`):
 * الموضعان «أعضاء» و«سابقون» (الثاني لمن يملك `view_suspended_members`، ويُفتح عليه بـ`?tab=former` كما كان)، والبحثُ بالاسم
 * والبريد والجوّال والدور واللجنة والقسم، ومرشّحاتُ الدور والقسم واللجنة والجنس والسبب، وأفعالُ الصفّ بشروطها من القاعدة
 * (`canEnd` و`canEdit` و`canWarn` و`canCertify` و`canMove`)، ونوافذُها كلُّها من مصدرها الواحد (`members/MemberDialogs.tsx`).
 *
 * **ومشتركةٌ بين شاشات الأشخاص** («من أشرف عليهم»، «قسمي»، «لجنتي»): خصائصُها خصائصُ `MembersView` (`mode` و`readOnly`
 * و`contact` و`lockedStatus` و`emptyNote`…)، فتنتقل إليها تلك الشاشاتُ حين يُحسم شكلُ تبويب لجانها.
 */
import type { RoomView } from "../view";
import { MEMBERS_ROOM } from "./members.meta";
import { useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { matchesSearch } from "@adeeb/design-system";
import {
  Buildings, CalendarCheck, CalendarPlus, CalendarX, Certificate, ChatCenteredText, Envelope, Handshake, Phone, ShieldWarning, User, UserCircle,
  Compass, Crown, CrownSimple, ShieldCheck, UsersThree, WhatsappLogo,
} from "@phosphor-icons/react";
import { ArrowCounterClockwise, ArrowsClockwise, Eye, PencilSimple, Prohibit } from "@/app/_components/glyphs";
import { positionLine } from "@/lib/positionLabel";
import { waHref } from "@/lib/whatsapp";
import { arCount, type ArForms } from "@/lib/arabicCount";
import type { MemberRow, MemberStatus, MoveTarget } from "@/app/dashboard/members/data";
import { GENDERS, TERMINATION_KINDS } from "@/app/dashboard/members/vocab";
import { useMemberDialogs } from "@/app/dashboard/members/MemberDialogs";
import { AdActs, AdBadge, AdCard, AdConfirm, AdRow, AdSeats, type AdAction, type AdFace, type AdMeta, type AdOp, type AdSeat } from "../primitives";
import type { CommitteeLead, HeadSeat, SeatPerson } from "./committee-lead";
import { CollectionRoom, type FilterDef, type Position } from "../collection";
import { fmtDayFull } from "../format";

const AR_MEMBER: ArForms = ["عضوٌ واحد", "عضوان", "أعضاء", "عضوًا"];
const AR_COMMITTEE: ArForms = ["لجنةٌ واحدة", "لجنتان", "لجان", "لجنةً"];

/** عنوانُ الغرفة واسمُ ناسها بالحالة المثبّتة — كما في القديمة. */
const SECTION: Record<"all" | MemberStatus, { title: string; noun: string }> = {
  all: { title: "كل الأعضاء", noun: "عضو" },
  active: { title: "أعضاء أدِيب", noun: "عضو" },
  suspended: { title: "أعضاء سابقون", noun: "عضو سابق" },
  inactive: { title: "غير النشطين", noun: "عضو" },
};

/** قيمةُ «من لا جنسَ في سجلّه» في مرشّح الجنس — رمزٌ صريحٌ لا خالٍ، فالخالي هو «الكلّ». */
const GENDER_NONE = "none";

/** مفتاحُ الموضع في الرابط (`?pos=`): «سابقون» `former`، كما كان المسارُ القديم يُفتح بـ`?tab=former`. */
const posKey = (s: MemberStatus) => (s === "suspended" ? "former" : s);

const uniqOpts = (vals: (string | null)[]) =>
  [...new Set(vals.filter((v): v is string => !!v))].map((v) => ({ value: v, label: v }));

export function MembersRoom({
  members: input, lockedStatus, mode, readOnly = false, emptyNote, contact = false,
  warningLimit = 3, moveTargets = [], formerTab = false, initialTab = "active", navPath = MEMBERS_ROOM.navPath, view,
  committees, title: titleProp, groupLink, emptyTitle, viewKey = MEMBERS_ROOM.viewKey, unitHead, viewerId, seatRows = [], seatContact = contact,
}: {
  members: MemberRow[];
  /** الحالةُ المثبّتة: كشفُ حالةٍ واحدة (`active`، أو `suspended` لكشف «من غادر» في «من أشرف عليهم»). بلاها: الكلّ بلا مواضع. */
  lockedStatus?: MemberStatus;
  /** شاشة «من أشرف عليهم» — عنوانُها ونصُّ فراغها. */
  mode?: "reach";
  /** **عرضٌ محض** («قسمي»، «لجنتي»): سلطةُ كلّ صفٍّ تُقرأ صفرًا، فلا يبقى إلّا «الملفّ الشخصيّ» (و«التواصل» حيث يُطلب)، ولا تحديد. */
  readOnly?: boolean;
  /** نصُّ الفراغ حين يعرف المستدعي نطاقَه أدقَّ («لا أعضاء في لجنتك بعد»). */
  emptyNote?: string;
  /** «التواصل» (واتساب) — لمن يقود أهلَه أو يشرف عليهم، وبشرط الجوّال، وللقائمين لا السابقين. */
  contact?: boolean;
  /** حدُّ الإنذارات — يمرّ إلى نافذة الإصدار. */
  warningLimit?: number;
  /** وجهاتُ النقل — بلاها يسقط «نقل إلى لجنة أخرى». */
  moveTargets?: MoveTarget[];
  /** موضعُ «سابقون» مع `lockedStatus="active"` — لمن يملك `view_suspended_members` وحده. */
  formerTab?: boolean;
  /** الموضعُ الذي تفتح عليه الغرفة (المسارُ القديم «أعضاء سابقون» يحوّل إلى `?tab=former`). */
  initialTab?: "active" | "suspended";
  /** مسارُ الغرفة في خريطة التنقّل (منه الفتاتُ ورمزُ الفراغ) — لشاشات الأشخاص الأخرى حين تنتقل. */
  navPath?: string;
  /**
   * **اللجانُ مواضعُ الغرفة** (محمد ٢٠٢٦-١١-٠٣) — «من أشرف عليهم» و«قسمي» و«لجنتي»: «الكلّ» ثمّ موضعٌ لكلّ لجنةٍ بعدد أعضائها
   * (ولجنةٌ واحدة بلا مبدّل)، ثمّ «السابقون» إن كان في الأعضاء سابقون (من غادر لجانَ المشرف أثناء إشرافه). وقيادةُ اللجنة المختارة
   * سطرٌ فوق الكروت (القائد والنائب والمشرفون، والشاغرُ بلونه)، وفي «الكلّ» ما ينقص القيادةَ من لجان. كانت كروتُ اللجان تبويبًا
   * وحدها («اللجان») فصارت معلومتُها هذا السطر، والسجلُّ إنسانٌ واحدٌ بكرتٍ واحد.
   */
  committees?: CommitteeLead[];
  /** عنوانُ اللوح حين لا يقوله `lockedStatus` (اسمُ القسم أو اللجنة). */
  title?: string;
  /** قروبُ الوحدة على اللوح (قروبُ القسم أو اللجنة) — يُفتح في نافذةٍ جديدة كما كان. */
  groupLink?: { label: string; href: string };
  /** عنوانُ الفراغ حين لا أحد (لمن لا وحدةَ له: «لا قسم تنسّقه»). */
  emptyTitle?: string;
  /** مفتاحُ حفظ العرض — لكلّ غرفةٍ مفتاحُها. */
  viewKey?: string;
  /** رأسُ الوحدة فوق لجانها في صفّ القيادة (منسّقُ القسم في «قسمي»). */
  unitHead?: HeadSeat;
  /** صاحبُ الشاشة — يُعلَّم «أنت» في صفّ القيادة وفي كرته. */
  viewerId?: string;
  /** أصحابُ المقاعد ممّن ليسوا في الكشف (المشرفان، المنسّق) — ليفتح وجهُ المقعد ملفَّ صاحبه. */
  seatRows?: MemberRow[];
  /**
   * **التواصلُ من صفّ القيادة** (محمد ٢٠٢٦-١١-٠٣: «القائدُ والنائبُ يحتاجان أن يتواصلا مع مشرفيهما») — زرُّ واتساب في آخر كلّ تذكرة
   * لغير صاحب الشاشة ولغير الشاغر وبشرط الجوّال. يتبع `contact` افتراضًا، و«قسمي» يطلبه وحده: عرضٌ محضٌ للكشف لكنّ المنسّقَ يصل قياداته.
   */
  seatContact?: boolean;
  serverNow: number;
  view?: RoomView;
}) {
  // منبعٌ واحد للسلطة (كما في القديمة): في العرض المحض تُقرأ صفرًا فتغيب الأفعال كلُّها من الكرت والسطر والنافذة
  const members = useMemo(
    () => (readOnly ? input.map((m) => ({ ...m, canEnd: false, canEdit: false, canWarn: false, canCertify: false, canMove: false })) : input),
    [input, readOnly],
  );
  // نوافذُ العضو من مصدرها الواحد — وتأكيدُ الإعادة بنافذة القالب (`AdConfirm`، بواجهة `ConfirmDialog` نفسِها)
  const { openView, openEdit, openEnd, openMove, openReason, openRestore, openWarning, openCertify, dialogs } =
    useMemberDialogs({ moveTargets, warningLimit, confirm: AdConfirm });

  const withFormer = formerTab && lockedStatus === "active";
  const section = lockedStatus ? SECTION[lockedStatus] : mode === "reach" ? { title: "من أشرف عليهم", noun: "عضو" } : SECTION.all;
  const title = titleProp ?? (withFormer ? SECTION.active.title : section.title);

  // ── اللجانُ مواضع (`committees`) ──
  const sp = useSearchParams();
  const multi = !!committees && committees.length > 1;
  const byCommittee = new Map((committees ?? []).map((c) => [c.id, c]));
  const hasFormer = !!committees && members.some((m) => m.status === "suspended");
  const seat = (m: MemberRow) => {
    const c = m.committeeId != null ? byCommittee.get(m.committeeId) : undefined;
    return c?.leader?.id === m.id ? 0 : c?.deputy?.id === m.id ? 1 : 2;
  };
  const committeeOrder = new Map((committees ?? []).map((c, i) => [c.id, i]));
  const items = committees
    ? [...members].sort((a, b) =>
        Number(a.status === "suspended") - Number(b.status === "suspended")
        || (committeeOrder.get(a.committeeId ?? -1) ?? 99) - (committeeOrder.get(b.committeeId ?? -1) ?? 99)
        || seat(a) - seat(b) || a.name.localeCompare(b.name, "ar"))
    : members;
  const pos = sp.get("pos");
  const selected = pos?.startsWith("c") ? byCommittee.get(Number(pos.slice(1))) : !multi ? committees?.[0] : undefined;
  // القائدُ والنائبُ في صفّ القيادة لا بين الكروت (محمد ٢٠٢٦-١١-٠٣) — إلّا في «القيادات» حيث هم الكشف
  const inSeat = (m: MemberRow) => m.status !== "suspended" && seat(m) < 2;
  const shown = committees && !multi ? items.filter((m) => !inSeat(m)) : items;

  /** **صفُّ القيادة** للجنة المختارة (أو الوحيدة): رأسُ الوحدة إن كان، ثمّ القائد والنائب والمشرفون — والشاغرُ مقعدٌ متقطّع */
  const people = new Map([...seatRows, ...members].map((m) => [m.id, m]));
  const toSeat = (title: string, p: SeatPerson | null, icon?: ReactNode, meta?: AdMeta[]): AdSeat => ({
    title,
    icon,
    meta,
    person: p ? { name: p.name, src: p.avatar, gender: p.gender } : null,
    you: !!p && p.id === viewerId,
    onOpen: p && people.has(p.id) ? () => openView(people.get(p.id)!) : undefined,
    onContact: (() => {
      const phone = p && p.id !== viewerId ? people.get(p.id)?.phone : null;
      return seatContact && phone ? () => window.open(waHref(phone), "_blank", "noopener") : undefined;
    })(),
  });
  /**
   * **لكلّ مقعدٍ سطورُه تحت اسمه، سطورَ الكرت برموزها** (محمد ٢٠٢٦-١١-٠٣: «الاتّساقُ البصريّ») — القائدُ والنائبُ والمنسّقُ منذ متى
   * («منذ 17 أبريل 2026»، و«تكليفًا منذ…» للمكلَّف)، والمشرفُ إدارتُه باسمها كاملًا سطرًا ومنذ متى سطرًا. والشاغرُ لغتُه:
   * «لم يُنتخب بعد» أو «لم يُعيَّن بعد».
   */
  const sinceOf = (p: SeatPerson | null, vacant: string): AdMeta[] => {
    const text = !p ? vacant : p.since ? `${p.acting ? "تكليفًا منذ" : "منذ"} ${fmtDayFull(p.since)}` : p.acting ? "تكليفًا" : null;
    return text ? [{ icon: <CalendarCheck />, text, tone: p ? undefined : "muted" }] : [];
  };
  const headSeat = (h: HeadSeat) => toSeat("المنسّق", h.person, <Compass />, [{ icon: <Buildings />, text: h.unit }, ...sinceOf(h.person, "لم يُعيَّن بعد")]);
  // ومقعدُ المنسّق لا يتكرّر في كلّ لجنة: ثابتٌ لا يتغيّر بتغيّرها، وهو صاحبُ الشاشة — مكانُه «الأعضاء» و«القيادات» (محمد ٢٠٢٦-١١-٠٣)
  // والقائدُ والنائبُ سطرُهما الأوّل قسمُ لجنتهما كما المشرفُ إدارتُه — فلكلّ مقعدٍ سطران: جهتُه ثمّ منذ متى
  const deptLine = (c: CommitteeLead): AdMeta[] => (c.dept ? [{ icon: <Buildings />, text: c.dept }] : []);
  const seatsOf = (c: CommitteeLead): AdSeat[] => [
    toSeat("القائد", c.leader, <Crown />, [...deptLine(c), ...sinceOf(c.leader, c.leaderElected ? "لم يُنتخب بعد" : "لم يُعيَّن بعد")]),
    toSeat("النائب", c.deputy, <CrownSimple />, [...deptLine(c), ...sinceOf(c.deputy, "لم يُعيَّن بعد")]),
    // المشرفُ سطران: إدارتُه ثمّ منذ متى. (جُرّب ٢٠٢٦-١١-٠٣ أن تكون الإدارةُ في اسم المقعد «مشرف إدارة الموارد البشرية» ليستوي السطرُ
    // الواحد في الكروت الأربعة — فقال محمد: «قبلُ كان أجمل»؛ ورُدّ أن يُزاد للقائد والنائب قسمُ اللجنة: معلومتُها لا معلومتُهما، ومكرّرة)
    ...c.supervisors.map((x) => toSeat("المشرف", x.person, <ShieldCheck />, [{ icon: <Buildings />, text: x.unit }, ...sinceOf(x.person, "لم يُعيَّن بعد")])),
  ];
  /**
   * **ما ينقص اللجانَ سطرٌ في «الأعضاء» و«القيادات»** (حيث لا صفَّ للجنةٍ بعينها): «ينقص لجنتان: لجنة التصوير (بلا نائب)…» —
   * وفي اللجنة المختارة يقولها صفُّ القيادة نفسُه بمقاعده المتقطّعة، فلا سطر.
   */
  const vacancies = (c: CommitteeLead) => [
    ...(!c.leader && !c.deputy ? ["بلا قائد ولا نائب"] : !c.leader ? ["بلا قائد"] : !c.deputy ? ["بلا نائب"] : []),
    ...c.supervisors.filter((x) => !x.person).map((x) => `بلا مشرف من ${x.unit}`),
  ];
  const gaps = (committees ?? []).filter((c) => vacancies(c).length);
  const gapText = gaps.length
    ? `ينقص ${arCount(gaps.length, AR_COMMITTEE)}: ${gaps.map((c) => `${c.name} (${vacancies(c).join("، ")})`).join("، ")}.`
    : null;
  const notice = !committees || pos === "former"
    ? undefined
    : selected
      ? <AdSeats label={`قيادة ${selected.name}`} seats={seatsOf(selected)} gaps={null} />
      // وفي «الأعضاء» و«القيادات»: رأسُ الوحدة وما ينقص لجانَها في صفٍّ واحد (كانا صندوقين: صفٌّ بمقعدٍ وحيد وسطرٌ أحمر تحته)
      : unitHead || gapText
        ? <AdSeats label={unitHead ? `قيادة ${unitHead.unit}` : "قيادة لجانك"} seats={unitHead ? [headSeat(unitHead)] : []} gaps={gapText} />
        : undefined;
  const extra: AdAction | undefined = groupLink
    ? { label: groupLink.label, icon: <UsersThree />, onClick: () => window.open(groupLink.href, "_blank", "noopener") }
    : undefined;

  /**
   * **المواضعُ حالاتُ العضويّة** (كان فوق القديمة مبدّلُ «أعضاء / سابقون» وكاردُ عددٍ لكلٍّ منهما — «عدد أعضاء أدِيب» و«عضوٌ سابق»):
   * فالعددُ بجانب الموضع يغني عن الكارد. وكشفُ الحالة الواحدة موضعٌ واحدٌ بلا مبدّل، وبلا حالةٍ مثبّتة: الكلّ.
   */
  const byStatus = (s: MemberStatus, label: string): Position<MemberRow> => ({
    key: posKey(s), label, match: (m) => m.status === s, empty: `لا ${SECTION[s].noun} بعد`,
  });
  const committeePositions: Position<MemberRow>[] = !committees ? [] : [
    // «الأعضاء» لا «الكلّ»: القادةُ في «القيادات» وفي صفّ كلّ لجنة، والكشفُ أعضاؤها
    ...(multi || hasFormer ? [{ key: "all", label: "الأعضاء", match: (m: MemberRow) => m.status !== "suspended" && !inSeat(m), empty: "لا أعضاء بعد." }] : []),
    // «القيادات»: قادةُ اللجان ونوّابُهم معًا (محمد ٢٠٢٦-١١-٠٣) — للمنسّق والمشرف على أكثر من لجنة
    ...(multi ? [{ key: "leads", label: "القيادات", match: (m: MemberRow) => inSeat(m), empty: "لا قادةَ ولا نوّابَ بعد." }] : []),
    ...(multi ? committees.map((c) => ({
      key: `c${c.id}`, label: c.name, match: (m: MemberRow) => m.status !== "suspended" && !inSeat(m) && m.committeeId === c.id, empty: "لا أعضاء في هذه اللجنة بعد.",
    })) : []),
    ...(hasFormer ? [{ key: "former", label: "السابقون", match: (m: MemberRow) => m.status === "suspended", empty: emptyNote ?? "لم يغادر أحد." }] : []),
  ];
  const positions: Position<MemberRow>[] = committees
    ? committeePositions
    : withFormer
      ? [byStatus("active", "أعضاء"), byStatus("suspended", "سابقون")]
      : lockedStatus ? [byStatus(lockedStatus, section.title)] : [];

  // خياراتُ المرشّحات مشتقّةٌ من أعضاء الغرفة (كلُّ مواضعها)
  const scope = positions.length ? members.filter((m) => positions.some((p) => p.match(m))) : members;
  const formerScope = scope.filter((m) => m.status === "suspended");
  // ومرشّحاتُ كلّ موضعٍ فيه وحده (كما كانت القديمة تُخفي الدورَ والقسمَ واللجنةَ في «سابقون» وتُظهر «السبب» فيه وحده)
  const onlyActive = committees
    ? (hasFormer ? committeePositions.filter((p) => p.key !== "former").map((p) => p.key) : undefined)
    : withFormer ? [posKey("active")] : undefined;
  const onlyFormer = committees ? (hasFormer ? ["former"] : undefined) : withFormer ? [posKey("suspended")] : undefined;
  const filters: FilterDef<MemberRow>[] = [
    // ولا دورَ ولا قسمَ ولا لجنةَ لكشف السابقين وحده: مقاعدُهم تُخلى بالإنهاء (قرار المالك ٢٠٢٦-١٠-٠٩)
    ...(lockedStatus === "suspended" ? [] : [
      { key: "role", in: onlyActive, label: "الدور", options: uniqOpts(scope.map((m) => m.role)), match: (m: MemberRow, v: string) => m.role === v },
      // ولا قسمَ ولا لجنةَ حين تكون اللجانُ مواضع: المبدّلُ يقولهما
      ...(committees ? [] : [{ key: "dept", in: onlyActive, label: "القسم", options: uniqOpts(scope.map((m) => m.dept)), match: (m: MemberRow, v: string) => m.dept === v },
      { key: "committee", in: onlyActive, label: "اللجنة", options: uniqOpts(scope.map((m) => m.committee)), match: (m: MemberRow, v: string) => m.committee === v }]),
    ]),
    {
      key: "gender",
      label: "الجنس",
      // «غير محدّد» حين يكون في الكشف من لا جنسَ في سجلّه وحده — فلا يقف أحدٌ أمام خيارٍ لا يردّ صفًّا
      options: scope.some((m) => !m.gender) ? [...GENDERS, { value: GENDER_NONE, label: "غير محدّد" }] : GENDERS,
      match: (m, v) => (v === GENDER_NONE ? m.gender == null : m.gender === v),
    },
    // فئةُ سبب الخروج — للسابقين وحدهم، وخياراتُها ما فيهم من فئات بترتيبها الثابت
    ...(withFormer || lockedStatus === "suspended" || hasFormer ? [{
      key: "kind",
      in: onlyFormer,
      label: "السبب",
      options: TERMINATION_KINDS.filter((k) => formerScope.some((m) => (m.endKind ?? "other") === k.value)).map((k) => ({ value: k.value as string, label: k.label as string })),
      match: (m: MemberRow, v: string) => m.status === "suspended" && (m.endKind ?? "other") === v,
    }] : []),
  ];

  const former = (m: MemberRow) => m.status === "suspended";
  const face = (m: MemberRow): AdFace => ({ src: m.avatar, gender: m.gender, name: m.name });
  /** موقعُه شارةً تحت اسمه: الحاليُّ، وللسابق موقعُه الأخير قبل خروجه */
  const where = (m: MemberRow) => {
    const you = !!viewerId && m.id === viewerId ? <AdBadge>أنت</AdBadge> : null;
    // في اللجنة المختارة (أو الوحيدة) كلُّ الكروت أعضاؤها: شارةُ «عضو» على كلٍّ تكرارٌ، فلا شارةَ إلّا «أنت»
    if (committees && !former(m) && (selected || !multi) && !inSeat(m)) return you;
    // القائدُ والنائبُ بتاجٍ في شارتهما (محمد ٢٠٢٦-١١-٠٣: «يُميَّزان عن بقيّة الأعضاء») — رمزٌ لا لون، فاللونُ للحالات
    const s = committees && !former(m) ? seat(m) : 2;
    const icon = s === 0 ? <Crown /> : s === 1 ? <CrownSimple /> : undefined;
    return (
      <>
        <AdBadge icon={icon}>{former(m) ? m.lastPosition ?? "بلا موقع" : positionLine(m.role, m.committee) ?? "بلا موقع"}</AdBadge>
        {you}
      </>
    );
  };
  /** متى انتهت: المدّةُ (كما في المختبر) واليومُ (كان سطرَ «تاريخ إنهاء العضوية» في كرت القديمة وعمودَه في جدولها) */
  const ended = (m: MemberRow) =>
    m.endAgo && m.endDate ? `عضويّةٌ منتهية ${m.endAgo}، في ${m.endDate}` : m.endDate ? `عضويّةٌ منتهية في ${m.endDate}` : "عضويّةٌ منتهية";
  /**
   * **السطورُ مصدرُها واحد** (`meta` في الكرت، و`sub` في السطر): الجوّالُ والبريد؛ وللسابق ما كان يقوله كرتُه وجدولُه بترتيبهما —
   * متى انتهت عضويّتُه (بلا لون: الموضعُ «سابقون» يقولها)، ومن أنهاها، وسببُه سطرًا واحدًا يُفتح كاملًا من «افتح سبب الإنهاء».
   * وما لم يُسجَّل يُقال كما قالته القديمة («غير مسجّل»، «غير مذكور») لا يُسكَت عنه.
   */
  const info = (m: MemberRow): AdMeta[] => former(m)
    ? [
        { icon: <CalendarX />, text: ended(m) },
        m.endBy ? { icon: <User />, text: `بإنهاء ${m.endBy}` } : { icon: <User />, text: "من أنهى العضويّة غير مسجّل", tone: "muted" },
        m.endReason
          ? { icon: <ChatCenteredText />, text: m.endReason, clip: true }
          : { icon: <ChatCenteredText />, text: "سبب الإنهاء غير مذكور", tone: "muted" },
      ]
    : [
        ...(m.phone ? [{ icon: <Phone />, text: m.phone, ltr: true }] : []),
        { icon: <Envelope />, text: m.email, ltr: true },
      ];
  /** رقمُ الكرت = خانةُ السطر: «الانضمام» */
  const joined = (m: MemberRow) => ({ icon: <CalendarPlus />, label: "الانضمام", value: m.joined });

  /**
   * قائمةُ الصفّ القديمة بترتيبها وشروطها (والسلطةُ من القاعدة على كلّ صفّ، لا من صاحب الشاشة):
   * للقائم — التواصلُ (حيث يُطلب وبجوّال، وكان زرًّا في كرته)، ثمّ تعديلُ البيانات، والنقلُ إلى لجنةٍ أخرى، وإصدارُ إنذار (للنشط)،
   * وشهادةُ الخبرة، ثمّ منطقةُ الخطر: النقلُ إلى المتطوّعين (الأخفّ) فإنهاءُ العضويّة — وتأكيدُهما نافذةُ السبب نفسُها.
   * وللسابق — سببُ الإنهاء (كان زرَّ «عرض التفاصيل» في كرته ونقرةَ السبب في جدوله)، ثمّ إعادةُ العضويّة، وشهادةُ الخبرة.
   */
  const ops = (m: MemberRow): AdOp[] => {
    if (former(m)) {
      return [
        { key: "reason", label: "افتح سبب الإنهاء", icon: <Eye />, onClick: () => openReason(m) },
        ...(m.canEnd ? [{ key: "restore", label: "إعادة العضوية", icon: <ArrowCounterClockwise />, onClick: () => openRestore(m) }] : []),
        ...(m.canCertify ? [{ key: "cert", label: "إصدار شهادة خبرة", icon: <Certificate />, onClick: () => openCertify(m) }] : []),
      ];
    }
    const phone = m.phone;
    return [
      ...(contact && phone
        ? [{ key: "wa", label: "التواصل", icon: <WhatsappLogo />, onClick: () => window.open(waHref(phone), "_blank", "noopener") }]
        : []),
      ...(m.canEdit ? [{ key: "edit", label: "تعديل البيانات", icon: <PencilSimple />, onClick: () => openEdit(m) }] : []),
      ...(m.canMove && moveTargets.length > 0
        ? [{ key: "move", label: "نقل إلى لجنة أخرى", icon: <ArrowsClockwise />, onClick: () => openMove(m) }]
        : []),
      ...(m.canWarn && m.status === "active" ? [{ key: "warn", label: "إصدار إنذار", icon: <ShieldWarning />, onClick: () => openWarning(m) }] : []),
      ...(m.canCertify ? [{ key: "cert", label: "إصدار شهادة خبرة", icon: <Certificate />, onClick: () => openCertify(m) }] : []),
      ...(m.canEnd
        ? [
            { key: "volunteer", label: "نقل إلى المتطوّعين", icon: <Handshake />, onClick: () => openEnd(m, "volunteer"), danger: true },
            { key: "end", label: "إنهاء العضوية", icon: <Prohibit />, onClick: () => openEnd(m), danger: true },
          ]
        : []),
    ];
  };
  const acts = (m: MemberRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "الملفّ الشخصيّ", icon: <UserCircle />, onClick: () => openView(m) }} ops={ops(m)} />
  );

  return (
    <>
      <CollectionRoom<MemberRow>
        navPath={navPath}
        title={title}
        noun={AR_MEMBER}
        items={shown}
        positions={positions}
        notice={notice}
        extra={extra}
        defaultPosition={withFormer && initialTab === "suspended" ? posKey("suspended") : undefined}
        searchPlaceholder="ابحث بالاسم أو رقم الجوّال…"
        // ما يعرضه الكرتُ يُبحث فيه — الجوّالُ والدورُ واللجنةُ والقسمُ كالاسم والبريد (حقولُ القديمة نفسُها)
        matchSearch={(m, q) => matchesSearch(q, m.name, m.email, m.phone, m.role, m.committee, m.dept)}
        filters={filters}
        viewKey={viewKey}
        initialView={view}
        idOf={(m) => m.id}
        // لا أفعالَ حزمةٍ ولا «إضافة عضو» (محمد ٢٠٢٦-١١-٠٣): كانت «تغيير الحالة» و«تصدير» رسالةً لا فعلًا، ونافذةُ الإضافة لا تحفظ —
        // وعودٌ كاذبة حُذفت. فلا تحديدَ في الجدول.
        table={{
          // الترتيبُ من الرأسين كما كان: بالاسم وبتاريخ الانضمام
          head: "العضو",
          headSortBy: (m) => m.name,
          stub: { key: "face", label: "", icon: <UserCircle /> },
          columns: [{ key: "joined", label: "الانضمام", icon: <CalendarPlus />, sortBy: (m) => (m.joinedRaw ? +new Date(m.joinedRaw) : 0) }],
        }}
        emptyAll={{
          title: emptyTitle ?? `لا ${section.noun} بعد`,
          desc: emptyNote ?? (mode === "reach" ? "لا أعضاء تحت إشرافك حاليًّا." : "لا أعضاء في هذا القسم حاليًّا."),
        }}
        renderCard={(m) => (
          <AdCard
            key={m.id}
            seed={m.id}
            face={face(m)}
            chips={where(m)}
            title={m.name}
            onOpen={() => openView(m)}
            meta={info(m)}
            figures={[joined(m)]}
            foot={acts(m)}
          />
        )}
        renderRow={(m) => (
          <AdRow
            key={m.id}
            face={face(m)}
            title={m.name}
            onOpen={() => openView(m)}
            badge={where(m)}
            sub={info(m)}
            cells={[{ label: "الانضمام", value: m.joined }]}
            acts={acts(m, true)}
          />
        )}
      />
      {dialogs}
    </>
  );
}
