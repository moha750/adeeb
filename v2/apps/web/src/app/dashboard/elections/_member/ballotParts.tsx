"use client";

import { useState, type ReactNode } from "react";
import { Alert, Badge, Button, Card, CardBody, FileButton, Modal, Textarea } from "@adeeb/design-system";
import { CaretDown, CaretUp, Check } from "@/app/_components/glyphs";
import { Clock, FileArrowDown, FileDashed, LockKey, Megaphone, Paperclip, Quotes } from "@phosphor-icons/react";
import { fileMeta } from "@/lib/upload";
import type { BallotCandidate, VoteItem } from "../member-data";
import { useElectionApi } from "../actions-context";
import { Countdown } from "./Countdown";

/**
 * قطعُ بطاقة الاقتراع — يقاسمها بابُ التصويت وصفحتُه (`BallotStations`).
 *
 * وأحكامُها الأربعة مكتوبةٌ عند `.blt-*` في `components.css`: الرقمُ هويّة، ولا لونَ يفرّق
 * مرشّحًا عن آخر، والبيانُ متنٌ يُقرأ، والكرتُ كلُّه هدفُ اللمس.
 *
 * (أُقِرّت من معاينةٍ عرضت ثلاثةَ اتّجاهاتٍ جنبًا إلى جنب، ثمّ حُذفت المعاينةُ وأخواتُها
 * بعد الاختيار — سابقةُ كرت المرشّح وكرت الانتخاب.)
 */

/** فاتحُ الملفّ — الحقيقيُّ افتراضًا، ويُنافَذ في الاختبار (سابقةُ `loader` في البطاقة). */
export type FileOpener = (path: string) => Promise<boolean>;

/* ══ رأسُ الاقتراع ═══════════════════════════════════════════════════ */

/**
 * المنصبُ ومتى يُغلق البابُ ومَن يرى صوتَك : ثلاثةُ أسئلةٍ تسبق كلَّ قراءة.
 *
 * **وشارةُ السرّيّة لمن له صوت** (قرار المالك ٢٠٢٦-٠٨-١٥): مرشّحُ المقعد الوحيد يطّلع ولا
 * يُدلي، فوعدُ «صوتك سرّيّ» عنده كلامٌ في شيءٍ لا وجودَ له. والرأسُ يعرف حالَ المقعد من
 * `election` نفسِه، فلا يُترَك لكلّ داعٍ أن يتذكّر إخفاءها.
 */
export function BallotHead({ election, extra }: { election: VoteItem; extra?: ReactNode }) {
  return (
    <div className="blt-head">
      {/* الشارةُ **تقابل العنوانَ في سطره** (قرار المالك): المقعدُ وسرّيّةُ الصوت خبران من
          رتبةٍ واحدة، فيقعان في سطرٍ واحدٍ طرفاه، ولا يعلو أحدُهما الآخر. */}
      <div className="blt-head-row blt-head-top">
        <h2 className="blt-pos">{election.position}</h2>
        {election.viewOnly ? null : <Badge tone="neutral" variant="soft"><LockKey size={13} />صوتك سرّيّ</Badge>}
        {extra}
      </div>
      <div className="blt-head-row">
        <span className="blt-when"><Clock aria-hidden />يغلق {election.votingEnd}</span>
        {election.votingEndRaw ? <Countdown iso={election.votingEndRaw} /> : null}
      </div>
    </div>
  );
}

/* ══ هويّةُ المرشّح ══════════════════════════════════════════════════ */

/**
 * رقمُ المرشّح مرساةً بصريّة تقوم مقام الاسم والصورة المحجوبين.
 *
 * وعلامةُ «#» تسبقه كما في شارة كرت المرشّح المُقَرّة : تقول «ترتيب» بحرفٍ واحد، فلا يُقرأ
 * الرقمُ عددًا مجهولَ المعنى.
 */
export function CandidateMark({ number, lg }: { number: number; lg?: boolean }) {
  return <span className={lg ? "blt-id blt-id-lg" : "blt-id"} aria-hidden>#{number}</span>;
}

/* ══ البيان ═════════════════════════════════════════════════════════ */

/**
 * البيانُ متنًا: مقاسُ القراءة وأسطرُ كاتبه، مطويًّا ثلاثةَ أسطرٍ حتّى يُفتح. والطيُّ يسقط
 * حين يقصر البيانُ عنه، فلا يُعرَض زرٌّ لا يفعل شيئًا.
 */
