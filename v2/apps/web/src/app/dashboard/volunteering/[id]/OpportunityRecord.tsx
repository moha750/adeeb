"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, LogoLoader, Modal, Textarea } from "@adeeb/design-system";
import { Armchair, CalendarBlank, CalendarCheck, Certificate, ChatCenteredText, Clock, FlagCheckered, LockSimpleOpen, NotePencil, SealCheck, Sparkle, UserMinus, UsersThree, WhatsappLogo } from "@phosphor-icons/react";
import { CaretLeft, CheckCircle, PencilSimple, Prohibit, SignOut, XCircle } from "@/app/_components/glyphs";
import { AR_VOLUNTEER, arCount, arCounted, type ArForms } from "@/lib/arabicCount";
import { periodLabel, periodStarted, type ClubNow, type OppPeriod } from "@/lib/volunteerPeriods";
import { waHref } from "@/lib/whatsapp";
import { Avatar } from "../../_components/Avatar";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { PageHeader } from "../../_components/PageHeader";
import { useToast } from "../../_components/ToastProvider";
import {
  decideApplication, endOpportunity, issueCertificate, markAttendance, nominateDistinction, releaseCertificate, setAdminNote,
  volunteerRecord, withholdCertificate,
} from "../actions";
import type { AppRow, OppDetail, VolunteerRow } from "../data";
import { Leaf, OppFacts, monoState, stagesOf, type OppCard, type Stage } from "../OpportunityCard";
import { VolunteerHero, VolunteerRecord } from "../volunteers/VolunteerRecord";

type Tab = Stage["key"];
type Ask = { kind: "reject" | "withhold" | "distinction" | "note"; row: AppRow } | null;
/* أسماءُ الإحصاءات تتبع أرقامَها (المالك ٢٠٢٦-١٠-٠٣): «4 مقاعدُ مشغولة»، «1 مقعدٌ مشغول»، «12 ساعةَ تطوّع» */
const SEATS_TAKEN: ArForms = ["مقعدٌ مشغول", "مقعدان مشغولان", "مقاعدُ مشغولة", "مقعدًا مشغولًا"];
const ACCEPTED_N: ArForms = ["مقبول", "مقبولان", "مقبولين", "مقبولًا"];
const HOURS_N: ArForms = ["ساعةُ تطوّع", "ساعتا تطوّع", "ساعاتُ تطوّع", "ساعةَ تطوّع"];
const CERTS_N: ArForms = ["شهادةٌ صادرة", "شهادتان صادرتان", "شهاداتٌ صادرة", "شهادةً صادرة"];
/** سطرٌ مكتوبٌ تحت المتطوّع في صندوق «ملاحظتك» نفسِه: سببُ رفضه أو اعتذاره. */
type Memo = { icon: ReactNode; label: string; text: string };

const OTHER: Partial<Record<AppRow["status"], string>> = {
  rejected: "لم يُقبل", withdrawn: "سحب طلبه", expired: "انتهى الموعد قبل المراجعة",
};

/**
 * **صفحةُ الفرصة: الكرتُ مكبَّرًا** (أمرُ المالك ٢٠٢٦-١٠-٠٣: «مدري شنو فايدة هالصفحة، أبي أطوّرها بصريًّا»). كانت قائمةً
 * طويلةً من الكروت لا تقول إنّها مكانُ إدارة الفرصة. فصار رأسُها الكرتَ الذي اعتمده (الورقةُ والشارةُ والخاناتُ)،
 * وتحته **المراحلُ**: عمودٌ جانبيٌّ على العريض وألسنةُ ملفّاتٍ على ما دونه، كلُّ مرحلةٍ بعدّها وبشارة ما ينتظرك، وتفتح الصفحةُ على المرحلة التي تحتاجك.
 * والمترو **لا** يُعاد هنا: جُرّب تبويباتٍ فردّه المالك (٢٠٢٦-١٠-٠٣: «بشوف نفس الشيء، وشنو يعرف المستخدم أنّ الضغط هنا
 * له أكشن؟») — هو في الكرت ملخّصٌ يُقرأ لا يُضغط، فلا يصلح زرًّا. والمتطوّعون سطورُ غرفة الشهادات المُقَرّة
 * (`.vwq-row`): وجهٌ واسمٌ وحالُه، وواتساب، وفعلُه في الطرف، تحت فتراتهم.
 */
