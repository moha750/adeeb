import { Alert, Badge } from "@adeeb/design-system";
import { certDate, hoursPhrase } from "@/lib/certificates/text";
import type { FormerName, VerifyResult } from "./data";

/**
 * **جوابُ التحقّق** — ما تراه الجهةُ التي مسحت الرمز. مفصولٌ عن الصفحة ليُعرَض في معرضه
 * (`/ui/verify-states`) بأحواله كلِّها كما يُعرَض حيًّا، فلا تفترق المعاينةُ عن الصفحة.
 */
export function VerifyResultView({ result }: { result: VerifyResult }) {
  if (result.state === "empty") return null;
  if (result.state === "error") {
    return <Alert tone="danger" title="تعذّر التحقّق">حدث خطأ في الاتّصال. أعِد المحاولة بعد قليل.</Alert>;
  }
  if (result.state === "missing") {
    return (
      <Alert tone="danger" title="لا شهادة بهذا الرقم">
        راجِع الرقم كما هو مطبوعٌ في الورقة حرفًا برقم. وإن كان صحيحًا ولم يُعرَف، فالورقة ليست منّا.
      </Alert>
    );
  }

  const valid = result.state === "valid";
  return (
    <div style={{ marginTop: 18 }}>
      <div className="chip-row" style={{ marginBottom: 12 }}>
        {valid ? (
          <Badge tone="success" variant="soft">شهادة صحيحة</Badge>
        ) : (
          <Badge tone="danger" variant="soft">شهادة مبطَلة</Badge>
        )}
        <Badge tone="info" variant="soft">{result.serial}</Badge>
        {result.distinction ? <Badge tone="success" variant="solid">بتميّز</Badge> : null}
      </div>

      <Alert tone={valid ? "success" : "danger"} title={result.holderName}>
        {result.positionTitle}، للفترة من {certDate(result.periodFrom)} إلى {certDate(result.periodTo)}
        {result.hours ? `، ${hoursPhrase(result.hours)}` : ""}.
        {valid
          ? ` صدرت عن نادي أديب في ${certDate(result.issuedOn)}.`
          : ` أُبطلت هذه الشهادة${result.revokedOn ? ` في ${certDate(result.revokedOn)}` : ""}، فلا يُعتدّ بها.`}
      </Alert>

      {/* جملةُ التميّز كما طُبعت في الورقة: تُطابَق بها النسخةُ التي بين يدي الجهة */}
      {result.distinction ? (
        <div style={{ marginTop: 12 }}>
          <Alert tone="info" title="شهادةُ مشاركةٍ بتميّز">«{result.distinction}»</Alert>
        </div>
      ) : null}

      {result.formerNames.length ? (
        <div style={{ marginTop: 12 }}>
          <FormerNames names={result.formerNames} current={result.holderName} valid={valid} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * **الأسماءُ التي حملتها الشهادةُ قبل اسمها اليوم** (قرارُ المالك ٢٠٢٦-١٠-٠١). صحّح صاحبُها اسمَه بعد
 * الإصدار فتبعته الشهادة، وقد تكون بيد هذه الجهة نسخةٌ قديمة. فيُقال الاسمُ القديمُ **حرفًا بحرف**
 * ويومُ انتهائه، لتُطابَق الورقةُ التي بين يديها ولا تبدو مزوّرة. ولا كشفَ فيه: الاسمُ مطبوعٌ عليها أصلًا.
 */
function FormerNames({ names, current, valid }: { names: FormerName[]; current: string; valid: boolean }) {
  const one = names.length === 1;
  const list = names.map((f) => `«${f.name}» حتى ${certDate(f.until)}`).join("، ثمّ ");
  const lead = one
    ? `حملت هذه الشهادةُ اسم ${list}، ثمّ صار «${current}».`
    : `حملت هذه الشهادةُ قبل اسمها اليوم: ${list}.`;
  const close = valid
    ? one ? " ونسختُها بأيّ الاسمين صحيحة." : " ونسختُها بأيٍّ من هذه الأسماء صحيحة."
    : one ? " ونسختُها بأيّ الاسمين هي هذه الشهادةُ المُبطَلة." : " ونسختُها بأيٍّ منها هي هذه الشهادةُ المُبطَلة.";

  return (
    <Alert tone="info" title="صُحّح اسمُ صاحبها بعد إصدارها">
      {lead}
      {close}
    </Alert>
  );
}
