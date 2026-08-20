"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Field, Select, type SelectOption, Modal } from "@adeeb/design-system";
import { Certificate, FilePdf, IdentificationCard, NotePencil, SealCheck, UserCircle } from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import { Avatar } from "../../_components/Avatar";
import { useToast } from "../../_components/ToastProvider";
import { downloadCertificate, downloadCertificatePdf } from "@/lib/certificates/letter";
import { certDate } from "@/lib/certificates/text";
import { arabicNameError } from "@/lib/personName";
import { issueCertificate } from "./actions";
import type { CertificateTarget } from "./data";

/** ما صدر فعلًا — **لقطةُ القاعدة** لا ما كُتب في النموذج، فالورقةُ تُرسَم ممّا حُفظ. */
type Issued = {
  target: CertificateTarget;
  serial: string;
  holderName: string;
  positionTitle: string;
  periodFrom: string;
  periodTo: string;
};

/** اليومُ بتوقيت الرياض — تاريخُ الإصدار كما تحسبه القاعدة، يُعرَض قبل الإصدار. */
const todayInRiyadh = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

/**
 * نافذة إصدار شهادة الخبرة — حالتان: **مراجعةُ اللقطة** ثمّ **التسليم**.
 *
 * والمراجعة مقصودة: الاسمُ والمسمّى يُقترحان من القاعدة ويُصحَّحان بالعين قبل أن يُرسَما،
 * لأنّ الورقة تُقدَّم لجهةٍ خارج النادي فلا تُصحَّح بعد خروجها. **والفترة لا تُحرَّر**:
 * من تاريخ الانضمام إلى تاريخ الإصدار (قرار المالك)، والقاعدة هي التي تكتبها.
 */
