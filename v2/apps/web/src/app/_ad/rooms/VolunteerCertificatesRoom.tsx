"use client";

/**
 * غرفةُ شهادات المتطوّعين على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٤) — السلوكُ سلوكُ `volunteering/certificates/ParticipationView.tsx`
 * القديم بمواضعه الثلاثة على ترتيب الحياة:
 *
 * 1. **بانتظار الحضور**: مقبولٌ في فرصةٍ حلّ موعدُها لم يُسجَّل حضورُه (`timeOf` مصدرُ «حلّ الموعد» الواحد). **تحت فرصته**: الفرصةُ
 *    وحدةُ العمل (أقرّه المالك ٢٠٢٦-١٠-٠٣: «يُسجَّل أهلُ الفعالية الواحدة معًا، واسمُها يُكتب مرّةً»)، فرأسُ المجموعة يومُها واسمُها
 *    وجهتُها وعددُ من ينتظر و«افتح الفرصة»، وتحته سطرُ كلّ متطوّعٍ بوجهه: «حاضر» و«غائب» ظاهرين، و«التواصل» في ملفّه.
 * 2. **جاهزة لم تصدر**: حضر ولم تصدر شهادتُه — «إصدار الشهادة» ظاهرًا، والترشيحُ للتميّز والحجبُ بسببٍ في «المزيد». و«إصدار الكلّ»
 *    القديمُ صار **التحديدَ الجماعيّ** (محمد ٢٠٢٦-١١-٠٤: شريطُ الأدوات للبحث والتصفية لا للأفعال): يُحدَّد من يُصدَر له — أو الكلُّ من
 *    رأس الجدول — فيظهر شريطُ التحديد بـ«إصدار الشهادات» وتأكيدٍ يقول عددَه. والتحديدُ في هذا الموضع وحده.
 * 3. **السجلّ**: الصادرةُ كلُّها ساريةً ومُبطَلة، كروتًا وجدولًا **كشهادات الخبرة حرفًا** (يومُ الإصدار في الكعب، والرقمُ المرجعيّ
 *    رقمُ الكرت): تُنزَّل من لقطتها، وتُبطَل بسبب، والمُبطَلةُ تُقرأ تفاصيلُ إبطالها.
 *
 * والنقرُ على المتطوّع يفتح ملفَّه (نافذةُ سجلّ المتطوّعين نفسُها تُجلَب عند الضغط)، وفعلُ الرأس «إصدار شهادة» لمن شارك بلا طلب.
 */
import type { RoomView } from "../view";
import { VOLUNTEER_CERTIFICATES_ROOM } from "./volunteer-certificates.meta";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, LogoLoader, Modal, Textarea, matchesSearch, overBy } from "@adeeb/design-system";
import { DISTINCTION_NOTE_MAX } from "@/lib/volunteerNotes";
import {
  Buildings, CalendarBlank, CalendarDots, CalendarX, Certificate, ChatCenteredText, ClipboardText, FilePdf, HandHeart, Hash,
  Infinity as Endless, NotePencil, SealCheck, Sparkle, UserCircle, UsersThree, WhatsappLogo,
} from "@phosphor-icons/react";
import { CheckCircle, DownloadSimple, Info, PencilSimple, Prohibit, XCircle } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { Cell } from "@/app/dashboard/_components/Cell";
import { AR_CERTIFICATE, AR_VOLUNTEER, arCount } from "@/lib/arabicCount";
import { waHref } from "@/lib/whatsapp";
import {
  issueCertificate, issueCertificates, markAttendance, nominateDistinction, revokeParticipation, volunteerRecord, withholdCertificate,
} from "@/app/dashboard/volunteering/actions";
import type { CertificatesRoom, CertQueueRow, IssuedCertRow, ManualIssueOptions, VolunteerRow } from "@/app/dashboard/volunteering/data";
import { timeOf } from "@/app/dashboard/volunteering/OpportunityCard";
import { VolunteerHero, VolunteerRecord } from "@/app/dashboard/volunteering/volunteers/VolunteerRecord";
import { queueWords } from "@/app/dashboard/volunteering/certificates/AwaitingCards";
import { servedLabel } from "@/app/dashboard/volunteering/certificates/CertificateCard";
import { ManualIssueModal } from "@/app/dashboard/volunteering/certificates/ManualIssueModal";
import {
  AdActs, AdBadge, AdButton, AdCard, AdConfirm, AdGroupHead, AdRow, AdStubTile,
  type AdFigure, type AdMeta, type AdOp, type AdStub,
} from "../primitives";
import { CollectionRoom, type Position, type TableSpec } from "../collection";
import { dayParts } from "../format";

