"use client";

/**
 * **سجلُّ الفرصة التطوّعيّة على قالب «التذكرة المفتوحة»** (`_ad/record.tsx`، اعتمده محمد ٢٠٢٦-١١-٠٧). السلوكُ سلوكُ
 * `volunteering/[id]/OpportunityRecord.tsx` حرفًا: المراحلُ الأربع (الطلبات، القبول، الحضور أو الإنجاز، الشهادات) وتفتح الصفحةُ على
 * أوّل ما ينتظرك، وكلُّ قائمةٍ تحت فتراتها، و«طلباتٌ لم تُقبل» و«اعتذروا بعد قبولهم» بأسبابها، والقبولُ (ممسَكٌ إن اكتمل عددُ فترته)
 * والرفضُ بسببه، وتأكيدُ الحضور أو الإنجاز وعكسُه، وإصدارُ الشهادة والترشيحُ للتميّز وحجبُها ورفعُ الحجب، والملاحظةُ الإداريّة، وملفُّ
 * المتطوّع في نافذته، وواتساب، وإنهاءُ المرنة بتأكيد. والفرقُ في الشكل:
 * - **الرأسُ تذكرةُ الفرصة في غرفتها مفتوحة** (`opportunity-ticket.tsx` مصدرٌ واحدٌ للكرت والرأس): الشاراتُ والاسمُ والوصفُ والخاناتُ
 *   الأربع وساعاتُ التطوّع، والمحطّاتُ الأربع أرقامًا (كانت إحصاءاتٍ ثلاثًا في رأسٍ كحليّ).
 * - **المراحلُ المبدّلُ نفسُه** (كانت عمودًا جانبيًّا بشارات «بانتظارك»): وما ينتظرك فيها تنبيهٌ فوق القائمة بفعلٍ ينقل إليه.
 * - **المتطوّعون جدولٌ بوجوههم** تحت رؤوس فتراتهم، وحالُ كلٍّ شارتُه، وأسبابُه وملاحظتُك سطورُه.
 */
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, LogoLoader, Modal, Textarea, matchesSearch, overBy } from "@adeeb/design-system";
import {
  CalendarBlank, ChatCenteredText, Clock, FlagCheckered, LockSimpleOpen, NotePencil, SealCheck, Sparkle, UserCircle, UserMinus, UsersThree,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { CheckCircle, PencilSimple, Prohibit, SignOut, XCircle } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { DISTINCTION_NOTE_MAX } from "@/lib/volunteerNotes";
import { AR_VOLUNTEER, arCount, arCounted, type ArForms } from "@/lib/arabicCount";
import { periodLabel, periodStarted, type ClubNow, type OppPeriod } from "@/lib/volunteerPeriods";
import { waHref } from "@/lib/whatsapp";
import {
  decideApplication, endOpportunity, issueCertificate, markAttendance, nominateDistinction, releaseCertificate, setAdminNote, volunteerRecord,
  withholdCertificate,
} from "@/app/dashboard/volunteering/actions";
import type { AppRow, OppDetail, VolunteerRow } from "@/app/dashboard/volunteering/data";
import { stagesOf, type OppCard, type Stage } from "@/app/dashboard/volunteering/OpportunityCard";
import { VolunteerHero, VolunteerRecord } from "@/app/dashboard/volunteering/volunteers/VolunteerRecord";
import { CollectionRoom, type Position } from "../collection";
import { RecordTicket } from "../record";
import { AdActs, AdBadge, AdButton, AdConfirm, AdGroupHead, AdNote, AdRow, type AdAction, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { fmtNum } from "../format";
import { oppChips, oppFigures, oppInfo, oppStub } from "./opportunity-ticket";

type Tab = Stage["key"];
type Ask = { kind: "reject" | "withhold" | "distinction" | "note"; row: AppRow } | null;
const HOURS_N: ArForms = ["ساعةُ تطوّع", "ساعتا تطوّع", "ساعاتُ تطوّع", "ساعةَ تطوّع"];
const OTHER: Partial<Record<AppRow["status"], string>> = { rejected: "لم يُقبل", withdrawn: "سحب طلبه", expired: "انتهى الموعد قبل المراجعة" };
/** مفتاحا المجموعتين اللتين ليستا فترة: من لم يُقبل، ومن اعتذر بعد قبوله — آخرَ القائمة بعد الفترات */
const OTHERS = "~others";
const EXCUSED = "~excused";

export function OpportunityRecordRoom({ opp, rows, now }: { opp: OppDetail; rows: AppRow[]; now: ClubNow }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const [text, setText] = useState("");
  const [ending, setEnding] = useState(false);
  // ملفُّ المتطوّع: نافذةُ سجلّ المتطوّعين نفسُها، تُجلَب عند الضغط على اسمه
  const [profileOf, setProfileOf] = useState<AppRow | null>(null);
  const [profile, setProfile] = useState<VolunteerRow | null>(null);
  const openProfile = async (r: AppRow) => {
    setProfileOf(r);
    setProfile(null);
    const v = await volunteerRecord(r.userId);
    if (v) setProfile(v);
    else { setProfileOf(null); toast.error("تعذّر فتحُ ملفّه."); }
  };
  const flex = opp.flexible;
  const w = flex
    ? { yes: "أنجز", no: "لم ينجز", wait: "بانتظار تأكيد الإنجاز", before: "يُؤكَّد إنجازُه بعد انتهائها" }
    : { yes: "حضر", no: "غاب", wait: "بانتظار تأكيد الحضور", before: "يُؤكَّد حضورُه حين تبدأ فترتُه" };

  // **أعدادُ التذكرة من السطور نفسِها**: كرتُ الغرفة يقرؤها من الكشف، والصفحةُ تحسبها ممّا تعرضه فلا تفترقان
  const of = (st: AppRow["status"]) => rows.filter((r) => r.status === st);
  const pending = of("pending");
  const accepted = of("accepted");
  const attended = accepted.filter((r) => r.attendance === "attended");
  const people = (list: AppRow[]) => new Set(list.map((r) => r.userId)).size;
  const card: OppCard = {
    ...opp,
    pending: pending.length, accepted: accepted.length, rejected: of("rejected").length, expired: of("expired").length,
    attended: attended.length, absent: accepted.filter((r) => r.attendance === "absent").length,
    owed: people(attended.filter((r) => !r.certificateSerial && r.deservesCertificate !== false)),
    withheld: people(attended.filter((r) => !r.certificateSerial && r.deservesCertificate === false)),
    certified: people(attended.filter((r) => r.certificateSerial)), attendees: people(attended),
  };
  const stages = stagesOf(card, now.day);
  const canEnd = flex && opp.status !== "draft" && !opp.endedAt;

  const run = async (key: string, fn: () => Promise<{ ok: boolean; message: string }>) => {
    setBusy(key);
    const r = await fn();
    setBusy(null);
    if (r.ok) toast.success(r.message); else toast.error(r.message);
    router.refresh();
    return r.ok;
  };
  const closeAsk = () => { setAsk(null); setText(""); };
  const confirmAsk = async (note = text) => {
    if (!ask) return;
    const { kind, row } = ask;
    const ok = await run(row.id, () =>
      kind === "reject" ? decideApplication(row.id, false, note, opp.id)
        : kind === "withhold" ? withholdCertificate(row.id, note, opp.id)
        : kind === "distinction" ? nominateDistinction(row.id, note, opp.id)
        : setAdminNote(row.id, note, opp.id),
    );
    if (ok) closeAsk();
  };
  const ASK: Record<NonNullable<Ask>["kind"], { title: string; description: string; label: string; placeholder: string; save: string }> = {
    reject: { title: "سببُ الرفض", description: "يُكتب السببُ ويُحفَظ، ويراه صاحبُه.", label: "السبب", placeholder: "يُقرأ كما تكتبه", save: "حفظ" },
    withhold: {
      title: "حجبُ الشهادة", description: "استثناءٌ لمخالفةٍ صريحة: يُحفظ السببُ في السجلّ، ويراه صاحبُه. ويُرفع الحجبُ متى شئت.",
      label: "سببُ الحجب", placeholder: "ما الذي خالف فيه", save: "حجبُ الشهادة",
    },
    distinction: {
      title: "ترشيحٌ للتميّز", description: "تصدر الشهادةُ بختم «بتميّز»، وتُطبع جملتُك فيها كما تكتبها.",
      label: "سببُ تميّزه", placeholder: "مثلًا: أدار ركن الاستقبال وحده بعد غياب زميله", save: "ترشيحُه",
    },
    note: {
      title: "ملاحظةٌ إداريّة", description: "لا يراها المتطوّع. وإن كانت مخالفةً تستوجب عقوبةً فمكانُها سجلّ الإنذارات.",
      label: "الملاحظة", placeholder: "ما تريد تسجيله عن هذا المتطوّع", save: "حفظ",
    },
  };
  const askOf = ask ? ASK[ask.kind] : null;

  /* ── الفترات ── */
  const periodOf = new Map(opp.periods.map((p) => [p.id, p]));
  const isFull = (p: OppPeriod) => p.seats != null && p.accepted >= p.seats;
  const seatsGone = (r: AppRow) => {
    const p = r.periodId ? periodOf.get(r.periodId) : null;
    return p ? isFull(p) : opp.seats != null && card.accepted >= opp.seats;
  };
  const started = (r: AppRow) => {
    if (flex) return true;
    const p = r.periodId ? periodOf.get(r.periodId) : null;
    if (p) return periodStarted(p, now);
    return !opp.startsOn || periodStarted({ day: opp.startsOn, from: opp.dailyFrom ?? "00:00" }, now);
  };
  const whenOf = (r: AppRow) => (r.periodId && periodOf.get(r.periodId) ? periodLabel(periodOf.get(r.periodId)!) : null);

  /* ── ما ينتظرك في كلّ مرحلة (كان شارةَ «N بانتظارك» على كرتها، وعلى أوّلها تفتح الصفحة) ── */
  const due: Record<Tab, number> = {
    apply: pending.length,
    accept: 0,
    attend: accepted.filter((r) => r.attendance == null && started(r)).length,
    certify: card.owed,
  };
  const first: Tab = stages.find((s) => due[s.key] > 0)?.key
    ?? [...stages].reverse().find((s) => s.state === "done" || s.state === "part")?.key
    ?? "apply";

  /* ── ساعاتُ التطوّع (كانت إحصاءً في الرأس): من فترة كلّ حاضر، والليليّةُ تعبر منتصف الليل؛ والمرنةُ لا ساعاتِ لها ── */
  const minutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
  const span = (from: string, to: string) => { const d = minutes(to) - minutes(from); return d > 0 ? d : d + 1440; };
  const rowMinutes = (r: AppRow): number | null => {
    if (flex) return null;
    const p = r.periodId ? periodOf.get(r.periodId) : null;
    if (p) return span(p.from, p.to);
    if (!opp.startsOn || !opp.dailyFrom || !opp.dailyTo) return null;
    const days = opp.endsOn ? Math.round((Date.parse(opp.endsOn) - Date.parse(opp.startsOn)) / 864e5) + 1 : 1;
    return span(opp.dailyFrom, opp.dailyTo) * days;
  };
  const served = attended.reduce<number | null>((sum, r) => { const m = rowMinutes(r); return sum == null || m == null ? null : sum + m; }, 0);
  const hours = served != null ? Math.round((served / 60) * 10) / 10 : null;

  /* ── المراحل مواضعَ المبدّل: كلٌّ بقائمته كما كانت لوحتُه، وعددُه عددُ محطّته كما كان (`stagesOf`) — وهو رقمُ التذكرة نفسُه:
     الطلباتُ بلا من سحب طلبه، والقبولُ المقبولون، والحضورُ من حضر، والشهاداتُ من صدرت شهادتُه ── */
  const nOf = (k: Tab) => stages.find((s) => s.key === k)?.n ?? 0;
  const positions: Position<AppRow>[] = [
    {
      key: "apply", label: "الطلبات", match: (r) => r.status === "pending" || r.status === "rejected" || r.status === "withdrawn" || r.status === "expired",
      empty: "لا طلبات تنتظر المراجعة.", count: nOf("apply"),
    },
    { key: "accept", label: "القبول", match: (r) => r.status === "accepted" || r.status === "excused", empty: "لم يُقبل أحدٌ بعد.", count: nOf("accept") },
    { key: "attend", label: flex ? "الإنجاز" : "الحضور", match: (r) => r.status === "accepted", empty: `لا مقبولين ليُؤكَّد ${flex ? "إنجازُهم" : "حضورُهم"}.`, count: nOf("attend") },
    { key: "certify", label: "الشهادات", match: (r) => r.status === "accepted" && r.attendance === "attended", empty: `لا ${flex ? "منجزين" : "حاضرين"} بعد لتصدر شهاداتُهم.`, count: card.certified },
  ];

  /* ── كلُّ قائمةٍ تحت فتراتها، ومن لم يُقبل ومن اعتذر مجموعتان آخرَها ── */
  const groupKey = (r: AppRow) =>
    r.status === "rejected" || r.status === "withdrawn" || r.status === "expired" ? OTHERS : r.status === "excused" ? EXCUSED : (r.periodId ?? "-");
  const rank = (k: string) => (k === OTHERS || k === EXCUSED ? 1e6 : k === "-" ? -1 : opp.periods.findIndex((p) => p.id === k));
  const hasExtras = rows.some((r) => groupKey(r) === OTHERS || groupKey(r) === EXCUSED);
  const volunteers = (n: number): AdMeta => ({ icon: <UsersThree />, text: arCount(n, AR_VOLUNTEER) });
  const group = opp.periods.length || hasExtras ? {
    of: groupKey,
    order: (a: AppRow[], b: AppRow[]) => rank(groupKey(a[0])) - rank(groupKey(b[0])),
    // بلا فتراتٍ تُجمع «الطلبات» و«القبول» وحدهما (فيهما من لم يُقبل ومن اعتذر)، والبقيّةُ قائمةٌ واحدة كما كانت
    in: opp.periods.length ? undefined : ["apply", "accept"],
    head: (items: AppRow[], pos: string) => {
      const k = groupKey(items[0]);
      const n = items.length;
      if (k === OTHERS) return <AdGroupHead lead={<UserMinus />} title="طلباتٌ لم تُقبل" sub={[volunteers(n)]} />;
      if (k === EXCUSED) return <AdGroupHead lead={<SignOut />} title="اعتذروا بعد قبولهم" sub={[volunteers(n)]} />;
      const p = periodOf.get(k);
      if (!p) {
        const title = pos === "apply" ? "بانتظار المراجعة" : pos === "certify" ? (flex ? "المنجزون" : "الحاضرون") : "المقبولون";
        return <AdGroupHead lead={<UsersThree />} title={title} sub={[volunteers(n)]} />;
      }
      const count = pos === "accept" ? (p.seats == null ? `قُبل ${n}، والعددُ مفتوح` : `قُبل ${n} من ${p.seats}`) : arCount(n, AR_VOLUNTEER);
      return <AdGroupHead lead={<CalendarBlank />} title={periodLabel(p)} sub={[{ icon: <UsersThree />, text: count }]} />;
    },
  } : undefined;

  /* ── السطر: وجهُ المتطوّع واسمُه يفتحان ملفَّه، وحالُه شارتُه، وأسبابُه وملاحظتُك سطورُه، وفعلُ مرحلته ── */
  const waOp = (r: AppRow): AdOp | null => (r.phone ? { key: "wa", label: "واتساب", icon: <WhatsappLogo />, onClick: () => window.open(waHref(r.phone), "_blank", "noreferrer") } : null);
  const noteOp = (r: AppRow): AdOp => ({ key: "note", label: r.adminNote ? "تعديلُ الملاحظة" : "ملاحظة", icon: <NotePencil />, onClick: () => { setText(r.adminNote ?? ""); setAsk({ kind: "note", row: r }); } });
  const actsOf = (primary: AdAction | null, ops: (AdOp | null)[]) => {
    const list = ops.filter((o): o is AdOp => !!o);
    if (primary) return <AdActs inRow primary={primary} ops={list} />;
    const [head, ...rest] = list;
    return head ? <AdActs inRow primary={{ label: head.label, icon: head.icon, onClick: head.onClick! }} ops={rest} /> : null;
  };
  const badge = (tone: AdTone, label: string, icon?: ReactNode) => <AdBadge tone={tone} icon={icon}>{label}</AdBadge>;
  const memo = (icon: ReactNode, label: string, text: string): AdMeta => ({ icon, text: `${label}: ${text}` });
  const noteLine = (r: AppRow): AdMeta[] => (r.adminNote ? [memo(<NotePencil />, "ملاحظتك", r.adminNote)] : []);

  const row = (r: AppRow, pos: string) => {
    let chip: ReactNode = null;
    let sub: AdMeta[] = [];
    let acts: ReactNode = null;
    const when = whenOf(r);
    if (pos === "apply") {
      if (r.status === "pending") {
        // تحت رأس الفترة تقول الشارةُ حالَه كما كان سطرُه؛ وبلا فترات رأسُ مجموعته يقولها، فالشارةُ لما يخالفه وحده
        chip = seatsGone(r) ? badge("warn", "بانتظار المراجعة، واكتمل عددُ فترته") : opp.periods.length ? badge("neutral", "بانتظار المراجعة") : null;
        acts = actsOf(
          { label: "قبول", icon: <CheckCircle />, busy: busy === r.id, disabled: seatsGone(r), onClick: () => void run(r.id, () => decideApplication(r.id, true, "", opp.id)) },
          [{ key: "reject", label: "رفض", icon: <XCircle />, onClick: () => setAsk({ kind: "reject", row: r }) }, waOp(r)],
        );
      } else {
        chip = badge("neutral", OTHER[r.status] ?? "");
        sub = [
          ...(when ? [{ icon: <CalendarBlank />, text: when }] : []),
          ...(r.status === "rejected" && r.decisionReason ? [memo(<XCircle />, "لم يُقبل", r.decisionReason)] : []),
        ];
        acts = actsOf(null, [waOp(r)]);
      }
    } else if (pos === "accept") {
      if (r.status === "excused") {
        chip = badge("warn", "اعتذر");
        sub = [...(when ? [{ icon: <CalendarBlank />, text: when }] : []), ...(r.excuseReason ? [memo(<ChatCenteredText />, "اعتذر", r.excuseReason)] : [])];
      }
      acts = actsOf(null, [waOp(r)]);
    } else if (pos === "attend") {
      const go = started(r);
      chip = !go ? badge("neutral", w.before) : r.attendance === "attended" ? badge("ok", w.yes) : r.attendance === "absent" ? badge("bad", w.no) : badge("warn", w.wait);
      sub = noteLine(r);
      acts = go
        ? actsOf(
            { label: w.yes, icon: <CheckCircle />, busy: busy === `${r.id}-att`, onClick: () => void run(`${r.id}-att`, () => markAttendance(r.id, "attended", opp.id)) },
            [{ key: "abs", label: w.no, icon: <XCircle />, busy: busy === `${r.id}-abs`, onClick: () => void run(`${r.id}-abs`, () => markAttendance(r.id, "absent", opp.id)) }, noteOp(r), waOp(r)],
          )
        : actsOf(null, [waOp(r), noteOp(r)]);
    } else {
      const held = r.deservesCertificate === false;
      chip = r.certificateSerial ? badge("ok", "صدرت شهادتُه")
        : held ? badge("bad", "شهادتُه محجوبة")
        : badge("info", r.distinctionNote ? "شهادتُه جاهزة بتميّز" : "شهادتُه جاهزة", r.distinctionNote ? <Sparkle /> : undefined);
      sub = [
        ...(r.certificateSerial ? [{ icon: <SealCheck />, text: r.certificateSerial, ltr: true }] : []),
        ...(held && r.denialReason ? [memo(<Prohibit />, "حُجبت", r.denialReason)] : []),
        ...(!held && r.distinctionNote ? [memo(<Sparkle />, "تميّزه", r.distinctionNote)] : []),
        ...noteLine(r),
      ];
      acts = r.certificateSerial ? actsOf(null, [waOp(r), noteOp(r)])
        : held ? actsOf(
            { label: "رفعُ الحجب", icon: <LockSimpleOpen />, busy: busy === `${r.id}-rel`, onClick: () => void run(`${r.id}-rel`, () => releaseCertificate(r.id, opp.id)) },
            [noteOp(r), waOp(r)],
          )
        : actsOf(
            { label: "إصدارُ الشهادة", icon: <SealCheck />, busy: busy === `${r.id}-cert`, onClick: () => void run(`${r.id}-cert`, () => issueCertificate(r.id, opp.id)) },
            [
              { key: "dist", label: r.distinctionNote ? "تعديلُ التميّز" : "ترشيحٌ للتميّز", icon: <Sparkle />, onClick: () => { setText(r.distinctionNote ?? ""); setAsk({ kind: "distinction", row: r }); } },
              noteOp(r), waOp(r),
              { key: "hold", label: "حجبُ الشهادة", icon: <Prohibit />, danger: true, onClick: () => { setText(""); setAsk({ kind: "withhold", row: r }); } },
            ],
          );
    }
    return (
      <AdRow key={r.id} face={{ name: r.name, gender: r.gender }} title={r.name} onOpen={() => void openProfile(r)} badge={chip} sub={sub} cells={[]} acts={acts} />
    );
  };

  /* ── التنبيه: ما ينتظرك في الفرصة بأعداده (كانت شاراتِ «N بانتظارك» على المراحل)، والمبدّلُ تحته ينقل إليه ── */
  const WAIT: Record<Tab, (n: number) => string> = {
    apply: (n) => `${arCount(n, ["طلبٌ واحد", "طلبان", "طلبات", "طلبًا"])} بانتظار المراجعة`,
    accept: () => "",
    attend: (n) => `${arCount(n, AR_VOLUNTEER)} ${flex ? "بانتظار تأكيد الإنجاز" : "بانتظار تأكيد الحضور"}`,
    certify: (n) => `${arCount(n, AR_VOLUNTEER)} بانتظار شهاداتهم`,
  };
  const dues = stages.filter((s) => due[s.key] > 0);
  const notice = dues.length ? <AdNote tone="warn" label="ينتظرك" title={dues.map((s) => WAIT[s.key](due[s.key])).join("، و")} /> : null;

  /* ── الرأس: تذكرةُ الفرصة مفتوحة ── */
  const info: AdMeta[] = [
    ...oppInfo(card),
    ...(hours && attended.length ? [{ icon: <Clock />, text: `${fmtNum(hours)} ${arCounted(hours, HOURS_N)}، قدّمها ${arCount(people(attended), AR_VOLUNTEER)}` }] : []),
  ];
  const head = (
    <RecordTicket
      title={opp.title}
      desc={opp.description}
      seed={opp.id}
      stub={oppStub(card)}
      chips={oppChips(card, now.day)}
      acts={
        <>
          <AdButton variant="fill" size="sm" icon={<PencilSimple />} href={`/dashboard/volunteering/${opp.id}/edit`}>تعديل</AdButton>
          {canEnd ? <AdButton variant="danger" size="sm" icon={<FlagCheckered />} onClick={() => setEnding(true)}>إنهاءُ الفرصة</AdButton> : null}
        </>
      }
      info={info}
      figures={oppFigures(card, now.day)}
    />
  );

  return (
    <>
      <CollectionRoom<AppRow>
        navPath="/dashboard/volunteering"
        title={opp.title}
        head={head}
        listOnly
        pageSize={Infinity}
        noun={AR_VOLUNTEER}
        items={rows}
        positions={positions}
        defaultPosition={first}
        searchPlaceholder="ابحث باسم المتطوّع أو جوّاله…"
        matchSearch={(r, q) => matchesSearch(q, r.name, r.phone)}
        emptyAll={{
          title: opp.status === "open" ? "لا متقدّمين بعد" : "لا متقدّمين",
          desc: opp.status === "open" ? "انسخ رابط الفرصة وانشره في قروب المتطوّعين." : "",
        }}
        idOf={(r) => r.id}
        group={group}
        notice={notice}
        table={{ head: "المتطوّع", stub: { key: "face", label: "", icon: <UserCircle /> }, columns: [] }}
        renderCard={row}
        renderRow={row}
      />
      <Modal
        open={ask !== null}
        onClose={closeAsk}
        busy={busy !== null}
        title={askOf?.title ?? ""}
        description={askOf?.description}
        size="sm"
        footer={<>
          {/* إلغاءُ الترشيح لمن رُشّح: الجملةُ الفارغةُ تُلغيه في القاعدة */}
          {ask?.kind === "distinction" && ask.row.distinctionNote
            ? <Button variant="ghost-danger" size="md" disabled={busy !== null} onClick={() => confirmAsk("")}>إلغاءُ الترشيح</Button>
            : null}
          <Button variant="ghost" size="md" onClick={closeAsk}>إلغاء</Button>
          <Button variant={ask?.kind === "withhold" ? "danger" : "primary"} size="md" loading={busy !== null}
            disabled={ask?.kind === "distinction" && overBy(text.trim(), DISTINCTION_NOTE_MAX) > 0} onClick={() => confirmAsk()}>{askOf?.save}</Button>
        </>}
      >
        <Textarea
          label={askOf?.label ?? ""} icon={<PencilSimple />} innerIcon={<PencilSimple />}
          placeholder={askOf?.placeholder ?? ""} rows={3} count={ask?.kind === "distinction" ? { max: DISTINCTION_NOTE_MAX } : undefined}
          value={text} onChange={(e) => setText(e.target.value)} required={ask?.kind !== "note"} optional={ask?.kind === "note"}
        />
      </Modal>
      <Modal
        open={profileOf !== null}
        onClose={() => setProfileOf(null)}
        title={profileOf?.name ?? "الملفّ"}
        size="md"
        className="pvb-modal"
        hero={profile ? <VolunteerHero v={profile} /> : undefined}
        footer={<Button variant="ghost" size="md" onClick={() => setProfileOf(null)}>إغلاق</Button>}
      >
        {profile ? <VolunteerRecord v={profile} /> : <LogoLoader orientation="horizontal" minHeight="240px" label="يُجلَب الملفّ…" />}
      </Modal>
      <AdConfirm
        open={ending}
        onClose={() => setEnding(false)}
        tone="warning"
        icon={<FlagCheckered />}
        title="إنهاءُ الفرصة؟"
        text="ينتهي التقديم، ويصير عليك تأكيدُ إنجاز المقبولين وإصدارُ شهاداتهم. ولا يُتراجَع عن الإنهاء."
        confirmLabel="إنهاءُ الفرصة"
        onConfirm={async () => { await run("end", () => endOpportunity(opp.id)); setEnding(false); }}
        loading={busy === "end"}
      />
    </>
  );
}
