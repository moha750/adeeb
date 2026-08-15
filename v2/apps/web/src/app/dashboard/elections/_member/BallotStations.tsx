"use client";

import { Fragment, useState } from "react";
import { Button, Card, CardBody } from "@adeeb/design-system";
import { ArrowLeft, ArrowRight, Check, Eye } from "@/app/_components/glyphs";
import { BallotHead, ConfidenceNote, CandidateFile, CandidateMark, CandidateModal, ConfirmVote, SelfCandidateNote, SelfTag, SoleChoice, Statement, type FileOpener } from "./ballotParts";
import type { BallotCandidate, VoteItem } from "../member-data";

/**
 * **اتّجاهُ المحطّات** — صفحةٌ لا نافذة، تفصل القراءة عن القرار:
 * *اطّلع* حيث البيانُ مبسوطٌ والملفُّ مفتوحٌ لكلّ مرشّحٍ بالحجم نفسِه، ثمّ *اختر* حيث تصير
 * الكروتُ أهدافَ لمسٍ خالصة، ثمّ *اختم* نافذةً تُعيد ما اخترتَه قبل أن يُمضى.
 *
 * **وعلّةُ الفصل حكمان لا ترتيبُ شاشات**:
 * • **لا اختيارَ يقع أثناء القراءة** — فلمسةٌ خاطئةٌ في محطّة الاطّلاع لا تكلّف صوتًا، والصوتُ
 *   لا رجعةَ فيه.
 * • **والمرشّحون سواءٌ في العرض** — قائمةٌ بمقتطَفٍ سطرين تُكافئ مَن أحسن جملتَه الأولى وتخذل
 *   مَن بدأ بمقدّمة، وهو انحيازٌ من جنس ما عُمّيت الأسماءُ لمنعه.
 *
 * **ولا يُقطَع عنك ما تحكم به لحظةَ الحكم**: في محطّة الاختيار يبقى تحت كلّ كرتٍ زرُّ مراجعةٍ
 * يفتح نافذةَ المرشّح (بيانُه كاملًا وملفُّه) ويُختار منها، فلا رجوعَ إلى الوراء ولا فقدُ سياق.
 *
 * **وسطحُ الكرت كلُّه هو الاختيار** لا سطرُ نصّه: رقعةٌ ممدودةٌ عليه، ويعلوها وحدَه زرُّ المراجعة.
 *
 * **والتزكيةُ شاشةٌ واحدة**: حيث لا اختيارَ بين اثنين لا محطّةَ اطّلاعٍ تسبق الاختيار — يُبسط
 * المرشّحُ الوحيد ورأيُك تحته.
 */
const STEPS = ["اطّلع", "اختر", "اختم"];

