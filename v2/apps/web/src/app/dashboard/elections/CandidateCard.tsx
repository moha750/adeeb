"use client";

import { Badge, Button, Card, CardBody, CardFooter } from "@adeeb/design-system";
import { FileDashed, Gavel, Paperclip } from "@phosphor-icons/react";
import { Avatar } from "../_components/Avatar";
import type { CandidateRow } from "./data";
import { CANDIDATE_STATUS_META, DECISION_VERB, decisionLine } from "./vocab";

/**
 * كرت المرشّح — أقرّه المالك ٢٠٢٦-٠٨-١٤ في `/ui/candidate-card` (حُذفت المعاينة بعد الإقرار).
 *
 * **وجهان لطورين، لا كرتان**:
 * • **قبل التصويت** (الترشّح مفتوحًا أو مغلقًا) ورقةُ ترشّحٍ تُراجَع: بيانٌ في سطرين ورقاقةُ
 *   «الملف الانتخابي». والسؤالُ ساعتَها «ماذا كتب؟».
 * • **من فتح التصويت** لوحةُ منافسةٍ تُقاس: يسقط البيانُ كلَّه ويحلّ صفُّ الأرقام المُقَرّ
 *   (`.ecard-nums`، سابقةُ كرت الانتخاب) — والسؤالُ صار «من يتقدّم؟».
 *
 * **والوزنُ هو الحاكم لا العدد**: حارسُ `declare_winner` في القاعدة يرفض إعلانَ من ليس الأعلى
 * وزنًا، فتقول التسميةُ ذلك («الوزن الحاسم») وإلّا بدا الرقمان متساويَي الحجيّة.
 *
 * **ولا `interactive`** كما في كرت الانتخاب (قرار المالك): الدخولُ بزرٍّ صريحٍ في الذيل يفتح
 * نافذةَ المرشّح نفسَها التي يفتحها نقرُ صفّ الجدول، لا سطحٌ كاملٌ يُضغط.
 */
type Props = {
  candidate: CandidateRow;
  /** طورُ الانتخاب — يقول أيَّ وجهٍ يلبس الكرت (كحكم أعمدة الجدول نفسِه). */
  phase: "candidacy" | "voting" | "done";
  /** نغمة الكرت — من حالة المرشّح (`CANDIDATE_CARD_TONE`)، والفائز أخضرُ على كلّ حال. */
  tone?: "success" | "warning" | "danger" | "neutral";
  /** هل يملك الفاتحُ مراجعتَه الآن؟ الزرُّ يسمّي ما وراءه فلا يَعِد بفعلٍ لا يقع (المطّلِع يقرأ). */
  reviewable?: boolean;
  onOpen: () => void;
};

export function CandidateCard({ candidate: c, phase, tone, reviewable, onOpen }: Props) {
  const meta = CANDIDATE_STATUS_META[c.status];
  const tally = phase !== "candidacy";
  return (
    <Card tone={tone}>
      <CardBody>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {/* صورةُ ملفّه إن رفعها، وإلّا أيقونةُ جنسه ثمّ أحرفُه (سلّمُ `Avatar`). ورقمُ الترشيح
                شارةً على ركنها بعلامة «#»: رقمٌ يلازم صاحبَه لا عمودًا منفصلًا، والعلامةُ تقول
                «ترتيب» بحرفٍ فلا يُقرأ عددًا مجهولَ المعنى. */}
            <span className="ccard-avwrap">
              <Avatar name={c.name} src={c.avatar ?? undefined} gender={c.gender} size="lg" />
              <b className="ccard-num">#{c.number}</b>
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="ccard-name">{c.name}</h3>
              <span><Badge tone={meta.tone} variant="soft" dot>{meta.label}</Badge></span>
            </div>
          </div>

          {tally ? (
            <div className="ecard-nums">
              <div className="ecard-num">
                <span className="ecard-v">{c.votes}</span>
                <span className="ecard-l">أصوات</span>
              </div>
              <div className="ecard-num">
                <span className="ecard-v">{c.weight}</span>
                <span className="ecard-l">الوزن الحاسم</span>
              </div>
            </div>
          ) : (
            /* البيانُ سطران ثمّ «…»: الكرتُ يُغري بالقراءة ولا يحملها، وتمامُه في النافذة. */
            <p className="ccard-stmt">{c.statement}</p>
          )}

          {/* الملفُّ يُقرأ من رقاقته لا من نصٍّ عارٍ، ويُقال في الحالين (غيابُ السطر يُقرأ عطلًا،
              وتفاوتُ الكروت في الصفّ يترك خلاءً تحت الأقصر). وفي طور المنافسة يسقط مع البيان. */}
          {!tally ? (
            c.fileUrl ? (
              <span className="ccard-att">
                <span className={`tico tico-${tone ?? "steel"}`}><Paperclip aria-hidden /></span>
                <span className="ccard-att-txt"><b>الملف الانتخابي</b> {c.fileName ?? "ملفّ الترشّح"}</span>
              </span>
            ) : (
              <span className="ccard-att ccard-att-off">
                <span className="tico tico-neutral"><FileDashed aria-hidden /></span>
                <span className="ccard-att-txt">لا ملف انتخابي</span>
              </span>
            )
          ) : null}

          {/* **الحكمُ يُنسَب إلى مَن أصدره** — رقاقةُ المرفَق نفسُها لأنّ السؤال من جنسه: خبرٌ عن
              هذه الورقة يُقرأ من الكرت قبل فتحها. وقبل الحكم تُقال حالُه ولا يُسكت عنها (سطرٌ
              ساقطٌ يترك خلاءً تحت الأقصر في الصفّ). وفي طور المنافسة يسقط مع البيان: صار الكرتُ
              لوحةَ أرقامٍ، والاعتمادُ شرطُ دخولها فلا يُعاد قولُه. */}
          {!tally ? (
            c.decidedBy ? (
              <span className="ccard-att">
                <span className={`tico tico-${tone ?? "steel"}`}><Gavel aria-hidden /></span>
                <span className="ccard-att-txt"><b>{DECISION_VERB[c.status]}</b> بواسطة {c.decidedBy}</span>
              </span>
            ) : (
              <span className="ccard-att ccard-att-off">
                <span className="tico tico-neutral"><Gavel aria-hidden /></span>
                <span className="ccard-att-txt">{decisionLine(c.status, null)}</span>
              </span>
            )
          ) : null}
        </div>
      </CardBody>
      <CardFooter>
        <span className="text-sm text-content-muted">قُدّم {c.submitted}</span>
        {/* الزرُّ يتبع نغمة الكرت (ق٤: السطحُ المنغَّم لا يفقد نغمتَه). */}
        <Button variant={tone ?? "primary"} size="sm" className="shrink-0" onClick={onOpen}>
          {reviewable ? "مراجعة الترشّح" : "فتح المرشّح"}
        </Button>
      </CardFooter>
    </Card>
  );
}
