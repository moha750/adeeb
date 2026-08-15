"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@adeeb/design-system";
import { CheckCircle } from "@/app/_components/glyphs";
import { Breadcrumb } from "../../../_shell/Breadcrumb";
import { useToast } from "../../../_components/ToastProvider";
import { BallotHead, CandidateFile, CandidateMark, SelfTag, Statement, VoteTag } from "../../_member/ballotParts";
import { BallotStations } from "../../_member/BallotStations";
import { castVote } from "../../actions";
import type { BallotCandidate, MyVote, VoteItem } from "../../member-data";
import { Card, CardBody } from "@adeeb/design-system";

/**
 * غرفةُ الاقتراع — الوجهُ العميليُّ لصفحة `‎/vote/[electionId]`: تربط محطّات البطاقة بفعل
 * القاعدة، وتعيد الناخبَ إلى بابه بعد ختم صوته.
 *
 * **ومن صوّت لا يُطرَد من الغرفة**: يبقى له أن يقرأ بيانات المرشّحين وملفّاتهم حتّى يُغلق
 * الباب، ويسقط عنه الاختيارُ وحدَه. فالتصويتُ لا يُلغي حقَّ الاطّلاع.
 *
 * **وصوتُه يبقى مرئيًّا له**: الورقةُ التي وقع عليها صوتُه تلبس خضرتَها وتُوسَم «صوتك»،
 * كما كانت لحظةَ الاختيار. والسرّيّةُ حجبُه عن غيره لا عنه.
 */
export function BallotRoom({ election, candidates, myVote }: { election: VoteItem; candidates: BallotCandidate[]; myVote: MyVote | null }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const abstained = myVote?.choice === "abstain";
  const rejected = myVote?.choice === "reject";
  /* **العنوانُ يسمّي مَن أدليتَ له** (قرار المالك ٢٠٢٦-٠٨-١٥): «صوّتّ في هذا المقعد» تقول
     الواقعةَ وتُخفي محلَّها، والمقعدُ مكتوبٌ في الرأس فوقها. فيُقال الرقمُ في العنوان نفسِه،
     ويسقط إلى الجملة العامّة إن لم يكن للصوت مرشّحٌ في القائمة (اعتراضٌ أو امتناع). */
  const votedNumber = myVote?.candidateId ? candidates.find((c) => c.id === myVote.candidateId)?.number ?? null : null;

  // والمرشّحُ `null` في الامتناع : بطاقةٌ تُختم بلا مرشّح.
  const cast = (candidateId: string | null, choice?: "approve" | "reject" | "abstain") => {
    start(async () => {
      const r = await castVote(election.electionId, candidateId, choice);
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      router.push("/dashboard/elections/vote");
      router.refresh();
    });
  };

  return (
    <>
      <div className="ash-phead"><div><Breadcrumb leaf={election.position} /><h1>صوّت الآن</h1></div></div>

      {election.hasVoted ? (
        <div className="blt">
          <BallotHead election={election} />
          {abstained ? (
            <Alert tone="warning" title="امتنعت في هذا المقعد">
              لم يذهب صوتُك لأحد، ويُسجَّل أنّك شاركت. ويبقى لك أن تقرأ ما كتبه المرشّحون حتّى يُغلق الباب.
            </Alert>
          ) : (
            <Alert tone="success" title={rejected ? "اعترضت على التزكية" : votedNumber !== null ? `صوّتّ إلى المرشّح ${votedNumber}` : "صوّتّ في هذا المقعد"}>
              صوتُك مسجَّلٌ ولا يُغيَّر. ويبقى لك أن تقرأ ما كتبه المرشّحون حتّى يُغلق الباب.
            </Alert>
          )}
          {candidates.map((c) => {
            /* **الوسمُ وحدَه يقول أين وقع صوتُك** (قرار المالك ٢٠٢٦-٠٨-١٥): جُرّبت خضرةُ
               الاختيار على الورقة بعد الختم فرُدّت. ونغمةُ السطح لغةُ **الاختيار الجاري**،
               وقد انتهى؛ فيبقى الكرتُ كأخواته وتُقال الواقعةُ في شارةٍ لا في سطحٍ ملوّن. */
            const mine = myVote?.candidateId === c.id;
            return (
              <Card key={c.id}>
                <CardBody className="flex flex-col gap-3">
                  <div className="blt-row">
                    <CandidateMark number={c.number} />
                    <span className="blt-name">المرشّح رقم {c.number}</span>
                    {/* الوسمُ يبقى بعد الختم : من عاد يقرأ يعرف ورقتَه كما عرفها قبل صوته. */}
                    {mine ? <VoteTag choice={rejected ? "reject" : "approve"} /> : c.isSelf ? <SelfTag /> : null}
                  </div>
                  <Statement text={c.statement} />
                  <CandidateFile candidate={c} onFail={() => toast.error("تعذّر فتح الملفّ، أعِد المحاولة.")} />
                </CardBody>
              </Card>
            );
          })}
          <div className="blt-bar">
            <Button variant="ghost" size="md" onClick={() => router.push("/dashboard/elections/vote")}>
              <CheckCircle size={16} />عودةٌ إلى التصويت
            </Button>
          </div>
        </div>
      ) : (
        <BallotStations
          election={election}
          candidates={candidates}
          pending={pending}
          onCast={cast}
          onFileFail={() => toast.error("تعذّر فتح الملفّ، أعِد المحاولة.")}
        />
      )}
    </>
  );
}