/** سجلُّ الغرفة: متطوّعٌ في أحد الطابورين، أو شهادةٌ صدرت — والموضعُ يختار نوعَه. */
type Item =
  | { kind: "await" | "owed"; id: string; r: CertQueueRow }
  | { kind: "cert"; id: string; c: IssuedCertRow };
type Queue = Extract<Item, { r: CertQueueRow }>;

/** يومُ الفرصة في كعب رأسها: يومُ بدايتها، والمرنةُ لانهايةٌ لا تقويم (كعبُ كرت الفرصة نفسُه في غرفة الفرص). */
const oppStub = (r: CertQueueRow): AdStub | undefined => {
  if (r.flexible) return { big: "", icon: <Endless />, small: "مرنة" };
  if (!r.startsOn) return undefined;
  const d = dayParts(`${r.startsOn}T12:00:00`);
  return { big: d.day, small: d.month };
};

export function VolunteerCertificatesRoom({ room, today, manual, view }: {
  room: CertificatesRoom;
  today: string;
  /** خياراتُ «إصدار شهادة» لمتطوّعٍ بلا طلب، وغيابُها يُسقط الفعل. */
  manual?: ManualIssueOptions;
  serverNow: number;
  view?: RoomView;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  // زرُّ السطر الذي يعمل (`<id>-yes|no|issue`) بانتقالٍ وحدَه، فلا يدور زرٌّ في سطرٍ لعملٍ في غيره
  const [rowPending, startRow] = useTransition();
  const [rowKey, setRowKey] = useState<string | null>(null);
  const busyKey = rowPending ? rowKey : null;
  const [issuing, setIssuing] = useState<string[] | null>(null);
  const [revoking, setRevoking] = useState<IssuedCertRow | null>(null);
  const [details, setDetails] = useState<IssuedCertRow | null>(null);
  const [drawing, setDrawing] = useState<{ id: string; kind: "pdf" | "png" } | null>(null);
  const [reason, setReason] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  // نافذةُ السطر في «جاهزة لم تصدر»: جملةُ التميّز أو سببُ الحجب
  const [asking, setAsking] = useState<{ kind: "distinction" | "withhold"; row: CertQueueRow } | null>(null);
  const [askText, setAskText] = useState("");
  // الملفُّ يبقى في النافذة وهي تُغلَق، فلا تفرغ في حركة خروجها؛ و`null` وهي مفتوحةٌ يعني أنّه يُجلَب
  const [profileOf, setProfileOf] = useState<CertQueueRow | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<VolunteerRow | null>(null);

  // الدَّينُ ما حلّ موعدُه: مقبولٌ في فرصةٍ لم تبدأ ليس متأخّرًا بشيء
  const items = useMemo<Item[]>(() => [
    ...room.awaiting.filter((r) => { const t = timeOf(r, today); return t.ended || t.running; }).map((r) => ({ kind: "await" as const, id: r.id, r })),
    ...room.owed.map((r) => ({ kind: "owed" as const, id: r.id, r })),
    ...room.issued.map((c) => ({ kind: "cert" as const, id: c.id, c })),
  ], [room, today]);

  const after = (r: { ok: boolean; message: string }) => {
    if (!r.ok) { toast.error(r.message); return false; }
    toast.success(r.message);
    router.refresh();
    return true;
  };
  /** فعلُ سطرٍ في الطابور: يدور زرُّه حتى يعود الطابورُ من القاعدة بحاله الجديد، لا حتى يُجاب الطلبُ وحدَه. */
  const rowAct = (key: string, fn: () => Promise<{ ok: boolean; message: string }>) => {
    setRowKey(key);
    startRow(async () => { after(await fn()); });
  };
  const openRecord = (oppId: string) => router.push(`/dashboard/volunteering/${oppId}`);
  const openProfile = async (r: CertQueueRow) => {
    setProfileOf(r);
    setProfile(null);
    setProfileOpen(true);
    const v = await volunteerRecord(r.userId);
    if (v) setProfile(v);
    else { setProfileOpen(false); toast.error("تعذّر فتحُ ملفّه."); }
  };

  /** المحدَّدون وحدهم (والكلُّ من رأس الجدول)، والتأكيدُ يقول العددَ قبل الفعل. */
  const issueAll = () => {
    if (!issuing) return;
    start(async () => {
      if (after(await issueCertificates(issuing))) setIssuing(null);
    });
  };
  /** الورقةُ تُرسَم من **اللقطة** لا من حال المتطوّع اليوم: الشهادةُ واحدةٌ لا تتبدّل بإعادة التنزيل. */
  const draw = async (c: IssuedCertRow, kind: "png" | "pdf") => {
    if (drawing) return;
    setDrawing({ id: c.id, kind });
    try {
      // راسمُ الورق ثقيل، فيُحمَّل عند الطلب لا مع الصفحة (سنّةُ `/me`)
      const mod = await import("@/lib/certificates/participation");
      const paper = {
        name: c.paperName, serial: c.serial, opportunity: c.opportunity,
        gender: c.gender, from: c.servedFrom, to: c.servedTo, hours: c.hours, distinction: c.distinction,
      };
      await (kind === "pdf" ? mod.downloadParticipationPdf(paper) : mod.downloadParticipation(paper));
      toast.success("نُزّلت الشهادة.");
    } catch {
      toast.error("تعذّر رسمُ الشهادة. حاول مجدّدًا.");
    } finally {
      setDrawing(null);
    }
  };
  const submitRevoke = () => {
    if (!revoking) return;
    start(async () => {
      if (after(await revokeParticipation(revoking.id, reason))) { setRevoking(null); setReason(""); }
    });
  };
  const submitAsk = (text = askText) => {
    if (!asking) return;
    const { kind, row } = asking;
    rowAct(`${row.id}-${kind}`, async () => {
      const res = kind === "distinction"
        ? await nominateDistinction(row.id, text, row.oppId)
        : await withholdCertificate(row.id, text, row.oppId);
      if (res.ok) setAsking(null);
      return res;
    });
  };

  /* ── الطابوران: متطوّعٌ بوجهه تحت فرصته ─────────────────────────────── */

  /** الشارةُ: التميّزُ لمن رُشّح له (كانت «الشهادةُ جاهزة بتميّز»)؛ وحالُ الطابور يقولها موضعُه فلا تتكرّر على كلّ سطر. */
  const queueChips = (x: Queue) => (x.kind === "owed" && x.r.distinctionNote ? <AdBadge tone="ok" icon={<Sparkle />}>بتميّز</AdBadge> : undefined);
  /** السطور: فترتُه (الحضورُ للفترة)، ثمّ ملاحظةُ مسؤول الفرصة (أوّلُ ما يُقرأ قبل الحكم) أو جملةُ تميّزه. */
  const queueInfo = (x: Queue): AdMeta[] => [
    ...(x.r.period ? [{ icon: <CalendarBlank />, text: x.r.period }] : []),
    ...(x.kind === "await" && x.r.adminNote ? [{ icon: <NotePencil />, text: `ملاحظةُ مسؤول الفرصة: ${x.r.adminNote}` }] : []),
    ...(x.kind === "owed" && x.r.distinctionNote ? [{ icon: <Sparkle />, text: `تميّزه: ${x.r.distinctionNote}` }] : []),
  ];
  /**
   * الأفعال بقاعدة القالب: الأساسيُّ ظاهرٌ (الحضورُ، والإصدار)، والبقيّةُ في «المزيد». والزرُّ يدور حتى يغادر السطرُ طابورَه.
   * **و«حاضر» و«غائب» ظاهران معًا** (محمد ٢٠٢٦-١١-٠٤): جوابان لسؤالٍ واحد لا فعلٌ وثانٍ، كـ«اقبل» و«ردّ» في طلبات الخروج. فالتواصلُ
   * (كان زرَّ واتساب في السطر لمن شكّ في حضوره) خرج إلى ملفّ المتطوّع الذي يُفتح باسمه، وفيه جوّالُه أصلًا — فيبقى «غائب» وحدَه بعد
   * الأساسيّ فيظهر باسمه بالقاعدة نفسِها.
   */
  const queueActs = (x: Queue, inRow?: boolean) => {
    const r = x.r;
    if (x.kind === "await") {
      const w = queueWords(r.flexible);
      const ops: AdOp[] = [
        { key: "no", label: w.no, icon: <XCircle />, busy: busyKey === `${r.id}-no`, onClick: () => rowAct(`${r.id}-no`, () => markAttendance(r.id, "absent", r.oppId)) },
      ];
      return (
        <AdActs
          inRow={inRow}
          primary={{ label: w.yes, icon: <CheckCircle />, busy: busyKey === `${r.id}-yes`, onClick: () => rowAct(`${r.id}-yes`, () => markAttendance(r.id, "attended", r.oppId)) }}
          ops={ops}
        />
      );
    }
    const ops: AdOp[] = [
      { key: "dist", label: r.distinctionNote ? "تعديلُ التميّز" : "ترشيحٌ للتميّز", icon: <Sparkle />, onClick: () => { setAsking({ kind: "distinction", row: r }); setAskText(r.distinctionNote ?? ""); } },
      { key: "withhold", label: "حجبُ الشهادة", icon: <Prohibit />, danger: true, onClick: () => { setAsking({ kind: "withhold", row: r }); setAskText(""); } },
    ];
    return (
      <AdActs
        inRow={inRow}
        primary={{ label: "إصدار الشهادة", icon: <SealCheck />, busy: busyKey === `${r.id}-issue`, onClick: () => rowAct(`${r.id}-issue`, () => issueCertificate(r.id, r.oppId)) }}
        ops={ops}
      />
    );
  };
  const face = (r: CertQueueRow) => ({ name: r.name, src: r.avatar, gender: r.gender });

  /** رأسُ الفرصة فوق متطوّعيها: يومُها في الكعب، واسمُها، وجهتُها وموعدُها، وكم ينتظر منها — و«افتح الفرصة» إلى سجلّها. */
  const oppHead = (list: Item[]) => {
    const first = list[0] as Queue;
    const r = first.r;
    const n = list.length;
    const sub: AdMeta[] = [
      ...(r.committee ? [{ icon: <Buildings />, text: r.committee }] : []),
      // المدى حين تمتدّ الفرصةُ أكثرَ من يوم وحدَه: يومُها الواحد يقوله الكعبُ، فلا يتكرّر في السطر بجانبه (محمد ٢٠٢٦-١١-٠٤)
      ...(r.dateLabel && r.endsOn && r.endsOn !== r.startsOn ? [{ icon: <CalendarBlank />, text: r.dateLabel }] : []),
      first.kind === "await"
        ? { icon: <UsersThree />, text: `${arCount(n, AR_VOLUNTEER)} بانتظارك` }
        : { icon: <Certificate />, text: `${arCount(n, AR_CERTIFICATE)} بانتظار الإصدار` },
    ];
    return (
      <AdGroupHead
        lead={<AdStubTile seed={r.oppId} stub={oppStub(r)} />}
        title={r.opportunity}
        sub={sub}
        act={<AdButton variant="soft" size="sm" icon={<ClipboardText />} onClick={() => openRecord(r.oppId)}>افتح الفرصة</AdButton>}
      />
    );
  };

  /* ── السجلّ: شهادةٌ صدرت (كشهادات الخبرة) ─────────────────────────── */

  const certChips = (c: IssuedCertRow) => (
    <>
      {c.status === "revoked"
        ? <AdBadge tone="bad" icon={<Prohibit />}>مبطَلة</AdBadge>
        : <AdBadge tone="ok" icon={<SealCheck />}>سارية</AdBadge>}
      {c.distinction ? <AdBadge icon={<Sparkle />}>بتميّز</AdBadge> : null}
    </>
  );
  const served = (c: IssuedCertRow) => servedLabel(c.servedFrom, c.servedTo) || "المدّة غير مسجّلة";
  /** السطور: الفرصةُ وجهتُها، ثمّ المدّة (عمودٌ في السطر فتخرج منه)، ثمّ «بإصدار فلان»، وسببُ الإبطال للمُبطَلة. */
  const certInfo = (c: IssuedCertRow, inCard: boolean): AdMeta[] => [
    { icon: <HandHeart />, text: c.committee ? `${c.opportunity}، ${c.committee}` : c.opportunity },
    ...(inCard ? [{ icon: <CalendarDots />, text: served(c) }] : []),
    ...(c.issuedBy ? [{ icon: <UserCircle />, text: `بإصدار ${c.issuedBy}` }] : []),
    ...(c.status === "revoked" && c.revokeReason ? [{ icon: <NotePencil />, text: `سببُ الإبطال: ${c.revokeReason}`, clip: true, tone: "muted" as const }] : []),
  ];
  const certStub = (c: IssuedCertRow) => {
    if (!c.issuedIso) return undefined;
    const d = dayParts(c.issuedIso);
    return { big: d.day, small: d.month };
  };
  const certFigures = (c: IssuedCertRow): AdFigure[] => [{ icon: <Hash />, value: c.serial, label: "الرقم المرجعيّ", ltr: true }];
  /** الساريةُ: «تنزيل PDF» ظاهرًا، ثمّ الصورة، وسجلُّ الفرصة، والإبطالُ آخرًا. والمُبطَلةُ: تفاصيلُ إبطالها (كان زرَّ ذيلها). */
  const certActs = (c: IssuedCertRow, inRow?: boolean) => {
    const record: AdOp[] = c.oppId ? [{ key: "opp", label: "افتح الفرصة", icon: <ClipboardText />, onClick: () => openRecord(c.oppId!) }] : [];
    if (c.status === "revoked") {
      return <AdActs inRow={inRow} primary={{ label: "تفاصيل الإبطال", icon: <Info />, onClick: () => setDetails(c) }} ops={record} />;
    }
    const mine = drawing?.id === c.id ? drawing.kind : null;
    return (
      <AdActs
        inRow={inRow}
        primary={{ label: "تنزيل PDF", icon: <FilePdf />, busy: mine === "pdf", onClick: () => void draw(c, "pdf") }}
        ops={[
          { key: "png", label: "تنزيل صورة", icon: <DownloadSimple />, busy: mine === "png", disabled: !!drawing, onClick: () => void draw(c, "png") },
          ...record,
          { key: "revoke", label: "إبطال الشهادة", icon: <Prohibit />, danger: true, onClick: () => { setRevoking(c); setReason(""); } },
        ]}
      />
    );
  };

  const positions: Position<Item>[] = [
    { key: "awaiting", label: "بانتظار الحضور", match: (x) => x.kind === "await", empty: "لا أحدَ ينتظر تأكيدَ حضوره.", noun: AR_VOLUNTEER, pick: false },
    { key: "owed", label: "جاهزة لم تصدر", match: (x) => x.kind === "owed", empty: "لا شهادةَ جاهزةً معلّقة." },
    { key: "issued", label: "السجلّ", match: (x) => x.kind === "cert", empty: "لا شهادات بعد.", pick: false },
  ];
  /** معرّفُ السجلّ في الغرفة نوعُه ومعرّفُه (`owed:<id>`)؛ والإصدارُ بمعرّف الطلب وحده */
  const appOf = (key: string) => key.slice(key.indexOf(":") + 1);

  /** الطابوران: وجهُ المتطوّع كعبُه ولا أعمدة. والسجلُّ: يومُ الإصدار كعبُه، والرقمُ والمدّةُ عمودان (كشهادات الخبرة). */
  const table = (pos: string): TableSpec<Item> => pos === "issued"
    ? {
      head: "المتطوّع",
      headSortBy: (x) => (x.kind === "cert" ? x.c.paperName : ""),
      stub: { key: "date", label: "تاريخ الإصدار", icon: <CalendarBlank />, sortBy: (x) => (x.kind === "cert" && x.c.issuedIso ? +new Date(x.c.issuedIso) : 0) },
      columns: [
        { key: "serial", label: "الرقم المرجعيّ", icon: <Hash />, text: true },
        { key: "served", label: "المدّة", icon: <CalendarDots />, text: true },
      ],
    }
    : { head: "المتطوّع", headSortBy: (x) => (x.kind === "cert" ? "" : x.r.name), stub: { key: "face", label: "", icon: <UserCircle /> }, columns: [] };

  const renderCard = (x: Item): ReactNode => x.kind === "cert" ? (
    <AdCard key={x.id} seed={x.id} stub={certStub(x.c)} chips={certChips(x.c)} title={x.c.paperName} meta={certInfo(x.c, true)} figures={certFigures(x.c)} foot={certActs(x.c)} />
  ) : (
    <AdCard key={x.id} seed={x.id} face={face(x.r)} chips={queueChips(x)} title={x.r.name} onOpen={() => void openProfile(x.r)} meta={queueInfo(x)} foot={queueActs(x)} />
  );
  const renderRow = (x: Item): ReactNode => x.kind === "cert" ? (
    <AdRow
      key={x.id}
      title={x.c.paperName}
      stub={{ ...certStub(x.c), seed: x.id }}
      badge={certChips(x.c)}
      sub={certInfo(x.c, false)}
      cells={[
        ...certFigures(x.c).map((f) => ({ label: f.label, value: f.value, text: true, ltr: f.ltr })),
        { label: "المدّة", value: served(x.c), text: true },
      ]}
      acts={certActs(x.c, true)}
    />
  ) : (
    <AdRow key={x.id} face={face(x.r)} title={x.r.name} onOpen={() => void openProfile(x.r)} badge={queueChips(x)} sub={queueInfo(x)} cells={[]} acts={queueActs(x, true)} />
  );

  const openManual = () => setManualOpen(true);

  return (
    <>
      <CollectionRoom<Item>
        navPath={VOLUNTEER_CERTIFICATES_ROOM.navPath}
        title={VOLUNTEER_CERTIFICATES_ROOM.title}
        // فعلُ الرأس: شهادةٌ لمن شارك بلا طلب (٢٠٢٦-١٠-٠٣) — ما سواه يصدر من طابوره
        action={manual ? { label: "إصدار شهادة", icon: <SealCheck />, onClick: openManual } : undefined}
        noun={AR_CERTIFICATE}
        items={items}
        positions={positions}
        defaultPosition="awaiting"
        // البحثُ يقرأ الجوّالَ أيضًا، والنصُّ أقصر من أن يُقصّ في الجوّال (محمد ٢٠٢٦-١١-٠٤)
        searchPlaceholder="ابحث بالاسم أو الفرصة أو الرقم المرجعيّ…"
        matchSearch={(x, q) => x.kind === "cert"
          ? matchesSearch(q, `${x.c.name} ${x.c.paperName} ${x.c.holderName} ${x.c.opportunity} ${x.c.serial}`)
          : matchesSearch(q, `${x.r.name} ${x.r.phone} ${x.r.opportunity}`)}
        filters={[{
          key: "status", label: "الحالة", in: ["issued"],
          options: [{ value: "active", label: "سارية" }, { value: "revoked", label: "مبطَلة" }],
          match: (x, v) => x.kind === "cert" && x.c.status === v,
        }]}
        viewKey={VOLUNTEER_CERTIFICATES_ROOM.viewKey}
        initialView={view}
        idOf={(x) => `${x.kind}:${x.id}`}
        // الفعلُ بعدد المحدَّد: «إصدار الشهادة» لواحد، و«إصدار الشهادتين» لاثنين، و«إصدار الشهادات» لما فوقهما
        bulk={(ids) => [{
          key: "issue", icon: <SealCheck />, onClick: () => setIssuing(ids.map(appOf)),
          label: ids.length === 1 ? "إصدار الشهادة" : ids.length === 2 ? "إصدار الشهادتين" : "إصدار الشهادات",
        }]}
        group={{ of: (x) => (x.kind === "cert" ? x.id : `${x.kind}:${x.r.oppId}`), head: oppHead, in: ["awaiting", "owed"] }}
        table={table}
        emptyAll={{ title: "لا شهادات بعد", desc: "تصدر الشهادةُ لكلّ من حضر، فتُحفظ هنا برقمها المرجعيّ." }}
        createAction={manual ? <AdButton variant="fill" icon={<SealCheck />} onClick={openManual}>إصدار شهادة</AdButton> : undefined}
        renderCard={renderCard}
        renderRow={renderRow}
      />

      {/* نافذةُ السطر: جملةُ التميّز تُطبع في شهادته، وسببُ الحجب يُحفظ ويراه صاحبُه (كسجلّ الفرصة نفسِه) — نافذةُ القديمة حرفًا */}
      <Modal
        open={asking !== null}
        onClose={() => setAsking(null)}
        size="sm"
        busy={rowPending}
        title={asking?.kind === "withhold" ? "حجبُ الشهادة" : "ترشيحٌ للتميّز"}
        // الرأسُ من يقع عليه الفعل، والشرحُ رسالةُ الجسم (سطرٌ واحد في الرأس، محمد ٢٠٢٦-١١-٢٠)
        description={asking ? `${asking.row.name}، ${asking.row.opportunity}` : undefined}
        footer={
          <>
            {asking?.kind === "distinction" && asking.row.distinctionNote ? (
              <Button variant="ghost-danger" size="md" disabled={rowPending} onClick={() => submitAsk("")}>إلغاءُ الترشيح</Button>
            ) : null}
            <Button variant="ghost" size="md" onClick={() => setAsking(null)} disabled={rowPending}>إلغاء</Button>
            <Button variant={asking?.kind === "withhold" ? "danger" : "primary"} size="md" loading={rowPending}
              disabled={askText.trim().length < 5 || (asking?.kind === "distinction" && overBy(askText.trim(), DISTINCTION_NOTE_MAX) > 0)} onClick={() => submitAsk()}>
              {asking?.kind === "withhold" ? "حجبُ الشهادة" : "ترشيحُه"}
            </Button>
          </>
        }
      >
        {asking?.kind === "withhold" ? (
          <Alert tone="warning" title="استثناءٌ لمخالفةٍ صريحة">يُحفظ السببُ في السجلّ ويراه صاحبُه، ويُرفع الحجبُ من سجلّ الفرصة.</Alert>
        ) : (
          <Alert tone="info" title="تصدر الشهادةُ بختم «بتميّز»">وتُطبع جملتُك فيها كما تكتبها.</Alert>
        )}
        <Textarea
          label={asking?.kind === "withhold" ? "سببُ الحجب" : "سببُ تميّزه"}
          icon={asking?.kind === "withhold" ? <Prohibit /> : <Sparkle />} innerIcon={<PencilSimple />}
          placeholder={asking?.kind === "withhold" ? "ما الذي خالف فيه" : "مثلًا: أدار ركن الاستقبال وحده بعد غياب زميله"}
          rows={3} count={asking?.kind === "distinction" ? { max: DISTINCTION_NOTE_MAX } : undefined}
          value={askText} onChange={(e) => setAskText(e.target.value)} required helper="خمسة أحرف فأكثر."
        />
      </Modal>

      {/* ملفُّ المتطوّع: نافذةُ سجلّ المتطوّعين نفسُها لا شكلٌ ثانٍ لها، تُجلَب عند الضغط — وفي ذيلها «التواصل» (خرج إليه من سطر الطابور) */}
      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={profileOf?.name ?? "الملفّ"}
        size="md"
        className="pvb-modal"
        hero={profile ? <VolunteerHero v={profile} /> : undefined}
        footer={
          <>
            {profileOf?.phone ? (
              <Button variant="primary" size="md" onClick={() => window.open(waHref(profileOf.phone), "_blank", "noopener")}>
                <WhatsappLogo aria-hidden /> التواصل
              </Button>
            ) : null}
            <Button variant="ghost" size="md" onClick={() => setProfileOpen(false)}>إغلاق</Button>
          </>
        }
      >
        {profile ? <VolunteerRecord v={profile} /> : <LogoLoader orientation="horizontal" minHeight="240px" label="يُجلَب الملفّ…" />}
      </Modal>

      {manual ? <ManualIssueModal open={manualOpen} onClose={() => setManualOpen(false)} options={manual} /> : null}

      <AdConfirm
        open={issuing !== null}
        onClose={() => setIssuing(null)}
        tone="success"
        icon={<SealCheck />}
        title={issuing?.length === 1 ? "إصدار الشهادة الجاهزة؟" : issuing?.length === 2 ? "إصدار الشهادتين الجاهزتين؟" : "إصدار الشهادات الجاهزة؟"}
        text={`تصدر الآن ${arCount(issuing?.length ?? 0, AR_CERTIFICATE)} لمن حدّدتهم، كلٌّ برقمه المرجعيّ، وتظهر في حساب صاحبها.`}
        confirmLabel="إصدار"
        loading={pending}
        onConfirm={issueAll}
      />

      <Modal
        open={!!revoking}
        onClose={() => setRevoking(null)}
        size="sm"
        busy={pending}
        className="mdl-tone-danger"
        title="إبطال الشهادة"
        // سطرُ الرأس سطرٌ واحد، والشرحُ في رسالة الجسم (محمد ٢٠٢٦-١١-٢٠: سطرُ النافذة على لوحها، والطويلُ يُثقله)
        description="لا تُمحى، تبقى في السجلّ مشطوبةً بسببها."
        footer={
          <>
            <Button variant="danger" size="md" loading={pending} disabled={reason.trim().length < 5} onClick={submitRevoke}>
              <Prohibit aria-hidden /> إبطال
            </Button>
            <Button variant="ghost-danger" size="md" onClick={() => setRevoking(null)} disabled={pending}>تراجع</Button>
          </>
        }
      >
        {revoking ? (
          <Alert tone="danger" title={<>{revoking.paperName}، <bdi dir="ltr" className="lat">{revoking.serial}</bdi></>}>
            الورقةُ التي بيده لا تُسترجع؛ الإبطالُ يُعلن في السجلّ أنّها لم تعد معتمدة. ويعود صاحبُها إلى «جاهزة لم تصدر» حتى تُصدَر له من جديد أو تُحجب بسببها.
          </Alert>
        ) : null}
        <Textarea
          label="سبب الإبطال"
          icon={<ChatCenteredText />}
          innerIcon={<NotePencil />}
          placeholder="لماذا أُبطلت؟ (خطأٌ في الاسم أو المدّة، أو مخالفةٌ تستوجب حجبَها…)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
          helper="خمسة أحرف فأكثر."
        />
      </Modal>

      {/* **تفاصيلُ الإبطال رصاصيّةٌ كلُّها** (المالك ٢٠٢٦-١٠-٠١): متى، وبيد من، والسببُ كاملًا — نافذةُ كرت «الختم» القديم حرفًا */}
      <Modal
        open={!!details}
        onClose={() => setDetails(null)}
        size="sm"
        className="mdl-tone-neutral"
        title="تفاصيل الإبطال"
        description={details ? `${details.paperName}، ${details.serial}` : undefined}
        footer={<Button variant="ghost" size="md" onClick={() => setDetails(null)}>إغلاق</Button>}
      >
        {details ? (
          <div className="pva-grid">
            <Cell noCopy label="أُبطلت في" icon={<CalendarX />} value={details.revokedAt} />
            <Cell noCopy label="بيد" icon={<UserCircle />} value={details.revokedBy} />
            <Cell full wrap noCopy label="السبب" icon={<NotePencil />} value={details.revokeReason} />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
