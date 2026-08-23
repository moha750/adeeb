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
import { Alert, Button, Field, Modal, Textarea } from "@adeeb/design-system";
import { ChatText, IdentificationBadge } from "@phosphor-icons/react";
import { Question, Warning } from "@/app/_components/glyphs";
import { normalizeName } from "@/lib/personName";
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
  /** اسمُ صاحبه كما هو مسجَّل — يُكتب بيده تأكيدًا قبل الخروج. */
  fullName: string;
  /** لبابِ الحذف وحدَه. */
  deletion: { pending: boolean; dueLabel: string | null; hasPassword: boolean };
};

export function AccountExit({ door, deciders, fullName, pending, lastAnswer, deletion }: Props) {
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

  return <ExitForm door={door} deciders={deciders} fullName={fullName} pending={pending} lastAnswer={lastAnswer} />;
}

function ExitForm({ door, deciders, fullName, pending, lastAnswer }: Pick<Props, "door" | "deciders" | "fullName" | "pending" | "lastAnswer">) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  const short = reason.trim().length < EXIT_REASON_MIN;

  /**
   * **الاسمُ يُكتب بيده** (قرار المالك ٢٠٢٦-٠٨-٢٠): الخروجُ لا يُساوي نقرةً واحدة، فيُطلب
   * فعلٌ متعمَّدٌ لا يقع سهوًا. والمقارنةُ بعد التطبيع (`normalizeName`) فلا تُردّ مسافةٌ
   * زائدةٌ ولا تطويلٌ في محلّ الاسم الصحيح.
   */
  const nameMatches = normalizeName(typed) === normalizeName(fullName) && normalizeName(fullName).length > 0;

  function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      setReason("");
      setTyped("");
      setConfirming(false);
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
        <div className="btn-row">
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

      {/* **تحذيرٌ لا شرحُ إجراء** (قرار المالك ٢٠٢٦-٠٨-٢٠): كانت تقول له من يقضي في طلبه
          وكيف يمضي، وتلك معلومةٌ لا تنفعه عند الضغط. فصارت تقول ما يخسره إن أُقرّ. وأسماءُ
          القاضين تبقى حيث تنفع: في بطاقة الانتظار بعد الإرسال. */}
      <Alert tone="warning" title={isRequest ? "هل تُقرّ على طلب خروجك من أدِيب؟" : "إنهاءُ العضويّة لا رجعةَ فيه بيدك"}>
        {isRequest
          ? "تنتهي عضويّتُك وتُنزَع مناصبُك كلُّها، فتصير صاحبَ حسابٍ في أديب لا عضوًا فيه. وعودتُك يعني أن تتقدم من جديد."
          : "تنتهي عضويّتُك في حينها بلا انتظار، ويُنزَع انتماؤك إلى لجنتك، وتصير صاحبَ حسابٍ في أديب. وعودتُك يعني أن تتقدم من جديد."}
      </Alert>

      <Textarea
        label="السبب"
        icon={<ChatText />}
        innerIcon={<Question />}
        placeholder="حابين نسمع منك سبب طلب خروجك من عائلتك"
        rows={2}
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        helper={`سببٌ مطلوب، ${EXIT_REASON_MIN} محارف على الأقلّ.`}
      />

      <div className="btn-row">
        <Button
          variant="danger"
          size="md"
          disabled={short || busy}
          onClick={() => { setTyped(""); setErr(null); setConfirming(true); }}
        >
          {isRequest ? "أرسل طلب إنهاء العضوية" : "أنهِ عضويّتي"}
        </Button>
      </div>

      {err && !confirming ? <Alert tone="danger">{err}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      <Modal
        open={confirming}
        onClose={() => { if (!busy) setConfirming(false); }}
        busy={busy}
        title={isRequest ? "تأكيدُ طلب سحب العضوية" : "تأكيدُ إنهاء العضوية"}
        description="اكتب اسمَك كما هو مسجَّلٌ، حرفًا بحرف."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setConfirming(false)} disabled={busy}>تراجع</Button>
            <Button
              variant="danger"
              size="md"
              loading={busy}
              disabled={!nameMatches}
              onClick={() => run(() => (isRequest ? requestMembershipExit(reason) : endMyMembership(reason)))}
            >
              {isRequest ? "أرسل الطلب" : "أنهِ عضويّتي"}
            </Button>
          </>
        }
      >
        {/* نصُّ المالك بحروفه (٢٠٢٦-٠٨-٢٠): سؤالٌ يُنادي أهلَه لا إخبارٌ بإجراء، وواحدٌ
            للبابين — فالفرقُ بينهما محمولٌ في التحذير فوقُ وفي اسم الزرّ تحتُ. */}
        <Alert tone="danger" title="هل أنت مُتأكد من مُغادرة عائلة أدِيب؟">
          {fullName}، ستودعنا خارج أديب: عضويّتُك تنتهي ومقاعدُك تُنزَع.
        </Alert>
        <Field
          label="اسمُك الكامل"
          icon={<IdentificationBadge />}
          innerIcon={<Warning />}
          placeholder={fullName}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          required
          error={typed.length > 0 && !nameMatches ? "الاسمُ لا يطابق ما هو مسجَّلٌ عندنا." : undefined}
        />
        {err ? <Alert tone="danger">{err}</Alert> : null}
      </Modal>
    </>
  );
}
