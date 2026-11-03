"use client";

/**
 * غرفةُ الاستبيانات على قالب «قائمة السجلّات» (٢٠٢٦-١٠-٣٠) — السلوكُ سلوكُ
 * `surveys/SurveysView.tsx` القديم: المواضعُ الخمسة، والبحثُ والوصول، ودورةُ الحياة بصلاحيّات
 * الدور، والتأكيداتُ، والمعاينةُ والمشاركةُ ونسخُ الرابط، والتحديثُ الحيّ للمجدول والمنقضي، والترتيبُ من رأس الجدول.
 * والفرقُ في الشكل وحده: لوحٌ بمواضعه، وشارةٌ لا تظهر إلّا حيث تخالف موضعها، وأفعالٌ ظاهرة.
 */
import type { RoomView } from "../view";
import { SURVEYS_ROOM } from "./meta";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { matchesSearch } from "@adeeb/design-system";
import {
  Archive, CalendarBlank, ChartBar, Clock, GlobeHemisphereEast, Handshake, LinkSimple, ListChecks, LockSimple, PauseCircle, Play, StopCircle, UserCircle, UsersThree,
} from "@phosphor-icons/react";
import { ArrowClockwise, ArrowCounterClockwise, Eye, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { useLiveNow } from "@/app/dashboard/_components/useLiveNow";
import type { SurveyRow } from "@/app/dashboard/surveys/data";
import { ACCESS_LABEL, ACCESS_TYPES, OP_NEEDS, STATUS_OPS, canEditSurvey, canSurvey, type StatusOp } from "@/app/dashboard/surveys/vocab";
import { deleteSurveyPermanently, getSurveyPreview, setSurveyStatus } from "@/app/dashboard/surveys/actions";
import { SurveyPreview } from "@/app/dashboard/surveys/SurveyPreview";
import { SurveyShareModal, useSurveyShareOpener } from "@/app/dashboard/surveys/SurveyShares";
import type { PublicQuestion, PublicSurvey } from "@/app/s/[code]/SurveyRespond";
import { copyText } from "@/lib/clipboard";
import { surveyPath } from "@/lib/surveys/code";
import { AdActs, AdConfirm, AdBadge, AdButton, AdCard, AdRow, type AdMeta, type AdMetaTone, type AdOp } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { useAdLab } from "../lab";
import { fmtDayFull, fmtNum, relTime } from "../format";
import { arCount, arCounted, type ArForms } from "@/lib/arabicCount";

/**
 * المعدودُ تحت رقم الكعب: «1 مُشاركة»، «2 مُشاركتان»، «5 مُشاركات»، «12 مُشاركةً» — لا «1 المشاركات».
 * والميمُ مضمومةٌ (محمد ٢٠٢٦-١٠-٣٠) حيث تقف الكلمةُ وحدها بلا سياق: تحت الرقم، وعنوانِ عمود السطر.
 */
/**
 * **مَن يجيب** (محمد ٢٠٢٦-١٠-٣١: «عامّ» أو «للأعضاء» منفردةً غيرُ واضحة — و«عام» بلا شدّةٍ تُقرأ «سنة»): الرقاقةُ تقول
 * الجوابَ كاملًا برمزه، «للجميع» بالكرة و«للأعضاء فقط» بالقفل — وزنُهما واحد («لـ…»)، والمعنى معنى خيارَي النموذج.
 */
const WHO_ANSWERS: Record<keyof typeof ACCESS_LABEL, { label: string; icon: React.ReactNode }> = {
  public: { label: "للجميع", icon: <GlobeHemisphereEast /> },
  members_only: { label: "للأعضاء فقط", icon: <LockSimple /> },
};
/**
 * **رقاقةُ الشراكة** (محمد ٢٠٢٦-١٠-٣١) برمز فعل «شركاء الاستبيان» نفسِه: عند الشريك ما ليس له وإذنُه فيه («مُشارَك معك
 * للقراءة/للتحرير» — لا تُخطئ جنسًا)، وعند صاحبه فعلُه هو («شاركته مع شريكين» — محمد ٢٠٢٦-١٠-٣١: الصاحبُ فاعلُ المشاركة؛
 * و«شاركته» بلا حركاتٍ تصلح للمخاطَب والمخاطَبة). وحسابُ النادي بلا رقاقة: الأزرارُ تكفيه.
 */
const PARTNERS: ArForms = ["شريكٍ واحد", "شريكين", "شركاء", "شريكًا"];
const partnerChip = (s: SurveyRow) =>
  s.role === "read" ? "مُشارَك معك للقراءة"
  : s.role === "edit" ? "مُشارَك معك للتحرير"
  : s.role === "owner" && (s.shareCount ?? 0) > 0 ? `شاركته مع ${arCount(s.shareCount ?? 0, PARTNERS)}`
  : null;
/**
 * **مرشّحُ الملكيّة** (محمد ٢٠٢٦-١٠-٣١: «تريد نظامًا متكاملًا أم ترقّع؟»): الغرفةُ تخلط ما يملكه العضوُ بما شُورك معه
 * وبما يشرف عليه حسابُ النادي، والرقاقةُ تفرّقها كرتًا كرتًا لا قائمةً. فالمرشّحُ يجمعها — **ولا يظهر إلّا حين يفرّق**:
 * غرفةٌ كلُّها لصاحبها لا يُعرَض لها مرشّحٌ بخيارٍ واحد.
 */
const OWNERSHIP: { value: string; label: string; roles: SurveyRow["role"][] }[] = [
  { value: "mine", label: "استبياناتي", roles: ["owner"] },
  { value: "shared", label: "مُشارَكة معي", roles: ["edit", "read"] },
  { value: "stewarded", label: "بإشراف النادي", roles: ["steward"] },
];
const RESPONSES: ArForms = ["مُشاركة", "مُشاركتان", "مُشاركات", "مُشاركةً"];
/** بعد «مع» في نافذة الحذف: مجرورة («مع مشاركتين»)، والصفرُ لا يُذكر. */
const WITH_RESPONSES: ArForms = ["مشاركةٍ واحدة", "مشاركتين", "مشاركات", "مشاركةً"];

const OP_ICON: Record<StatusOp, React.ReactNode> = {
  publish: <Play />, pause: <PauseCircle />, close: <StopCircle />, reopen: <ArrowClockwise />,
  archive: <Archive />, unarchive: <ArrowCounterClockwise />, softDelete: <Trash />, restore: <ArrowCounterClockwise />,
};
const CONFIRMED: Partial<Record<StatusOp, { title: string; text: (t: string) => string; confirm: string; tone: "danger" | "warning" }>> = {
  close: { title: "إنهاء الاستبيان؟", text: (t) => `سيتوقّف استقبال الإجابات على «${t}» نهائيًّا.`, confirm: "إنهاء", tone: "warning" },
  softDelete: { title: "نقل إلى المحذوفات؟", text: (t) => `سيُنقل «${t}» إلى المحذوفات ويتوقّف عن استقبال الإجابات. يمكن استعادته لاحقًا.`, confirm: "نقل إلى المحذوفات", tone: "danger" },
};

const POSITIONS: Position<SurveyRow>[] = [
  { key: "active", label: "نشطة", match: (s) => !s.deleted && !s.archived && (s.status === "active" || s.status === "paused"), empty: "لا استبيانات نشطة الآن.", canCreate: true },
  { key: "draft", label: "مسودّات", match: (s) => !s.deleted && !s.archived && s.status === "draft", empty: "لا مسودّات. ابدأ استبيانًا جديدًا.", canCreate: true },
  { key: "closed", label: "منتهية", match: (s) => !s.deleted && !s.archived && s.status === "closed", empty: "لا استبيانات منتهية بعد." },
  { key: "archived", label: "الأرشيف", match: (s) => !s.deleted && s.archived, empty: "الأرشيف فارغ.", rare: true },
  { key: "deleted", label: "المحذوفات", match: (s) => s.deleted, empty: "سلّة المحذوفات فارغة.", rare: true },
];

type StateOp = AdOp;

/** الحالُ حيث تخالف موضعَها وحدها: في «نشطة» المتوقّفُ والمجدولُ والمنقضي. رقاقةٌ على الكرت، وشارةٌ في السطر. */
function deviation(s: SurveyRow) {
  if (s.deleted || s.archived) return null;
  const d =
    s.status === "paused" ? { tone: "warn" as const, label: "متوقّف مؤقّتًا" }
    : s.status === "active" && s.scheduled ? { tone: "info" as const, label: "مجدول" }
    : s.status === "active" && s.expired ? { tone: "neutral" as const, label: "انتهت مدّته" }
    : null;
  if (!d) return null;
  return <AdBadge tone={d.tone}>{d.label}</AdBadge>;
}

/** لونُ سطر الحال: مفتوحٌ أخضر، وما يحتاج انتباهًا (موقوف، مجدول، يُغلق خلال ثلاثة أيّام) كهرمانيّ، والمنتهي خافت. */
const SOON = 3 * 864e5;
function statusTone(s: SurveyRow, now: number): AdMetaTone {
  if (s.deleted) return "bad";
  if (s.status === "draft" || s.status === "closed" || s.expired) return "muted";
  if (s.status === "paused" || s.scheduled) return "warn";
  if (s.endDate && +new Date(s.endDate) - now < SOON) return "warn";
  return "ok";
}

function statusText(s: SurveyRow, now: number): string {
  if (s.deleted) return "محذوف";
  if (s.status === "draft") return "لم يُنشر بعد";
  if (s.status === "paused") return "موقوفٌ مؤقّتًا";
  if (s.status === "closed") return s.endDate ? `انتهى ${relTime(s.endDate, now)}` : "مغلق";
  if (s.scheduled) return s.startDate ? `يفتح ${relTime(s.startDate, now)}` : "مجدولٌ للفتح";
  if (s.expired) return s.endDate ? `انتهت مدّته ${relTime(s.endDate, now)}` : "انتهت مدّته";
  if (s.endDate) return `يُغلق ${relTime(s.endDate, now)}`;
  return "مفتوحٌ للمشاركة دائمًا";
}

/**
 * مختبر (`?as=`): الغرفةُ كما يراها صاحبُ دورٍ بعينه — كلُّ استبيانٍ بهذا الدور، وأفعالُ الحال معطّلة (الدورُ مُحاكًى).
 * وعند «الصاحب» إن لم يكن لاستبيانٍ شركاءُ في البيانات أُعطي أوّلُها شريكين وثالثُها شريكًا، ليُرى شكلُ الرقاقة. يُحذف مع المختبر.
 */
function asRoleView(surveys: SurveyRow[], role: SurveyRow["role"]): SurveyRow[] {
  const real = surveys.some((s) => (s.shareCount ?? 0) > 0);
  // وفي غرف الشريك وحسابِ النادي يبقى آخرُ استبيانٍ ملكًا للعضو نفسه: غرفتُه الحقيقيّة تخلطهما، فيظهر مرشّحُ الملكيّة
  return surveys.map((s, i) => ({
    ...s,
    role: role !== "owner" && i === surveys.length - 1 ? "owner" : role,
    shareCount: role !== "owner" ? 0 : real ? s.shareCount : i === 0 ? 2 : i === 2 ? 1 : 0,
  }));
}

export function SurveysRoom({ surveys: realSurveys, serverNow, view }: { surveys: SurveyRow[]; serverNow: number; view?: RoomView }) {
  const { asRole } = useAdLab();
  const surveys = useMemo(() => (asRole ? asRoleView(realSurveys, asRole) : realSurveys), [asRole, realSurveys]);
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<{ survey: SurveyRow; op: StatusOp } | null>(null);
  const [kill, setKill] = useState<SurveyRow | null>(null);
  const [preview, setPreview] = useState<{ survey: PublicSurvey; questions: PublicQuestion[] } | null>(null);
  const share = useSurveyShareOpener();

  // التحديثُ الحيّ للمجدول والمنقضي — كما في الغرفة الحاليّة
  const times = useMemo(() => surveys.flatMap((s) => (s.status !== "active" ? [] : [s.startDate, s.endDate].filter(Boolean).map((d) => new Date(d!).getTime()))), [surveys]);
  const now = useLiveNow(times);
  const live = useMemo(() => {
    if (!now) return surveys;
    return surveys.map((s) => {
      if (s.status !== "active") return s;
      const scheduled = !!s.startDate && new Date(s.startDate).getTime() > now;
      const expired = !!s.endDate && new Date(s.endDate).getTime() < now;
      return scheduled === s.scheduled && expired === s.expired ? s : { ...s, scheduled, expired };
    });
  }, [surveys, now]);
  useEffect(() => {
    if (!now) return;
    const pendingClose = surveys.some((s) => s.status === "active" && !s.deleted && !s.archived && s.endDate && new Date(s.endDate).getTime() < now);
    if (!pendingClose) return;
    const t = window.setTimeout(() => router.refresh(), 70000);
    return () => window.clearTimeout(t);
  }, [now, surveys, router]);

  const run = (s: SurveyRow, op: StatusOp) =>
    start(async () => {
      const r = await setSurveyStatus(s.id, op);
      if (r.ok) { toast.success(r.message); setConfirm(null); router.refresh(); } else toast.error(r.message);
    });
  const ask = (s: SurveyRow, op: StatusOp) => (CONFIRMED[op] ? setConfirm({ survey: s, op }) : run(s, op));
  const copyLink = async (s: SurveyRow) => {
    try { await copyText(`${window.location.origin}${surveyPath(s.code)}`); toast.success("نُسخ رابط الاستبيان."); }
    catch { toast.error("تعذّر النسخ."); }
  };
  const openPreview = (s: SurveyRow) =>
    start(async () => {
      const r = await getSurveyPreview(s.id);
      if (r.ok) setPreview({ survey: r.survey, questions: r.questions }); else toast.error(r.message);
    });

  const primary = (s: SurveyRow) => {
    const base = `/dashboard/surveys/${s.id}`;
    if (!canEditSurvey(s.role, s)) return { key: "results", label: "عرض النتائج", icon: <ChartBar />, href: `${base}/results` };
    if (s.questions === 0) return { key: "edit", label: "أضف أسئلة", icon: <Plus />, href: `${base}/edit` };
    if (s.status === "draft") return { key: "edit", label: "متابعة التحرير", icon: <PencilSimple />, href: `${base}/edit` };
    return { key: "results", label: "عرض النتائج", icon: <ChartBar />, href: `${base}/results` };
  };

  /** أفعالُ العمل — بترتيب الاستعمال (أوّلُ اثنين يظهران أيقونتين، `AdActs`): التوأمُ (تحرير أو نتائج)، ثمّ الرابط، ثمّ الشركاء والمعاينة.
   * («شركاء الاستبيان» لا «المشاركة»، محمد ٢٠٢٦-١٠-٣٠: الكلمةُ نفسُها كانت تعني الردودَ وإشراكَ الأعضاء في كرتٍ واحد، والرمزُ نفسُه.) */
  const workOps = (s: SurveyRow): AdOp[] => {
    const p = primary(s);
    const base = `/dashboard/surveys/${s.id}`;
    return [
      ...(p.key !== "edit" && canEditSurvey(s.role, s) ? [{ key: "edit", label: "تحرير", icon: <PencilSimple />, href: `${base}/edit` }] : []),
      ...(p.key !== "results" && canSurvey(s.role, "results") ? [{ key: "results", label: "النتائج", icon: <ChartBar />, href: `${base}/results` }] : []),
      { key: "link", label: "نسخ رابط الاستبيان", icon: <LinkSimple />, onClick: () => copyLink(s) },
      // وفي المحذوفات أيضًا (محمد ٢٠٢٦-١١-٠١): الحذفُ مؤقّت، والشريكُ ما زال يرى الاستبيانَ ونتائجَه في محذوفاته — فلصاحبه أن يُخرجه
      ...(canSurvey(s.role, "share") ? [{ key: "share", label: "شركاء الاستبيان", icon: <Handshake />, onClick: () => share.open(s) }] : []),
      ...(canSurvey(s.role, "see") ? [{ key: "preview", label: "افتح صفحة الاستبيان", icon: <Eye />, onClick: () => openPreview(s) }] : []),
    ];
  };

  /** أفعالُ الحال — ما يصحّ على حال الاستبيان ودورِ صاحب الجلسة فيه، لا سواه؛ والحذفُ آخرُها. */
  const stateOps = (s: SurveyRow): StateOp[] => {
    const ops: StateOp[] = (Object.keys(STATUS_OPS) as StatusOp[])
      .filter((op) => op !== "softDelete" && op !== "restore")
      .filter((op) => canSurvey(s.role, OP_NEEDS[op]) && STATUS_OPS[op].when({ status: s.status, archived: s.archived, deleted: s.deleted }))
      .map((op) => ({ key: op, label: STATUS_OPS[op].label, icon: OP_ICON[op], onClick: () => ask(s, op) }));
    if (canSurvey(s.role, "delete")) {
      if (s.deleted) {
        ops.push({ key: "restore", label: STATUS_OPS.restore.label, icon: OP_ICON.restore, onClick: () => run(s, "restore") });
        ops.push({ key: "kill", label: "حذف نهائيّ", icon: <Trash />, onClick: () => setKill(s), danger: true });
      } else ops.push({ key: "softDelete", label: STATUS_OPS.softDelete.label, icon: <Trash />, onClick: () => ask(s, "softDelete"), danger: true });
    }
    return ops;
  };
  const acts = (s: SurveyRow, inRow?: boolean) => {
    const p = primary(s);
    return <AdActs inRow={inRow} primary={{ label: p.label, icon: p.icon, href: p.href }} ops={[...workOps(s), ...stateOps(s).map((o) => ({ ...o, disabled: pending || !!asRole }))]} />;
  };


  const t = now || serverNow;
  /** الكعبُ: المشاركاتُ بعددها ومعدودِها — في الكرت، وكعبًا مصغّرًا أوّلَ السطر. */
  const stubOf = (s: SurveyRow) => ({ big: fmtNum(s.responses), small: arCounted(s.responses, RESPONSES) });
  /** **الرقاقاتُ والسطورُ مصدرُها واحد** (محمد ٢٠٢٦-١١-٠١): مَن يجيب، والشراكة، والحالُ حيث تخالف موضعَها — رقاقاتٌ في العرضين. */
  const chips = (s: SurveyRow) => (
    <>
      <AdBadge icon={WHO_ANSWERS[s.access].icon}>{WHO_ANSWERS[s.access].label}</AdBadge>
      {partnerChip(s) && <AdBadge icon={<Handshake />}>{partnerChip(s)}</AdBadge>}
      {deviation(s)}
    </>
  );
  /**
   * والسطورُ بترتيبها (محمد ٢٠٢٦-١٠-٣١): الحالُ، ثمّ «أُنشئ 19 أكتوبر 2026»، ثمّ «بإعداد فلان» — كالفعاليّة: الموعدُ ثمّ «بتنظيم».
   * و«بإعداد» على قاعدة «بتحرير/بتنظيم»: لا تُخطئ جنسَ المُعِدّ. وفي السطر «أُنشئ» عمودٌ فيخرج منها.
   */
  const info = (s: SurveyRow, inCard: boolean): AdMeta[] => [
    { icon: <Clock />, text: statusText(s, t), tone: statusTone(s, t) },
    ...(inCard && s.createdRaw ? [{ icon: <CalendarBlank />, text: `أُنشئ ${fmtDayFull(s.createdRaw)}` }] : []),
    { icon: <UserCircle />, text: s.createdBy ? `بإعداد ${s.createdBy}` : "المُعِدّ غير معروف" },
  ];

  const create = <AdButton variant="fill" icon={<Plus />} href="/dashboard/surveys/new">استبيان جديد</AdButton>;
  const ownership = OWNERSHIP.filter((o) => live.some((s) => o.roles.includes(s.role)));

  return (
    <>
      <CollectionRoom<SurveyRow>
        navPath={SURVEYS_ROOM.navPath}
        title={SURVEYS_ROOM.title}
        action={{ label: "استبيان جديد", icon: <Plus />, href: "/dashboard/surveys/new" }}
        noun={["استبيانٌ واحد", "استبيانان", "استبيانات", "استبيانًا"]}
        items={live}
        positions={POSITIONS}
        defaultPosition="active"
        searchPlaceholder="ابحث بعنوان الاستبيان…"
        matchSearch={(s, q) => matchesSearch(q, s.title, s.description)}
        filters={[
          { key: "access", label: "مَن يجيب", options: ACCESS_TYPES.map((a) => ({ value: a.value, label: WHO_ANSWERS[a.value].label })), match: (s, v) => s.access === v },
          ...(ownership.length > 1
            ? [{ key: "own", label: "الملكيّة", options: ownership.map((o) => ({ value: o.value, label: o.label })), match: (s: SurveyRow, v: string) => !!OWNERSHIP.find((o) => o.value === v)?.roles.includes(s.role) }]
            : []),
        ]}
        viewKey={SURVEYS_ROOM.viewKey}
        initialView={view}
        idOf={(s) => String(s.id)}
        table={{
          // الترتيبُ من رأس العمود كما كان في الجدول القديم (العنوان، والتاريخ، والمشاركات، والأسئلة) — والزياراتُ عمودٌ مثلُها.
          // والتاريخُ رقمٌ فيبدأ بالأحدث، كتاريخ الأخبار (كان القديمُ يبدأه بالأقدم)
          head: "الاستبيان",
          headSortBy: (s) => s.title.toLowerCase(),
          stub: { key: "resp", label: "المُشاركات", icon: <UsersThree />, sortBy: (s) => s.responses },
          columns: [
            { key: "made", label: "أُنشئ", icon: <CalendarBlank />, text: true, sortBy: (s) => (s.createdRaw ? +new Date(s.createdRaw) : 0) },
            { key: "q", label: "الأسئلة", icon: <ListChecks />, sortBy: (s) => s.questions },
            { key: "views", label: "الزيارات", icon: <Eye />, sortBy: (s) => s.views },
          ],
        }}
        emptyAll={{ title: "لا استبيانات بعد", desc: "أنشئ أوّل استبيان وشاركه بالرابط أو مع الأعضاء." }}
        createAction={create}
        renderCard={(s) => {
          const p = primary(s);
          return (
            <AdCard
              key={s.id}
              seed={String(s.id)}
              stub={stubOf(s)}
              chips={chips(s)}
              title={s.title}
              href={p.href}
              // (محمد ٢٠٢٦-١٠-٣١) التاريخُ في سطر والشخصُ في سطر، بترتيب الجملة: «أُنشئ 19 أكتوبر 2026» ثمّ «بإعداد فلان» —
              // كالفعاليّة: الموعدُ ثمّ «بتنظيم». و«بإعداد» على قاعدة «بتحرير/بتنظيم»: لا تُخطئ جنسَ المُعِدّ، ولا تكرّر «أُنشئ»
              // («بإنشاء» تكرارٌ لها، و«بواسطة» نقلٌ عن by: الواسطةُ أداةٌ لا فاعل). والتاريخُ بسنته (تاريخُه الوحيد في الكرت).
              meta={info(s, true)}
              figures={[
                { icon: <ListChecks />, value: fmtNum(s.questions), label: "الأسئلة" },
                { icon: <Eye />, value: fmtNum(s.views), label: "الزيارات" },
              ]}
              foot={acts(s)}
            />
          );
        }}
        renderRow={(s) => {
          const p = primary(s);
          return (
            <AdRow
              key={s.id}
              title={s.title}
              href={p.href}
              stub={{ ...stubOf(s), seed: String(s.id) }}
              badge={chips(s)}
              sub={info(s, false)}
              cells={[
                s.createdRaw ? { label: "أُنشئ", text: true, value: fmtDayFull(s.createdRaw) } : { label: "أُنشئ", text: true, value: "—", tone: "muted" as const },
                { label: "الأسئلة", value: fmtNum(s.questions) },
                { label: "الزيارات", value: fmtNum(s.views) },
              ]}
              acts={acts(s, true)}
            />
          );
        }}
      />

      <AdConfirm
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        tone={confirm ? CONFIRMED[confirm.op]?.tone ?? "warning" : "warning"}
        icon={confirm ? OP_ICON[confirm.op] : <StopCircle />}
        title={confirm ? CONFIRMED[confirm.op]?.title ?? "" : ""}
        text={confirm ? CONFIRMED[confirm.op]?.text(confirm.survey.title) : undefined}
        confirmLabel={confirm ? CONFIRMED[confirm.op]?.confirm ?? "تأكيد" : "تأكيد"}
        loading={pending}
        onConfirm={() => { if (confirm) run(confirm.survey, confirm.op); }}
      />
      <AdConfirm
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف نهائيّ؟"
        text={kill ? kill.responses > 0
              ? `سيُحذف «${kill.title}» نهائيًّا مع ${arCount(kill.responses, WITH_RESPONSES)} وكلّ إجاباتها. لا استرجاع بعدها.`
              : `سيُحذف «${kill.title}» نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف نهائيّ"
        loading={pending}
        onConfirm={() => {
          if (!kill) return;
          start(async () => {
            const r = await deleteSurveyPermanently(kill.id);
            if (r.ok) { toast.success(r.message); setKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
      {preview && <SurveyPreview survey={preview.survey} questions={preview.questions} onClose={() => setPreview(null)} />}
      <SurveyShareModal survey={share.target} onClose={share.close} />
    </>
  );
}
