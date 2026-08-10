"use client";

import { useRouter } from "next/navigation";
import { Alert, Button, Modal } from "@adeeb/design-system";

// شروطُ الترشّح — بوّابةٌ قبل صفحة إكمال البيان (يوافق ثمّ يُكمل). نصٌّ معتمَدٌ بكلمة المالك، مسنودٌ إلى لائحة الانتخابات.
const TERMS = [
  "الترشُّح لهذا المنصب التزامٌ بمسؤوليّاته إن فزتَ به.",
  "يُعرَض بيانُك للمصوتين بلا اسمك ويظهر رقمك الانتخابي فقط مثل (المرشّح رقم 3)؛ فلا تذكر اسمك ولا لقبًا ولا تلميحًا يدلّ عليك.",
  "لا تُفصح أنّك ترشّحت، ولا تسوّق لنفسك، ولا تطلب الأصوات في قروبات أدِيب ولا في المحادثات الشخصيّة.",
  "من خالف ذلك فلإدارة الموارد البشرية استبعادُه من الانتخاب.",
  "تراجع إدارةُ الموارد البشرية ترشّحك، ولها أن تعتمده أو تطلب تعديله أو تعتذر عنه.",
  "تُقِرّ أنّ بيانات ترشّحك صحيحةٌ وتخصّك.",
  "تعديلُ ترشّحك متاحٌ ما دام بابُ الترشّح مفتوحًا.",
];

/**
 * بوّابةُ شروط الترشُّح — نافذةٌ تعرض المنصبَ والأحكام، فإذا وافق **انتقل إلى صفحة إكمال البيان**
 * `/apply/[electionId]` (لا نافذة إكمالٍ بعدها). يُمرَّر `onAgree` بديلًا للانتقال في المعاينة.
 */
export function TermsGate({ target, onClose, onAgree }: {
  target: { electionId: string; position: string } | null;
  onClose: () => void;
  onAgree?: (electionId: string) => void;
}) {
  const router = useRouter();
  const agree = () => {
    if (!target) return;
    if (onAgree) onAgree(target.electionId);
    else router.push(`/dashboard/elections/run/${target.electionId}`);
    onClose();
  };

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title="شروطُ الترشُّح"
      description={target?.position}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" size="md" onClick={agree}>أوافق وأُكمل</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <Alert tone="info" title="المنصب المتقدَّم له">{target?.position}</Alert>
        <div>
          <p className="txt" style={{ fontWeight: 700, marginBottom: 8 }}>الشروط والأحكام</p>
          <ul className="ctrm">{TERMS.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      </div>
    </Modal>
  );
}