export function OpportunityRecord({ opp, rows, now }: { opp: OppDetail; rows: AppRow[]; now: ClubNow }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const [text, setText] = useState("");
  const [ending, setEnding] = useState(false);
  // ملفُّ المتطوّع: نافذةُ سجلّ المتطوّعين نفسُها كما في غرفة الشهادات، تُجلَب عند الضغط على وجهه واسمه
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

  // **أعدادُ المترو من السطور نفسِها**: الكرتُ يقرؤها من الكشف، والصفحةُ تحسبها ممّا تعرضه فلا تفترقان
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
  const state = monoState(card, now.day);
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

  /* ── الفترات: كلُّ قائمةٍ تحت فتراتها، والفرصةُ بلا فتراتٍ مجموعةٌ واحدةٌ بلا عنوان ── */
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

  /* ── ما ينتظرك في كلّ مرحلة: يُعلَّم على كرتها «N بانتظارك»، وعلى أوّلها تفتح الصفحة ──
     الطلباتُ المعلّقة، والمقبولون الذين بدأت فترتُهم ولم يُؤكَّد حضورُهم، والحاضرون الذين لم تصدر شهاداتُهم ولم تُحجب
     (أشخاصًا: الشهادةُ للفرصة لا للفترة). والقبولُ لا فعلَ فيه، فلا ينتظرك أبدًا. */
  const due: Record<Tab, number> = {
    apply: pending.length,
    accept: 0,
    attend: accepted.filter((r) => r.attendance == null && started(r)).length,
    certify: card.owed,
  };
  const [tab, setTab] = useState<Tab>(() =>
    stages.find((s) => due[s.key] > 0)?.key
      ?? [...stages].reverse().find((s) => s.state === "done" || s.state === "part")?.key
      ?? "apply");
  // أسهمُ لوحة المفاتيح تنقل بين المراحل: الصفحةُ يمينيّة فاليسارُ هو التالي، وفي العمود الجانبيّ الأسفلُ هو التالي
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const keys = stages.map((s) => s.key);
    const i = keys.indexOf(tab);
    const next = e.key === "ArrowLeft" || e.key === "ArrowDown";
    const prev = e.key === "ArrowRight" || e.key === "ArrowUp";
    const to = next ? keys[(i + 1) % keys.length]
      : prev ? keys[(i - 1 + keys.length) % keys.length]
      : e.key === "Home" ? keys[0] : e.key === "End" ? keys[keys.length - 1] : null;
    if (!to) return;
    e.preventDefault();
    setTab(to);
    document.getElementById(`vrec-step-${to}`)?.focus();
  };

  /* ── إحصاءاتُ الرأس: ما لا تقوله أعدادُ المراحل — امتلاءُ المقاعد، ونسبةُ الحضور، وساعاتُ التطوّع ──
     الساعاتُ من فترة كلّ حاضرٍ (والليليّةُ تعبر منتصف الليل)، وفي الفرصة قبل الفترات ساعاتُ يومها في أيّامها.
     والمرنةُ لا ساعاتِ لها، فمكانُها الشهاداتُ الصادرة. */
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
  const recorded = card.attended + card.absent;
  const kpis: { key: string; icon: ReactNode; value: ReactNode; label: string; note: string }[] = [
    opp.seats != null
      ? { key: "seats", icon: <Armchair aria-hidden />, value: <span className="vrec-frac"><span>{card.accepted}</span><small>/</small><small>{opp.seats}</small></span>, label: arCounted(card.accepted, SEATS_TAKEN),
          note: card.accepted >= opp.seats ? "اكتمل العدد" : `باقٍ ${opp.seats - card.accepted}` }
      : { key: "seats", icon: <Armchair aria-hidden />, value: card.accepted, label: arCounted(card.accepted, ACCEPTED_N), note: "العددُ مفتوح" },
    { key: "rate", icon: <CalendarCheck aria-hidden />, value: recorded ? `${Math.round((card.attended / recorded) * 100)}%` : "—",
      label: flex ? "نسبةُ الإنجاز" : "نسبةُ الحضور",
      note: recorded ? `${w.yes} ${card.attended} من ${recorded}` : flex ? "لم يُؤكَّد إنجازٌ بعد" : "لم يُؤكَّد حضورٌ بعد" },
    served != null
      ? { key: "hours", icon: <Clock aria-hidden />, value: Math.round((served / 60) * 10) / 10, label: arCounted(Math.round((served / 60) * 10) / 10, HOURS_N),
          note: attended.length ? `قدّمها ${arCount(people(attended), AR_VOLUNTEER)}` : "تُحسب بعد تأكيد الحضور" }
      : { key: "certs", icon: <Certificate aria-hidden />, value: card.certified, label: arCounted(card.certified, CERTS_N),
          note: card.attendees ? `من أصل ${card.attendees}` : "بعد تأكيد الإنجاز" },
  ];

  const bands = (list: AppRow[]) =>
    opp.periods.length === 0
      ? [{ period: null as OppPeriod | null, rows: list }]
      : opp.periods.map((p) => ({ period: p as OppPeriod | null, rows: list.filter((r) => r.periodId === p.id) })).filter((b) => b.rows.length);

  /* ── السطر ── */
  const row = (r: AppRow, sub: ReactNode, acts?: ReactNode, note = false, memo?: Memo) => (
    <li key={r.id} className="vwq-row">
      <span className="vwq-who">
        <button type="button" className="vwq-person is-link" title={`ملفّ ${r.name}`} onClick={() => openProfile(r)}>
          <Avatar name={r.name} gender={r.gender} size="sm" />
          <span className="vwq-who-t">
            <span className="vwq-name-row"><span className="vwq-name">{r.name}</span><CaretLeft className="vwq-go" aria-hidden /></span>
            {sub ? <span className="vwq-sub"><b>{sub}</b></span> : null}
          </span>
        </button>
        {note ? (
          <button type="button" className="abtn abtn-primary abtn-sm vwq-wa" title="ملاحظة" aria-label={`ملاحظة عن ${r.name}`}
            onClick={() => { setText(r.adminNote ?? ""); setAsk({ kind: "note", row: r }); }}>
            {/* الزرُّ مصمتٌ كحليٌّ والأيقونةُ duotone كسائر الموقع (المالك ٢٠٢٦-١٠-٠٣: «الذي يكون مصمت الزر وليس الأيقونة»)،
                كزرّ واتساب المصمت الأخضر بجانبه */}
            <NotePencil aria-hidden />
          </button>
        ) : null}
        {r.phone ? (
          <a className="abtn abtn-success abtn-sm vwq-wa" href={waHref(r.phone)} target="_blank" rel="noreferrer" aria-label={`مراسلة ${r.name} على واتساب`} title="واتساب">
            <WhatsappLogo aria-hidden />
          </a>
        ) : null}
      </span>
      {note && r.adminNote ? (
        <p className="vwq-note"><NotePencil aria-hidden /><span><b>ملاحظتك:</b> {r.adminNote}</span></p>
      ) : null}
      {memo ? <p className="vwq-note">{memo.icon}<span><b>{memo.label}:</b> {memo.text}</span></p> : null}
      {acts ? <span className="vwq-acts">{acts}</span> : null}
    </li>
  );

  const bandsOf = (list: AppRow[], line: (r: AppRow) => ReactNode, head?: (p: OppPeriod, n: number) => string) => (
    <>
      {bands(list).map((b) => (
        <section key={b.period?.id ?? "-"} className="vwq-band">
          {b.period ? (
            <h5 className="vwq-band-h">
              <span className="acard-ic"><CalendarBlank aria-hidden /></span>
              <span className="vwq-band-t">{periodLabel(b.period)}</span>
              <span className="vwq-band-n">
                <span className="acard-ic"><UsersThree aria-hidden /></span>
                {head ? head(b.period, b.rows.length) : arCount(b.rows.length, AR_VOLUNTEER)}
              </span>
            </h5>
          ) : null}
          <ul className="vwq-list">{b.rows.map(line)}</ul>
        </section>
      ))}
    </>
  );
  // رأسُها كرأس الفترة: أيقونةٌ قبل العنوان، وأيقونةُ الجمع قبل العدد
  const extraOf = (icon: ReactNode, title: string, list: AppRow[], line: (r: AppRow) => { sub: string | null; memo?: Memo }) =>
    list.length ? (
      <section className="vwq-band">
        <h5 className="vwq-band-h">
          <span className="acard-ic">{icon}</span>
          <span className="vwq-band-t">{title}</span>
          <span className="vwq-band-n"><span className="acard-ic"><UsersThree aria-hidden /></span>{arCount(list.length, AR_VOLUNTEER)}</span>
        </h5>
        <ul className="vwq-list">
          {list.map((r) => {
            const { sub, memo } = line(r);
            const when = r.periodId && periodOf.get(r.periodId) ? periodLabel(periodOf.get(r.periodId)!) : null;
            return row(r, [sub, when].filter(Boolean).join("، ") || null, undefined, false, memo);
          })}
        </ul>
      </section>
    ) : null;
  const empty = (children: ReactNode) => <p className="vrec-empty">{children}</p>;

  /* ── قائمةُ كلّ محطّة ── */
  const others = rows.filter((r) => r.status === "rejected" || r.status === "withdrawn" || r.status === "expired");
  const excused = of("excused");
  const panel: Record<Tab, ReactNode> = {
    apply: (
      <>
        {pending.length ? (
          bandsOf(pending, (r) => row(r, seatsGone(r) ? "بانتظار المراجعة، واكتمل عددُ فترته" : "بانتظار المراجعة", <>
              <Button variant="primary" size="sm" loading={busy === r.id} disabled={seatsGone(r)}
                onClick={() => run(r.id, () => decideApplication(r.id, true, "", opp.id))}><CheckCircle aria-hidden /> قبول</Button>
              <Button variant="ghost" size="sm" onClick={() => setAsk({ kind: "reject", row: r })}><XCircle aria-hidden /> رفض</Button>
            </>))
        ) : empty(rows.length ? "لا طلبات تنتظر المراجعة." : opp.status === "open" ? "لا متقدّمين بعد. انسخ رابط الفرصة وانشره في قروب المتطوّعين." : "لا متقدّمين.")}
        {extraOf(<UserMinus aria-hidden />, "طلباتٌ لم تُقبل", others, (r) =>
          r.status === "rejected" && r.decisionReason
            ? { sub: null, memo: { icon: <XCircle aria-hidden />, label: "لم يُقبل", text: r.decisionReason } }
            : { sub: OTHER[r.status] ?? null })}
      </>
    ),
    accept: (
      <>
        {accepted.length ? (
          bandsOf(accepted, (r) => row(r, null),
            (p, n) => (p.seats == null ? `قُبل ${n}، والعددُ مفتوح` : `قُبل ${n} من ${p.seats}`))
        ) : empty("لم يُقبل أحدٌ بعد.")}
        {extraOf(<SignOut aria-hidden />, "اعتذروا بعد قبولهم", excused, (r) =>
          r.excuseReason
            ? { sub: null, memo: { icon: <ChatCenteredText aria-hidden />, label: "اعتذر", text: r.excuseReason } }
            : { sub: "اعتذر" })}
      </>
    ),
    attend: accepted.length ? (
      bandsOf(accepted, (r) => row(r,
          !started(r) ? w.before : r.attendance === "attended" ? w.yes : r.attendance === "absent" ? w.no : w.wait,
          started(r) ? <>
            <Button variant={r.attendance === "attended" ? "primary" : "ghost"} size="sm" loading={busy === `${r.id}-att`}
              onClick={() => run(`${r.id}-att`, () => markAttendance(r.id, "attended", opp.id))}><CheckCircle aria-hidden /> {w.yes}</Button>
            <Button variant={r.attendance === "absent" ? "danger" : "ghost"} size="sm" loading={busy === `${r.id}-abs`}
              onClick={() => run(`${r.id}-abs`, () => markAttendance(r.id, "absent", opp.id))}><XCircle aria-hidden /> {w.no}</Button>
          </> : undefined, true))
    ) : empty(`لا مقبولين ليُؤكَّد ${flex ? "إنجازُهم" : "حضورُهم"}.`),
    /* **كلُّ حاضرٍ يأخذ شهادتَه** (قرارُ المجلس الإداريّ، ٢٠٢٦-١٠-٠٣): لا «يستحقّ ولا يستحقّ» بعد الحضور. الجاهزةُ
       تُصدَر بزرّ، ومن تميّز يُرشَّح بجملةٍ تُطبع في شهادته، والحجبُ استثناءٌ بسببٍ مكتوبٍ يُرفع. */
    certify: attended.length ? (
      bandsOf(attended, (r) => {
        const held = r.deservesCertificate === false;
        const memo: Memo | undefined = held && r.denialReason
          ? { icon: <Prohibit aria-hidden />, label: "حُجبت", text: r.denialReason }
          : !held && r.distinctionNote ? { icon: <Sparkle aria-hidden />, label: "تميّزه", text: r.distinctionNote } : undefined;
        return row(r,
          r.certificateSerial ? <>صدرت شهادتُه <bdi dir="ltr" className="lat">{r.certificateSerial}</bdi></>
            : held ? "شهادتُه محجوبة"
            : r.distinctionNote ? "شهادتُه جاهزة بتميّز" : "شهادتُه جاهزة",
          r.certificateSerial ? undefined
            : held ? (
              <Button variant="ghost" size="sm" loading={busy === `${r.id}-rel`}
                onClick={() => run(`${r.id}-rel`, () => releaseCertificate(r.id, opp.id))}><LockSimpleOpen aria-hidden /> رفعُ الحجب</Button>
            ) : <>
              <Button variant="primary" size="sm" loading={busy === `${r.id}-cert`}
                onClick={() => run(`${r.id}-cert`, () => issueCertificate(r.id, opp.id))}><SealCheck aria-hidden /> إصدارُ الشهادة</Button>
              <Button variant="ghost" size="sm" onClick={() => { setText(r.distinctionNote ?? ""); setAsk({ kind: "distinction", row: r }); }}>
                <Sparkle aria-hidden /> {r.distinctionNote ? "تعديلُ التميّز" : "ترشيحٌ للتميّز"}
              </Button>
              <Button variant="ghost-danger" size="sm" className="vwq-ic" title="حجبُ الشهادة" aria-label={`حجبُ شهادة ${r.name}`}
                onClick={() => { setText(""); setAsk({ kind: "withhold", row: r }); }}><Prohibit aria-hidden /></Button>
            </>, true, memo);
      })
    ) : empty(`لا ${flex ? "منجزين" : "حاضرين"} بعد لتصدر شهاداتُهم.`),
  };

  return (
    <>
      <PageHeader
        title={opp.title}
        crumbLeaf={opp.title}
        action={{ label: "تعديل", icon: <PencilSimple size={18} />, href: `/dashboard/volunteering/${opp.id}/edit` }}
        menu={canEnd ? [{ items: [{ label: "إنهاءُ الفرصة", icon: <FlagCheckered size={18} />, danger: true, onSelect: () => setEnding(true) }] }] : undefined}
      />

      <div className="vrec">
        {/* الرأس: هويّةُ الفرصة (الورقةُ والشارةُ والوصفُ والخانات) وبجانبها إحصاءاتُها، بكحليّ الصفحة ولونُ الحال للشارة وحدها */}
        <Card tone="brand" className="vrec-hero">
          <div className="vrec-hero-w">
            <div className="vrec-hero-in">
              <div className="vrec-hero-main">
                <div className="vop-head">
                  <Leaf o={card} />
                  <div className="vop-id">
                    <p className="vop-meta"><Badge tone={state.badge} size="sm">{state.label}</Badge></p>
                    {opp.description ? <p className="vrec-desc">{opp.description}</p> : null}
                  </div>
                </div>
                <OppFacts o={card} />
              </div>
              <dl className="vrec-kpis">
                {kpis.map((k) => (
                  <div key={k.key} className="vrec-kpi">
                    <span className="vrec-kpi-ic">{k.icon}</span>
                    <dt className="vrec-kpi-k">{k.label}</dt>
                    <dd className="vrec-kpi-v">{k.value}</dd>
                    <dd className="vrec-kpi-n">{k.note}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Card>

        {/* المراحلُ ولوحتُها: عمودٌ جانبيٌّ بجانب القائمة على العريض، وألسنةُ ملفّاتٍ في رأسها على ما دونه (`.vrec-work`) */}
        <div className="vrec-work-w">
          <div className="vrec-work">
            <div className="vrec-steps" role="tablist" aria-label="مراحلُ الفرصة">
              {stages.map((s) => {
                const on = tab === s.key;
                return (
                  <button
                    key={s.key}
                    id={`vrec-step-${s.key}`}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-controls="vrec-panel"
                    tabIndex={on ? 0 : -1}
                    className={`vrec-step${on ? " on" : ""}`}
                    onClick={() => setTab(s.key)}
                    onKeyDown={onTabKey}
                  >
                    <span className="vrec-step-ic">{s.icon}</span>
                    <span className="vrec-step-t">
                      <b className="vrec-step-n">{s.n ?? 0}</b>
                      <span className="vrec-step-k">{s.label}</span>
                      {due[s.key] ? (
                        <Badge tone="warning" size="sm" className="vrec-due">
                          <b className="num">{due[s.key]}</b><span className="vrec-due-w">بانتظارك</span>
                        </Badge>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <Card className="vop vop-mono vwq vrec-panel" id="vrec-panel" role="tabpanel" aria-labelledby={`vrec-step-${tab}`}>
              {panel[tab]}
            </Card>
          </div>
        </div>
      </div>

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
          <Button variant={ask?.kind === "withhold" ? "danger" : "primary"} size="md" loading={busy !== null} onClick={() => confirmAsk()}>{askOf?.save}</Button>
        </>}
      >
        <Textarea
          label={askOf?.label ?? ""} icon={<PencilSimple />} innerIcon={<PencilSimple />}
          placeholder={askOf?.placeholder ?? ""} rows={3} maxLength={ask?.kind === "distinction" ? 300 : undefined}
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
      <ConfirmDialog
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