export function Statement({ text, defaultOpen, open, onToggle }: {
  text: string;
  /** يبدأ مبسوطًا (حيث المرشّحُ وحدَه في الشاشة) ويبقى الطيُّ بيد القارئ. */
  defaultOpen?: boolean;
  /** تحكّمٌ خارجيّ — لا يصحّ إلّا مع `onToggle`، وإلّا صار زرُّ الطيّ زرًّا لا يفعل شيئًا. */
  open?: boolean;
  onToggle?: () => void;
}) {
  const [self, setSelf] = useState(!!defaultOpen);
  const held = open !== undefined && onToggle !== undefined;
  const shown = held ? open : self;
  const toggle = held ? onToggle : () => setSelf((v) => !v);
  const foldable = text.length > 180;
  return (
    <>
      <p className={shown || !foldable ? "blt-stmt" : "blt-stmt blt-stmt-clamp"}>{text}</p>
      {foldable ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={toggle}>
          {shown ? <><CaretUp size={15} />اطوِ البيان</> : <><CaretDown size={15} />اقرأ البيان كاملًا</>}
        </Button>
      ) : null}
    </>
  );
}

/* ══ الملفّ الانتخابيّ ══════════════════════════════════════════════ */

/**
 * ملفُّ المرشّح : **يُوصَف ولا يُسمّى**. اسمُ الملفّ قد يحمل اسمَ صاحبه («سيرة محمّد.pdf»)
 * فيكسر تعميةَ الاقتراع، فالمعروضُ نوعُه وحجمُه. والغيابُ يُقال ولا يُسكت عنه.
 */
export function CandidateFile({ candidate, opener, onFail }: {
  candidate: BallotCandidate;
  opener?: FileOpener;
  onFail?: () => void;
}) {
  // الفاتحُ من منفذ الانتخابات (الحقيقيُّ في الإنتاج، والمُنافَذ في المحاكي)، و`opener` يغلبه صراحةً
  const api = useElectionApi();
  const open = opener ?? api.openFile;
  if (!candidate.fileUrl) {
    return <FileButton state="empty" icon={<FileDashed />} label="لا ملف انتخابي مرفَق" hint="اكتفى المرشّح ببيانه" />;
  }
  return (
    <FileButton
      state="ready"
      icon={<Paperclip />}
      label="الملف الانتخابي"
      hint={fileMeta(candidate.fileMime, candidate.fileSize)}
      trailing={<FileArrowDown />}
      onClick={async () => { if (!(await open(candidate.fileUrl!))) onFail?.(); }}
    />
  );
}

/* ══ نافذةُ المرشّح ═════════════════════════════════════════════════ */

/**
 * نافذةٌ تحمل مرشّحًا واحدًا كاملًا : بيانَه كما كتبه وملفَّه، وفعلًا في ذيلها يقرّره المستدعي.
 * تُطلَب **لحظةَ الحكم** فلا يُقطَع عن الناخب ما يحكم به، ولا يُنقَل إلى شاشةٍ أخرى ثمّ يُعاد.
 */
type SurfaceProps = {
  candidate: BallotCandidate | null;
  onClose: () => void;
  opener?: FileOpener;
  onFail?: () => void;
  /** فعلُ الذيل — يختلف بالشاشة: اختيارٌ حيث يُختار، وإغلاقٌ حيث يُقرأ وحسب. */
  action?: ReactNode;
};

/**
 * متنُ المرشّح — بيانُه كما كتبه ثمّ ملفُّه. مصدرٌ واحدٌ يقاسمه السطحان فلا يفترق ما فيهما.
 *
 * **والبيانُ حقلٌ يُقرأ ولا يُكتَب** (قرار المالك، وهي هيئةُ نافذة المراجع نفسِها): `readOnly`
 * لا `disabled` — فيبقى للحقل هيئتُه كاملةً وأسطرُ الكاتب كما كتبها ونصٌّ يُنسَخ، بلا ثوبِ
 * «غير متاح» الرماديّ (ق٧). وطولُه ثمانيةُ أسطرٍ ثمّ يُمرَّر في نفسه، فلا يمطّ النافذة.
 */