function Steps({ at }: { at: number }) {
  return (
    <div className="blt-steps">
      {STEPS.map((s, i) => (
        <Fragment key={s}>
          {i > 0 ? <span className={i <= at ? "blt-step-bar is-done" : "blt-step-bar"} /> : null}
          <span className={i === at ? "blt-step is-cur" : i < at ? "blt-step is-done" : "blt-step"}>
            <span className="blt-step-n">{i < at ? <Check size={12} /> : i + 1}</span>
            {s}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export function BallotStations({ election, candidates, pending, onCast, opener, onFileFail }: {
  election: VoteItem;
  candidates: BallotCandidate[];
  pending?: boolean;
  onCast: (candidateId: string, choice?: "approve" | "reject") => void;
  opener?: FileOpener;
  onFileFail?: () => void;
}) {
  const [at, setAt] = useState(0);
  const [pick, setPick] = useState("");
  const [review, setReview] = useState<BallotCandidate | null>(null);
  const [sealing, setSealing] = useState(false);

  // تزكية: مرشّحٌ وحيدٌ معتمَد، فالرأيُ فيه لا اختيارٌ بينه وبين غيره.
  const sole = candidates.length === 1 ? candidates[0] : null;
  /** ورقةُ الناخب نفسِه إن كان مرشّحًا ههنا : تُعلَّم ولا تُختار (والوحيدُ لا يصل إلى بطاقته أصلًا). */
  const mine = candidates.find((c) => c.isSelf) ?? null;
  const chosen = sole ? null : candidates.find((c) => c.id === pick) ?? null;
  const ready = sole ? pick === "approve" || pick === "reject" : !!chosen;

  const seal = () => {
    setSealing(false);
    if (sole) onCast(sole.id, pick as "approve" | "reject");
    else if (chosen) onCast(chosen.id);
  };

  const confirm = (
    <ConfirmVote
      open={sealing}
      onClose={() => setSealing(false)}
      onConfirm={seal}
      pending={pending}
      number={chosen ? chosen.number : null}
      choice={sole ? (pick as "approve" | "reject") : null}
    />
  );

  /* ── التزكية: شاشةٌ واحدةٌ ثمّ ختم ───────────────────────────────── */
  if (sole) {
    /* **ولا يبلغها مرشّحُها**: المرشّحُ الوحيد ليس ناخبًا في مقعده (قرار المالك ٢٠٢٦-٠٨-١٥)،
       والقاعدةُ تُسقطه من أهليّة الصوت فلا يصل هذا الفرعُ إليه أصلًا. فلا شاشةَ ثانيةً تُبنى
       له ههنا، ولا سؤالَ يُوجَّه إلى أحدٍ عن نفسه. */
    return (
      <div className="blt">
        <BallotHead election={election} />
        <ConfidenceNote />
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="blt-row">
              <CandidateMark number={sole.number} />
              <span className="blt-name">المرشّح رقم {sole.number}</span>
            </div>
            <Statement text={sole.statement} defaultOpen />
            <CandidateFile candidate={sole} opener={opener} onFail={onFileFail} />
          </CardBody>
        </Card>
        <SoleChoice value={pick} onChange={setPick} />
        <div className="blt-bar">
          <Button variant="primary" size="md" disabled={!ready} onClick={() => setSealing(true)}>
            أكّد صوتي
          </Button>
        </div>
        {confirm}
      </div>
    );
  }

  /* ── التنافس: اطّلع ثمّ اختر ثمّ اختم ────────────────────────────── */
  return (
    <div className="blt">
      <BallotHead election={election} />
      <Steps at={sealing ? 2 : at} />
      {mine ? <SelfCandidateNote /> : null}

      {at === 0 ? (
        <>
          {candidates.map((c) => (
            <Card key={c.id}>
              <CardBody className="flex flex-col gap-3">
                <div className="blt-row">
                  <CandidateMark number={c.number} />
                  <span className="blt-name">المرشّح رقم {c.number}</span>
                  {c.isSelf ? <SelfTag /> : null}
                </div>
                <Statement text={c.statement} />
                <CandidateFile candidate={c} opener={opener} onFail={onFileFail} />
              </CardBody>
            </Card>
          ))}
          <div className="blt-bar">
            <Button variant="primary" size="md" onClick={() => setAt(1)}>
              قرأتُ، انتقل للاختيار<ArrowLeft size={16} />
            </Button>
          </div>
        </>
      ) : (
        <>
          {candidates.map((c) => c.isSelf ? (
            /* **ورقتُك لا تُختار** : تبقى في موضعها من الترتيب بهيئة أخواتها، وتُنزع عنها
               رقعةُ الضغط وعلامةُ الاختيار وحدَهما، ويحلّ الوسمُ محلَّ العلامة. */
            <Card key={c.id}>
              <CardBody className="flex flex-col gap-2">
                <div className="blt-row">
                  <CandidateMark number={c.number} />
                  <div className="blt-rowtx">
                    <span className="blt-name">المرشّح رقم {c.number}</span>
                    <span className="ccard-stmt">{c.statement}</span>
                  </div>
                  <SelfTag />
                </div>
                <Button variant="ghost" size="sm" className="self-start" onClick={() => setReview(c)}>
                  <Eye size={15} />راجع بيانك وملفَّك
                </Button>
              </CardBody>
            </Card>
          ) : (
            <Card
              key={c.id}
              tone={pick === c.id ? "success" : undefined}
              className={pick === c.id ? "blt-hitcard blt-on" : "blt-hitcard"}
            >
              {/* **الكرتُ كلُّه يُختار به** : رقعةٌ ممدودةٌ على سطحه لا سطرُ نصّه (قرار المالك).
                  وزرُّ المراجعة يعلوها بطبقةٍ لأنّ فعله فعلٌ آخر. */}
              <CardBody className="flex flex-col gap-2">
                <button type="button" className="blt-hit" onClick={() => setPick(c.id)} aria-pressed={pick === c.id}>
                  <span className="sr-only">اختر المرشّح رقم {c.number}</span>
                </button>
                <div className="blt-row">
                  <CandidateMark number={c.number} />
                  <div className="blt-rowtx">
                    <span className="blt-name">المرشّح رقم {c.number}</span>
                    {/* مقتطَفُ البيان بمقتطَف كرت المرشّح المُقَرّ نفسِه (سطران) : هنا يُختار لا يُقرأ. */}
                    <span className="ccard-stmt">{c.statement}</span>
                  </div>
                  <span className="blt-check"><Check size={15} /></span>
                </div>
                <Button variant="ghost" size="sm" className="blt-above self-start" onClick={() => setReview(c)}>
                  <Eye size={15} />راجع بيانه وملفَّه
                </Button>
              </CardBody>
            </Card>
          ))}
          <div className="blt-bar">
            <Button variant="ghost" size="md" onClick={() => setAt(0)}><ArrowRight size={16} />عودةٌ للقراءة</Button>
            <Button variant="primary" size="md" disabled={!ready} onClick={() => setSealing(true)}>أكّد صوتي</Button>
          </div>
        </>
      )}

      {/* نافذةُ المراجعة — تُطلَب لحظةَ الحكم، ويُختار منها فلا تُغلق ليُعاد الاختيار في القائمة */}
      <CandidateModal
        candidate={review}
        onClose={() => setReview(null)}
        opener={opener}
        onFail={onFileFail}
        action={
          /* ورقتُك تُراجَع ولا تُختار، فذيلُها إغلاقٌ لا زرُّ اختيارٍ يُضغط ثمّ يُردّ. */
          review?.isSelf ? (
            <Button variant="ghost" size="md" onClick={() => setReview(null)}>إغلاق</Button>
          ) : (
            <Button
              variant={review && pick === review.id ? "success" : "primary"}
              size="md"
              onClick={() => { if (review) setPick(review.id); setReview(null); }}
            >
              <Check size={16} />{review && pick === review.id ? "هذا اختياري" : "أختار هذا المرشّح"}
            </Button>
          )
        }
      />

      {confirm}
    </div>
  );
}
