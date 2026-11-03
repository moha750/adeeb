"use client";

/**
 * غرفةُ شهادات الخبرة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١) — السلوكُ سلوكُ
 * `members/certificates/CertificatesView.tsx` القديم: البحثُ بالاسم والمسمّى والرقم المرجعيّ، ومرشّحا الحال والسنة،
 * والتنزيلُ (PDF وصورة) من لقطة يوم الإصدار، والإبطالُ بسببٍ لمن يبلغ صاحبَ الشهادة، والإصدارُ بنافذته نفسِها
 * (`IssueCertificateModal`). **والسجلُّ لقطةٌ لا حالٌ راهنة**: كلُّ سجلٍّ يقول ما رُسم على الورقة يومَ صدرت.
 */
import type { RoomView } from "../view";
import { MEMBER_CERTIFICATES_ROOM } from "./member-certificates.meta";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Modal, Textarea, matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, CalendarDots, ChatCenteredText, FilePdf, Hash, IdentificationCard, NotePencil, SealCheck, UserCircle } from "@phosphor-icons/react";
import { DownloadSimple, Eye, Prohibit } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { downloadCertificate, downloadCertificatePdf } from "@/lib/certificates/letter";
import { revokeCertificate } from "@/app/dashboard/members/certificates/actions";
import { IssueCertificateModal } from "@/app/dashboard/members/certificates/IssueCertificateModal";
import type { CertificateRow, CertificateTarget } from "@/app/dashboard/members/certificates/data";
import { AR_CERTIFICATE } from "@/lib/arabicCount";
import { AdActs, AdBadge, AdButton, AdCard, AdRow, type AdFigure, type AdMeta, type AdOp } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { dayParts, fmtDayFull } from "../format";

/** لا مواضعَ في الغرفة القديمة (جدولٌ واحد): موضعٌ واحدٌ يجمع كلَّ شيء، ولا مبدّل. */
/**
 * **مواضعُ الشهادات بحالها** (محمد ٢٠٢٦-١١-٠١، بعد رسائل التواصل): كان فوق الجدول القديم كاردُ إحصاء («سارية»، «مبطَلة») ومرشّحُ
 * حال — فصارت مواضعَ بأعدادها. و«أعضاء نالوها» عددُ أشخاصٍ لا حال: مكانُه صفحةُ الإحصاء.
 */
const POSITIONS: Position<CertificateRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا شهادات بعد." },
  { key: "valid", label: "سارية", match: (r) => r.status === "valid", empty: "لا شهادة سارية." },
  { key: "revoked", label: "مبطَلة", match: (r) => r.status === "revoked", empty: "لم تُبطَل شهادةٌ قطّ." },
];

/** يومٌ من الفترة (`YYYY-MM-DD`) بسنته — ظهرَه، فلا ينقلب يومًا بين الخادم والمتصفّح. */
const day = (d: string) => fmtDayFull(`${d.slice(0, 10)}T12:00:00`);
const period = (r: CertificateRow) => `${day(r.periodFrom)} ← ${day(r.periodTo)}`;
/** اسمُ الورقة يتبع صاحبَه إن تغيّر بعد الإصدار؛ فلا يخالف اسمَ الملفّ إلّا ما صحّحه المُصدِرُ بيده يومَ الإصدار، فيُذكر اسمُ الملفّ معه. */
const roleLine = (r: CertificateRow) => (r.paperName === r.name ? r.positionTitle : `${r.name}، ${r.positionTitle}`);