function CandidateBody({ candidate, opener, onFail }: { candidate: BallotCandidate; opener?: FileOpener; onFail?: () => void }) {
  return (
    <>
      {/* `key` يعيد تركيبَ الحقل لكلّ مرشّح، فلا يرث تمريرَ من قبله. */}
      <Textarea
        key={candidate.id}
        label="بيان الترشّح"
        icon={<Megaphone />}
        innerIcon={<Quotes />}
        placeholder="لا بيان"
        value={candidate.statement}
        rows={8}
        readOnly
      />
      <CandidateFile candidate={candidate} opener={opener} onFail={onFail} />
    </>
  );
}

/** نافذةُ المرشّح — سطحُ المراجعة المعتمَد (قرار المالك): تُطلَب لحظةَ الحكم فتحمل بيانَه وملفَّه. */
export function CandidateModal({ candidate, onClose, opener, onFail, action }: SurfaceProps) {
  return (
    <Modal
      open={candidate !== null}
      onClose={onClose}
      title={candidate ? `المرشّح رقم ${candidate.number}` : "المرشّح"}
      description="بيانُه كما كتبه"
      size="md"
      footer={action}
    >
      {candidate ? <CandidateBody candidate={candidate} opener={opener} onFail={onFail} /> : null}
    </Modal>
  );
}


/* ══ التزكية ════════════════════════════════════════════════════════ */

/**
 * خبرُ التزكية — **يقول القاعدةَ ولا يَعُدّ المتقدّمين** (قرار المالك):
 * «تقدّم له مرشّحٌ واحد» جملةٌ صادقةٌ ترسم في الذهن ما ليس فيها — أنّ المقعد لم يجد راغبًا،
 * أو لم يجد كفؤًا إلّا واحدًا. والحقيقةُ أنّ الناخب يرى المرشّحين أمامه فلا يُخبَّأ عنه شيء،
 * وإنّما لا يُصدَّر له العددُ عنوانًا. فالعنوانُ سلطتُه هو، والمتنُ حكمُ اللائحة.
 *
 * ومصدرُه واحدٌ ههنا لا في كلّ شاشةٍ تعرضه.
 */
export function ConfidenceNote() {
  return (
    <Alert tone="info" title="رأيُك يحسم هذا المقعد">
      تُمنح الثقةُ بالتصويت : إن غلب التأييدُ الاعتراضَ تولّى المرشّح المنصب، وإلّا أُعيد فتحُ الباب.
    </Alert>
  );
}

/**
 * مرشّحٌ وحيدٌ معتمَد : السؤالُ يصير رأيًا فيه لا اختيارًا بينه وبين غيره. وخيارُ الاعتراض
 * يُعرَض بوزن خيار التأييد نفسِه، فالتزكيةُ سؤالٌ لا استمارةُ موافقة.
 */
export function SoleChoice({ value, onChange }: { value: string; onChange: (v: "approve" | "reject") => void }) {
  const opt = (v: "approve" | "reject", label: string, hint: string) => (
    <button type="button" className="blt-pick" onClick={() => onChange(v)} aria-pressed={value === v}>
      {/* علامةُ الاختيار تلبس نغمةَ ما اختير : خضراءُ على الاعتراض تقول ضدَّ ما يفعله الناخب. */}
      <Card
        tone={value === v ? (v === "approve" ? "success" : "danger") : undefined}
        className={value === v ? (v === "reject" ? "blt-on blt-mark-danger" : "blt-on") : undefined}
      >
        <CardBody>
          <div className="blt-row">
            <div className="blt-rowtx">
              <span className="blt-name">{label}</span>
              <span className="blt-hint">{hint}</span>
            </div>
            <span className="blt-check"><Check size={15} /></span>
          </div>
        </CardBody>
      </Card>
    </button>
  );
  return (
    <>
      {opt("approve", "أؤيّد توليَه المنصب", "أرى فيه أهلًا لهذا المقعد")}
      {opt("reject", "أعترض", "لا أرى توليَه هذا المقعد")}
    </>
  );
}

/* ══ ورقةُ الناخب نفسِه ═════════════════════════════════════════════ */

/**
 * اسمُ المرشّح في الورقة — **مصدرٌ واحدٌ** لمحطّات البطاقة وغرفة الاطّلاع.
 *
 * والرقمُ هو الهويّة. وورقةُ الناخب **تُسمّى في السطر نفسِه** لا بشارةٍ على حافته (قرار
 * المالك ٢٠٢٦-٠٨-١٥): «المرشّح رقم ٤ (ترشّحك)» خبرٌ واحدٌ يُقرأ جملةً.
 *
 * **ولا تُلبَس ثوبَ «غير متاح» الرماديّ** (ق٧): الورقةُ ليست معطوبةً ولا ناقصة، وإنّما
 * اللائحةُ صرفت يدَ صاحبها عنها. فتبقى بهيئة أخواتها كاملةً، ويُنزع عنها ما يُختار به وحدَه.
 */
