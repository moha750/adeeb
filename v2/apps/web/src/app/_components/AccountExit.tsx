"use client";

/**
 * **بابُ الخروج** — واحدٌ يتبدّل بحال صاحبه، لا أربعةُ أبوابٍ تُرسَم في أربع شاشات.
 *
 * قرارُ المالك ٢٠ أغسطس ٢٠٢٦، وقد نسخ ما قبله: كان حاملُ المنصب يُمنع من الحذف حتى
 * يُعفى، فرأى في المعاينة أنّ ذلك يعلّق خروجَ مئةٍ وخمسةٍ وثلاثين عضوَ لجنةٍ على ثلاثة.
 * فصارت العضويّةُ تُنهى **قبل** الحساب لا معه، وصار الذي يُعرَض بحسب المقعد:
 *
 *   `end_now`     عضوُ لجنةٍ أو عضوٌ بلا مقعد: زرٌّ يُنهي عضويّتَه في حينه بسببٍ مكتوب
 *   `request`     منصبٌ قياديّ: طلبٌ يُقرّه أحدُ ثلاثة، ولصاحبه أن يسحبه
 *   `sealed`      رئيسُ النادي: لا يزيله أحدٌ ولا يزيل نفسَه، فلا بابَ له ويُقال ذلك صراحةً
 *   `delete`      صاحبُ حسابٍ لا عضويّةَ له: بابُ حذف الحساب (`DeleteAccount`)
 *
 * والحكمُ من القاعدة (`membership_exit_door`) لا من هذا الملفّ: ما ههنا إلّا رسمُ ما قالته.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Textarea } from "@adeeb/design-system";
import { ChatText } from "@phosphor-icons/react";
import { Question } from "@/app/_components/glyphs";
import { DeleteAccount } from "@/app/_components/DeleteAccount";
import { EXIT_REASON_MIN } from "@/app/me/vocab";
import { endMyMembership, requestMembershipExit, withdrawMembershipExit } from "@/app/me/actions";

type Answer = { at: string; reason: string; decisionReason: string | null };

type Props = {
  door: "sealed" | "request" | "end_now" | "delete";
  /** من يقضي في طلبه — من القاعدة، فيتبع مقعدَه هو لا قائمةً ثابتة. */
  deciders: string[];
  /** طلبٌ ينتظر القرار (تاريخُه وسببُه) — يُعرَض بدل النموذج. */
  pending: { at: string; reason: string } | null;
  /** آخرُ ردٍّ وصله، يُقال ولا يُبتلَع. */
  lastAnswer: Answer | null;
  /** لبابِ الحذف وحدَه. */
  deletion: { pending: boolean; dueLabel: string | null; hasPassword: boolean };
};

export function AccountExit({ door, deciders, pending, lastAnswer, deletion }: Props) {
  if (door === "delete") {
    return <DeleteAccount pending={deletion.pending} dueLabel={deletion.dueLabel} hasPassword={deletion.hasPassword} />;
  }

  if (door === "sealed") {
    return (
      <Alert tone="warning" title="مقعدُك محميٌّ في القاعدة">
        رئاسةُ النادي لا يُخليها أحدٌ سواك، ولا تُخليها أنت عن نفسك: صاحبُ المنصب يزيل ما دونه
        لا نفسَه. فلا بابَ لك من هذه الشاشة، وإخلاءُ مقعدك يقع في القاعدة بيدٍ تُدرك ما تفعل.
      </Alert>
    );
  }

  return <ExitForm door={door} deciders={deciders} pending={pending} lastAnswer={lastAnswer} />;
}

function ExitForm({ door, deciders, pending, lastAnswer }: Pick<Props, "door" | "deciders" | "pending" | "lastAnswer">) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const short = reason.trim().length < EXIT_REASON_MIN;

  function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      setReason("");
      setDone(res.message);
      router.refresh();
    });
  }

  if (pending) {
    return (
      <>
        <Alert tone="info" title="طلبُك ينتظر القرار">
          أُرسل في {pending.at}، ويقضي فيه {deciders.join("، أو ")}. وسببُك المكتوب: {pending.reason}
        </Alert>
        <div className="chip-row">
          <Button variant="ghost" size="sm" loading={busy} onClick={() => run(withdrawMembershipExit)}>
            اسحب الطلب
          </Button>
        </div>
        {err ? <Alert tone="danger">{err}</Alert> : null}
        {done ? <Alert tone="success">{done}</Alert> : null}
      </>
    );
  }

  const isRequest = door === "request";

  return (
    <>
      {lastAnswer?.decisionReason ? (
        <Alert tone="warning" title={`رُدّ طلبُك في ${lastAnswer.at}`}>{lastAnswer.decisionReason}</Alert>
      ) : null}

      <Alert tone="warning" title={isRequest ? "منصبُك يسبق حسابَك" : "إنهاءُ العضويّة لا رجعةَ فيه بيدك"}>
        {isRequest
          ? `تطلب إنهاء عضويّتك، فيقضي فيه ${deciders.join("، أو ")}. فإذا أُقرّ انتهت عضويّتُك ونُزعت مناصبُك، وصرتَ صاحبَ حسابٍ في أديب لك أن تحذفه.`
          : "تنتهي عضويّتُك في حينها بلا انتظار، ويُنزَع انتماؤك إلى لجنتك، وتصير صاحبَ حسابٍ في أديب. وعودتُك بعدها تكون بابًا جديدًا لا بضغطة."}
      </Alert>

      <Textarea
        label="السبب"
        icon={<ChatText />}
        innerIcon={<Question />}
        placeholder="سطرٌ يبقى في السجلّ، فيُقرأ بعد سنةٍ ويُفهَم"
        rows={2}
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        helper={`سببٌ مطلوب، ${EXIT_REASON_MIN} محارف على الأقلّ.`}
      />

      <div className="chip-row">
        <Button
          variant="danger"
          size="md"
          loading={busy}
          disabled={short}
          onClick={() => run(() => (isRequest ? requestMembershipExit(reason) : endMyMembership(reason)))}
        >
          {isRequest ? "أرسل طلب إنهاء العضوية" : "أنهِ عضويّتي"}
        </Button>
      </div>

      {err ? <Alert tone="danger">{err}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}
    </>
  );
}