export function IssueCertificateModal({
  open,
  targets,
  preselect,
  onClose,
}: {
  open: boolean;
  targets: CertificateTarget[];
  /** عضوٌ جاء الأمرُ من كرته — يُثبَّت فلا يُختار غيره. */
  preselect?: string | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [userId, setUserId] = useState(preselect ?? "");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [issued, setIssued] = useState<Issued | null>(null);
  const [busy, setBusy] = useState(false);

  const target = targets.find((t) => t.id === userId) ?? null;
  const today = todayInRiyadh();

  // تبديلُ العضو يجلب اقتراحَه: اسمُه المقترَح ومسمّاه كما تقولهما القاعدة.
  // **يُضبَط في الرسم لا في أثر**: الأثرُ كان يرسم النافذةَ رسمةً باسم العضو السابق ثمّ
  // يستبدله في رسمةٍ ثانية، وهذه ورقةٌ تُراجَع بالعين فلا يليق بها وميضُ اسمٍ ليس صاحبَها.
  const [lastId, setLastId] = useState(userId);
  if (lastId !== userId) {
    setLastId(userId);
    setName(target?.suggestedName ?? "");
    setPosition(target?.positionTitle ?? "");
  }

  const nameError = arabicNameError(name);
  const ready = !!target && !!target.joinedDate && name.trim().length >= 3 && !nameError && position.trim().length >= 2;

  const close = () => {
    setUserId(preselect ?? "");
    setName("");
    setPosition("");
    setIssued(null);
    onClose();
  };

  const submit = () => {
    if (!target) return;
    start(async () => {
      const res = await issueCertificate({ userId: target.id, name, position });
      if (!res.ok || !res.issued) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setIssued({
        target,
        serial: res.issued.serial,
        holderName: res.issued.holderName,
        positionTitle: res.issued.positionTitle,
        periodFrom: res.issued.periodFrom,
        periodTo: res.issued.periodTo,
      });
    });
  };

  const onDownload = async (i: Issued, as: "png" | "pdf") => {
    setBusy(true);
    try {
      const paper = {
        name: i.holderName,
        position: i.positionTitle,
        gender: i.target.gender,
        from: i.periodFrom,
        to: i.periodTo,
        serial: i.serial,
      };
      await (as === "pdf" ? downloadCertificatePdf(paper) : downloadCertificate(paper));
      toast.success("نُزّلت الشهادة.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد الشهادة.");
    } finally {
      setBusy(false);
    }
  };

  const memberOptions: SelectOption[] = targets.map((t) => ({
    value: t.id,
    label: t.name,
    hint: t.positionTitle ?? undefined,
    group: t.ended ? "أعضاء سابقون" : "أعضاء أديب",
    icon: <Avatar name={t.name} src={t.avatar ?? undefined} gender={t.gender} size="xs" />,
  }));

  // ── التسليم ──────────────────────────────────────────────────────────────
  if (issued) {
    return (
      <Modal
        open={open}
        onClose={close}
        size="md"
        title={`صدرت الشهادة: ${issued.holderName}`}
        description={`رقمها المرجعيّ ${issued.serial}. نزّلها وسلّمها صاحبَها.`}
        footer={
          <>
            {/* PDF أوّلًا: هي صيغةُ ما يُرفَق بسيرةٍ ذاتيّة ويُرسَل لجهة عمل */}
            <Button variant="primary" size="md" loading={busy} onClick={() => onDownload(issued, "pdf")}>
              <FilePdf aria-hidden /> تنزيل PDF
            </Button>
            <Button variant="ghost" size="md" loading={busy} onClick={() => onDownload(issued, "png")}>
              <DownloadSimple aria-hidden /> صورة
            </Button>
            <Button variant="ghost" size="md" onClick={close}>إغلاق</Button>
          </>
        }
      >
        <Alert tone="success" title="مسجَّلةٌ في السجلّ">
          {issued.positionTitle}، من {certDate(issued.periodFrom)} إلى {certDate(issued.periodTo)}.
          وصاحبُها يراها في «عضويتي» ويعيد تنزيلها متى شاء.
        </Alert>
      </Modal>
    );
  }

  // ── مراجعة اللقطة ────────────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      busy={pending}
      title="إصدار شهادة خبرة"
      description="راجِع ما سيُرسَم على الورقة، فهي تُقدَّم لجهةٍ خارج النادي ولا تُصحَّح بعد خروجها."
      footer={
        <>
          <Button variant="primary" size="md" loading={pending} disabled={!ready} onClick={submit}>
            <SealCheck aria-hidden /> إصدار الشهادة
          </Button>
          <Button variant="ghost" size="md" onClick={close} disabled={pending}>إلغاء</Button>
        </>
      }
    >
      <Select
        label="العضو"
        icon={<UserCircle />}
        options={memberOptions}
        value={userId}
        onValueChange={setUserId}
        searchable
        required
        disabled={!!preselect}
      />

      {target && !target.joinedDate ? (
        <Alert tone="danger" title="لا تاريخَ انضمامٍ مسجَّل">
          الشهادة تبدأ من يوم الانضمام. سجّله في بيانات العضو أوّلًا.
        </Alert>
      ) : null}

      {target?.issuedCount ? (
        <Alert tone="warning" title="له شهادةٌ سابقة">
          صدرت لهذا العضو {target.issuedCount === 1 ? "شهادةٌ واحدة" : `${target.issuedCount} شهادات`} من قبل.
          والإصدارُ الجديد لا يُبطل ما سبق، أبطِله بيدك إن أردت.
        </Alert>
      ) : null}

      <Field
        label="الاسم كما يُرسَم"
        icon={<IdentificationCard />}
        innerIcon={<UserCircle />}
        placeholder="الاسم الثلاثيّ"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError ?? undefined}
        required
        helper="الثلاثيّ إن وُجد، وهو ما يُطبع في الورقة ويُحفظ في السجلّ."
      />

      <Field
        label="المسمّى كاملًا"
        icon={<Certificate />}
        innerIcon={<NotePencil />}
        placeholder="عضو لجنة السفراء والتصوير"
        value={position}
        onChange={(e) => setPosition(e.target.value)}
        required
        helper="يُكتب في: «تشهد عائلة أديب بخبرة وكفاءة …»، بلا تأنيثٍ للرتبة، كما في ورقة النادي."
      />

      {target?.joinedDate ? (
        <Alert tone="info" title="الفترة">
          من {certDate(target.joinedDate)} إلى {certDate(today)}، من يوم الانضمام إلى يوم الإصدار،
          تكتبها القاعدة ولا تُحرَّر هنا.
        </Alert>
      ) : null}
    </Modal>
  );
}