export function CandidateName({ number, self = false }: { number: number; self?: boolean }) {
  return (
    <span className="blt-name">
      المرشّح رقم {number}
      {self ? <span className="blt-self"> (ترشّحك)</span> : null}
    </span>
  );
}

/**
 * وسمُ ما وقع عليه صوتُك، يُعرَض **بعد الختم** في غرفة الاطّلاع.
 *
 * والسرّيّةُ لا تُنقَض به : هي حجبُ صوتك عن غيرك لا عنك، وسياسةُ القاعدة تأذن لصاحب الصوت
 * وحدَه بقراءته. ومن ختم بطاقةً لا رجعةَ فيها له أن يرى أين وقعت.
 */
export function VoteTag({ choice }: { choice: "approve" | "reject" }) {
  return choice === "reject"
    ? <Badge tone="danger" variant="soft" className="ms-auto">اعتراضك</Badge>
    : <Badge tone="success" variant="soft" className="ms-auto">صوتك</Badge>;
}

/**
 * خبرُ المرشّح في بطاقةٍ فيها غيرُه : يُقال **قبل** أن يمدّ يدَه لا بعد ضغطه. وفيه مخرجُه
 * أيضًا، فمن مُنع أن يزكّي نفسَه ولم يرَ في الباقين مَن يزكّيه لا يُترك بين خصمٍ وصمت.
 */
export function SelfCandidateNote() {
  return (
    <Alert tone="info" title="أنت مرشّحٌ لهذا المنصب">
      نظامُ الانتخابات لا يُجيز التصويتَ للنفس. فاختر مرشّحًا آخر، أو تستطيع عدم التصويت.
    </Alert>
  );
}

/* ══ الختم ══════════════════════════════════════════════════════════ */

/**
 * محطّةُ الختم — الصوتُ لا رجعةَ فيه، فيُستعاد ما اختاره الناخبُ قبل إمضائه. والزرُّ يقول
 * «أختم» لا «أرسل» : الإرسالُ فعلٌ يُعاد، والختمُ يقع مرّةً.
 */
export function ConfirmVote({ open, onClose, onConfirm, pending, number, choice }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
  /** رقمُ المرشّح المختار، أو `null` في التزكية (رأيٌ في واحدٍ لا اختيارٌ بين اثنين). */
  number: number | null;
  /** رأيُ التزكية حين لا مرشّحَ يُختار. */
  choice?: "approve" | "reject" | null;
}) {
  const reject = choice === "reject";
  const tone = reject ? "danger" : "success";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={number !== null ? "اختم صوتك" : "اختم رأيك"}
      description="لا يمكن تغييره بعد ختمه"
      size="sm"
      busy={pending}
      className={`mdl-tone-${tone}`}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={pending}>رجوع</Button>
          <Button variant={tone} size="md" loading={pending} onClick={onConfirm}>
            <Check size={16} />{number !== null ? "أختم صوتي" : "أختم رأيي"}
          </Button>
        </>
      }
    >
      <div className="blt-row">
        {number !== null ? <CandidateMark number={number} lg /> : null}
        <span className="blt-name">
          {number !== null ? `صوتك للمرشّح رقم ${number}` : reject ? "اعتراضك على التزكية" : "تأييدك للمرشّح"}
        </span>
      </div>
      {/* **الوعدُ بقدر ما يقع** (٢٠٢٦-٠٨-١٥): صار لإدارة الانتخابات أن تقرأ الأصوات بأسماء
          أصحابها بقرار المالك، فلا يصحّ أن تقول الشاشةُ «لا أحد يطلع عليه». تُقال الحقيقةُ
          للناخب قبل أن يختم، لا يعلمها من غيرنا بعد. */}
      <Alert tone={tone} title="صوتٌ واحدٌ لا يُعاد">
        يُحفظ صوتُك سرًّا عن الأعضاء، ولا يطّلع عليه إلّا إدارةُ الانتخابات. ولا يمكن تغييرُه ولا سحبُه بعد ختمه.
      </Alert>
    </Modal>
  );
}