/** `serverNow` يمرّره كلُّ مسارٍ على القالب؛ ولا وقتَ نسبيًّا يُعرض في الشهادات فلا يُقرأ هنا. */
export function MemberCertificatesRoom({ rows, targets, view }: { rows: CertificateRow[]; targets: CertificateTarget[]; serverNow: number; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [issuing, setIssuing] = useState(false);
  const [revoking, setRevoking] = useState<CertificateRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  /** إعادةُ التنزيل تُرسَم من **اللقطة** لا من حال العضو اليوم — فالورقة واحدةٌ لا تتبدّل. وتنزيلٌ واحدٌ في كلّ مرّة. */
  const onDownload = async (r: CertificateRow, as: "png" | "pdf" = "png") => {
    if (busy) return;
    setBusy(true);
    try {
      const paper = {
        name: r.paperName,
        position: r.positionTitle,
        gender: r.gender,
        from: r.periodFrom,
        to: r.periodTo,
        serial: r.serial,
      };
      await (as === "pdf" ? downloadCertificatePdf(paper) : downloadCertificate(paper));
      toast.success("نُزّلت الشهادة.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد الشهادة.");
    } finally {
      setBusy(false);
    }
  };

  const submitRevoke = () => {
    if (!revoking) return;
    start(async () => {
      const res = await revokeCertificate({ id: revoking.id, reason });
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
      setRevoking(null);
      setReason("");
      router.refresh();
    });
  };

  /** الحالُ رقاقةٌ في العرضين (كانت عمودَ «الحالة»): ساريةٌ خضراء بختمها، ومبطَلةٌ حمراء. */
  const chips = (r: CertificateRow) =>
    r.status === "revoked"
      ? <AdBadge tone="bad" icon={<Prohibit />}>مبطَلة</AdBadge>
      : <AdBadge tone="ok" icon={<SealCheck />}>سارية</AdBadge>;
  /**
   * **السطورُ مصدرُها واحدٌ وترتيبُها واحد**: المسمّى (واسمُ الملفّ معه إن خالف اسمَ الورقة)، ثمّ الفترة، ثمّ «بإصدار فلان»
   * — «بإصدار» على قاعدة «بتحرير/بتنظيم» فلا تُخطئ جنسَ المُصدِر. وفي السطر الفترةُ عمودٌ فتخرج منها، **والمُصدِرُ يبقى سطرًا
   * تحت المسمّى كما في الكرت** (محمد ٢٠٢٦-١١-٠١، «جرّبه بمقاساتٍ مختلفة»: ثلاثةُ أعمدةٍ نصّيّة عصرت عمودَ العضو في الحاسب
   * المحمول حتى اختفى اسمُه، والمُصدِرُ أقلُّها حاجةً إلى المقارنة بين السطور).
   */
  const info = (r: CertificateRow, inCard: boolean): AdMeta[] => [
    { icon: <IdentificationCard />, text: roleLine(r) },
    ...(inCard ? [{ icon: <CalendarDots />, text: period(r) }] : []),
    ...(r.issuer ? [{ icon: <UserCircle />, text: `بإصدار ${r.issuer}` }] : []),
  ];
  /** الكعبُ: يومُ الإصدار وشهرُه (كان عمودَ «تاريخ الإصدار») — في الكرت، وكعبًا مصغّرًا أوّلَ السطر. */
  const stubOf = (r: CertificateRow) => { const d = dayParts(r.createdAt); return { big: d.day, small: d.month }; };
  /** الرقمُ المرجعيّ: رقمُ الكرت، وأوّلُ أعمدة السطر — بالخطّ اللاتينيّ كلُّه (`ltr`). */
  const figures = (r: CertificateRow): AdFigure[] => [{ icon: <Hash />, value: r.serial, label: "الرقم المرجعيّ", ltr: true }];

  /** قائمةُ الصفّ القديمة بترتيبها: تنزيلُ PDF (أساسيًّا، فلم يكن للصفّ وجهةُ نقر)، ثمّ الصورة، ثمّ الإبطالُ لمن يبلغه والساريةِ وحدها. */
  const ops = (r: CertificateRow): AdOp[] => [
    { key: "png", label: "تنزيل صورة", icon: <DownloadSimple />, onClick: () => void onDownload(r, "png"), disabled: busy },
    ...(r.mayManage && r.status === "valid"
      ? [{ key: "revoke", label: "إبطال الشهادة", icon: <Prohibit />, onClick: () => { setRevoking(r); setReason(""); }, danger: true }]
      : []),
  ];
  const acts = (r: CertificateRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "تنزيل PDF", icon: <FilePdf />, onClick: () => void onDownload(r, "pdf") }} ops={ops(r)} />
  );

  const years = [...new Set(rows.map((r) => r.periodTo.slice(0, 4)))].sort().reverse().map((y) => ({ value: y, label: y }));
  const openIssue = () => setIssuing(true);

  return (
    <>
      <CollectionRoom<CertificateRow>
        navPath={MEMBER_CERTIFICATES_ROOM.navPath}
        title={MEMBER_CERTIFICATES_ROOM.title}
        // «معاينة الشهادة» فعلٌ ثانٍ للغرفة كما كان في شريط أدوات القديمة — نصٌّ هادئٌ على اللوح بجانب «إصدار شهادة»
        extra={{ label: "افتح الشهادة", icon: <Eye />, href: "/dashboard/members/certificates/preview" }}
        // كان زرُّ الإصدار معطَّلًا حين لا عضوَ يبلغه الإصدار؛ واللوحُ لا يحمل فعلًا معطَّلًا، فلا يُعرض
        action={targets.length > 0 ? { label: "إصدار شهادة", icon: <SealCheck />, onClick: openIssue } : undefined}
        noun={AR_CERTIFICATE}
        items={rows}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث بالاسم أو المسمّى أو الرقم المرجعيّ…"
        matchSearch={(r, q) => matchesSearch(q, `${r.name} ${r.paperName} ${r.holderName} ${r.positionTitle} ${r.serial}`)}
        filters={[
          { key: "year", label: "السنة", options: years, match: (r, v) => r.periodTo.startsWith(v) },
        ]}
        viewKey={MEMBER_CERTIFICATES_ROOM.viewKey}
        initialView={view}
        idOf={(r) => r.id}
        table={{
          // الترتيبُ بالعضو وتاريخ الإصدار من رأسيهما كجداول الغرف كلّها (محمد ٢٠٢٦-١١-٠١؛ لم يكن في الجدول القديم)
          head: "العضو",
          headSortBy: (r) => r.paperName,
          stub: { key: "date", label: "تاريخ الإصدار", icon: <CalendarBlank />, sortBy: (r) => +new Date(r.createdAt) },
          columns: [
            { key: "serial", label: "الرقم المرجعيّ", icon: <Hash />, text: true },
            { key: "period", label: "الفترة", icon: <CalendarDots />, text: true },
          ],
        }}
        emptyAll={{ title: "لا شهادات بعد", desc: "من استحقّ شهادةَ خبرةٍ تُصدَر له من هنا، فتُرسَم على قالب النادي وتُحفظ برقمٍ مرجعيّ." }}
        createAction={<AdButton variant="fill" icon={<SealCheck />} onClick={openIssue}>إصدار شهادة</AdButton>}
        renderCard={(r) => (
          <AdCard
            key={r.id}
            seed={r.id}
            stub={stubOf(r)}
            chips={chips(r)}
            title={r.paperName}
            meta={info(r, true)}
            figures={figures(r)}
            foot={acts(r)}
          />
        )}
        renderRow={(r) => (
          <AdRow
            key={r.id}
            title={r.paperName}
            stub={{ ...stubOf(r), seed: r.id }}
            badge={chips(r)}
            sub={info(r, false)}
            cells={[
              ...figures(r).map((f) => ({ label: f.label, value: f.value, text: true, ltr: f.ltr })),
              { label: "الفترة", value: period(r), text: true },
            ]}
            acts={acts(r, true)}
          />
        )}
      />

      <IssueCertificateModal open={issuing} targets={targets} onClose={() => setIssuing(false)} />

      <Modal
        open={!!revoking}
        onClose={() => setRevoking(null)}
        size="sm"
        busy={pending}
        className="mdl-tone-danger"
        title="إبطال الشهادة"
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
            الورقةُ التي سُلِّمت لا تُسترجع؛ الإبطالُ يُعلن في السجلّ أنّها لم تعد معتمدة.
          </Alert>
        ) : null}
        <Textarea
          label="سبب الإبطال"
          icon={<ChatCenteredText />}
          innerIcon={<NotePencil />}
          placeholder="لماذا أُبطلت؟ (خطأٌ في الاسم أو الفترة، أو صدرت لغير مستحقّ…)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
          helper="خمسة أحرف فأكثر."
        />
      </Modal>
    </>
  );
}
