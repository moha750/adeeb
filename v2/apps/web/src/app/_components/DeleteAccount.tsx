"use client";

/**
 * **بابُ حذف الحساب** — واحدٌ تفتحه غرفتان: `/me` لصاحب الحساب، وإعداداتُ اللوحة للعضو.
 * (والثالثةُ تطبيقُ الجوّال، وله شاشتُه بلغته.) ولو كُتب في كلّ غرفةٍ نسخةٌ لاختلفتا بعد شهر:
 * فالنصُّ الذي يُوعَد به الناسُ لا يُكتب مرّتين.
 *
 * ويُقال فيه الصدقُ كاملًا لا مجمَّلًا (قرارُ المالك ١٩ أغسطس ٢٠٢٦): يموت الدخولُ وتختفي
 * الصفحةُ العلنيّةُ وتقف الرسائل، **ويبقى في سجلّ النادي الداخليّ ما فُعل** — لأنّ سجلَّ
 * جهةٍ لا يُمحى بانصراف صاحبه. فمن قرأ ثمّ مضى، مضى عالمًا.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Modal, Textarea } from "@adeeb/design-system";
import { ChatText, Key, Lock } from "@phosphor-icons/react";
import { Question, Trash } from "@/app/_components/glyphs";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { cancelMyDeletion, requestMyDeletion } from "@/app/me/actions";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Props = {
  /** طلبٌ قائم؟ حينها لا يُعرَض بابُ الحذف بل بابُ العدول. */
  pending: boolean;
  /** «١٨ سبتمبر ٢٠٢٦» — مصوغًا في الخادم بتوقيت الرياض (`lib/dates`)، فلا تصوغه ساعةُ الجهاز. */
  dueLabel: string | null;
  /** له هويّةُ بريدٍ وكلمةِ مرور؟ من دخل بقوقل أو أبل وحدهما لا كلمةَ مرورٍ له تُثبِت. */
  hasPassword: boolean;
};

export function DeleteAccount({ pending, dueLabel, hasPassword }: Props) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setOpen(false);
    setErr(null);
    setPassword("");
    setReason("");
  }

  function submit() {
    setErr(null);
    start(async () => {
      const res = await requestMyDeletion({ password, captchaToken: tsToken ?? undefined, reason });
      // رمزُ الدرع يُستهلك مرّةً — فمن أخطأ كلمةَ المرور احتاج رمزًا جديدًا لا القديمَ المحروق.
      setTsToken(null);
      setTsReset((n) => n + 1);
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      setOpen(false);
      setPassword("");
      setDone(res.message);
      router.refresh();
    });
  }

  function undo() {
    setErr(null);
    start(async () => {
      const res = await cancelMyDeletion();
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      setDone(res.message);
      router.refresh();
    });
  }

  if (pending) {
    return (
      <>
        <Alert tone="danger" title="حسابُك في طريقه إلى الحذف">
          {dueLabel ? `يُنفَّذ في ${dueLabel}.` : "يُنفَّذ بعد انقضاء المهلة."} ولك أن تعدل إلى ذلك اليوم.
        </Alert>
        <div className="chip-row">
          <Button variant="ghost-danger" size="sm" loading={busy} onClick={undo}>ألغِ الطلب</Button>
        </div>
        {err ? <Alert tone="danger">{err}</Alert> : null}
        {done ? <Alert tone="success">{done}</Alert> : null}
      </>
    );
  }

  return (
    <>
      <Button variant="danger" size="md" onClick={() => setOpen(true)}>
        <Trash size={16} aria-hidden /> احذف حسابي
      </Button>
      {done ? <Alert tone="success">{done}</Alert> : null}

      <Modal
        open={open}
        onClose={close}
        busy={busy}
        title="حذفُ حسابك"
        description="اقرأ ما يقع، ثمّ أكّد."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={close} disabled={busy}>تراجع</Button>
            <Button variant="danger" size="md" loading={busy} onClick={submit}>احذف حسابي</Button>
          </>
        }
      >
        <Alert tone="warning" title="بعد ثلاثين يومًا يُغلَق ولا يُفتَح">
          لن تستطيع الدخول، وتختفي صفحتُك العلنيّة، وتقف رسائلُ النادي. ويبقى في سجلّ النادي
          الداخليّ ما فعلتَه معنا: عضويّتُك ومناصبُك وما شاركتَ فيه، فسجلُّ جهةٍ لا يُمحى
          بانصراف صاحبه. ولك أن تعدل خلال المهلة.
        </Alert>
        <Textarea
          label="لماذا؟"
          icon={<ChatText />}
          innerIcon={<Question />}
          placeholder="سطرٌ يُقرأ للتحسين لا للمحاسبة. ولك أن تتركه."
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {hasPassword ? (
          <Field
            label="كلمة المرور"
            type="password"
            icon={<Lock />}
            innerIcon={<Key />}
            placeholder="إثباتًا أنّك أنت"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        ) : null}
        {hasPassword && TURNSTILE_SITE_KEY ? (
          <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} />
        ) : null}
        {err ? <Alert tone="danger">{err}</Alert> : null}
      </Modal>
    </>
  );
}
