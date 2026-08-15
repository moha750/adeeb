"use client";

import { useTransition } from "react";
import { Alert, Button } from "@adeeb/design-system";
import { CheckCircle } from "@/app/_components/glyphs";
import { Breadcrumb } from "../../../_shell/Breadcrumb";
import { useToast } from "../../../_components/ToastProvider";
import { BallotHead, CandidateFile, CandidateMark, CandidateName, Statement, VoteTag } from "../../_member/ballotParts";
import { BallotStations } from "../../_member/BallotStations";
import { useElectionApi } from "../../actions-context";
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
  const api = useElectionApi();
  const [pending, start] = useTransition();
  const rejected = myVote?.choice === "reject";
  /* **العنوانُ يسمّي مَن أدليتَ له** (قرار المالك ٢٠٢٦-٠٨-١٥): «صوّتّ في هذا المقعد» تقول
     الواقعةَ وتُخفي محلَّها، والمقعدُ مكتوبٌ في الرأس فوقها. فيُقال الرقمُ في العنوان نفسِه،
     ويسقط إلى الجملة العامّة إن لم يكن للصوت مرشّحٌ في القائمة (الاعتراضُ على التزكية). */
  const votedNumber = myVote?.candidateId ? candidates.find((c) => c.id === myVote.candidateId)?.number ?? null : null;

  const cast = (candidateId: string, choice?: "approve" | "reject") => {
    start(async () => {
      const r = await api.castVote(election.electionId, candidateId, choice);
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      api.nav("/dashboard/elections/vote");
      api.refresh();
    });
  };

  return (
    <>
      <div className="ash-phead"><div><Breadcrumb leaf={election.position} /><h1>صوّت الآن</h1></div></div>

      {election.hasVoted ? (
        <div className="blt">
          <BallotHead election={election} />
          <Alert tone="success" title={rejected ? "اعترضت على التزكية" : votedNumber !== null ? `صوّتّ إلى المرشّح ${votedNumber}` : "صوّتّ في هذا المقعد"}>
            صوتُك مسجَّلٌ ولا يُغيَّر. ويبقى لك أن تقرأ ما كتبه المرشّحون حتّى يُغلق الباب.
          </Alert>
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
                    {/* ورقتُك تُسمّى في سطرها بعد الختم كما سُمّيت قبله، وشارةُ «صوتك» وحدَها
                        تبقى على الحافّة : خبرُ الاختيار غيرُ خبرِ الهويّة. */}
                    <CandidateName number={c.number} self={c.isSelf} />
                    {mine ? <VoteTag choice={rejected ? "reject" : "approve"} /> : null}
                  </div>
                  <Statement text={c.statement} />
                  <CandidateFile candidate={c} onFail={() => toast.error("تعذّر فتح الملفّ، أعِد المحاولة.")} />
                </CardBody>
              </Card>
            );
          })}
          <div className="blt-bar">
            <Button variant="ghost" size="md" onClick={() => api.nav("/dashboard/elections/vote")}>
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
