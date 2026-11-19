"use client";

import { Modal } from "@adeeb/design-system";
import { Armchair, IdentificationCard, Megaphone, PencilSimpleLine, Scales, ShieldCheck, UserMinus } from "@phosphor-icons/react";
import { Check } from "@/app/_components/glyphs";
import { AdButton } from "@/app/_ad/primitives";
import { AdLine } from "@/app/_ad/account";
import { useElectionApi } from "../actions-context";

// شروطُ الترشّح — بوّابةٌ قبل صفحة إكمال البيان (يوافق ثمّ يُكمل). نصٌّ معتمَدٌ بكلمة المالك، مسنودٌ إلى لائحة الانتخابات.
// (٢٠٢٦-١١-٠٧) المرشّحُ صار يُعرَف باسمه: سقط بندُ التعمية وبندُ «لا تُفصح ولا تسوّق» بقرار المالك،
// ومعهما «من خالف ذلك…» إذ لم يبقَ له ما يعود عليه. وكلُّ شرطٍ برمزه سطرًا من سطور «حسابي» (الهويّة ٢٠٢٦-١١-١٩)
// (٢٠٢٦-١١-١٩) أقرّ المالكُ النصَّ بعد مطابقته بنظام الانتخابات. والمراجعُ يُقال «إدارة الموارد البشرية» كما يعرفها الأعضاء وكما تقول صفحةُ
// الترشّح (اختيارُه، وإن كان المراجعون في النظام مديري الانتخابات ومشرفَ اللجنة، م٤ وم١٤)،
// والمعتمَدُ لا يُعدَّل (م١٥)، وأُضيف الانسحابُ والترشّحُ مرّةً (م١٠ وم١٥)، وضوابطُ الدعاية (م٢٢)، والإقرارُ بأحكام النظام (م١٢)
const TERMS = [
  { icon: <Armchair />, text: "الترشُّح لهذا المقعد التزامٌ بمسؤوليّاته إن فزتَ به." },
  { icon: <IdentificationCard />, text: "يُعرَض بيانُك وملفّك على المصوّتين باسمك وصورتك." },
  { icon: <Scales />, text: "تراجع إدارةُ الموارد البشرية ترشّحك، فتعتمده أو تطلب تعديله أو تعتذر عنه." },
  { icon: <PencilSimpleLine />, text: "تعدّل ترشّحك ما دام قيد المراجعة وبابُ الترشّح مفتوح، أو في مهلة طلب التعديل، ولا يُعدَّل بعد اعتماده." },
  { icon: <UserMinus />, text: "لك أن تنسحب ما لم يُفتح التصويت، ولا تتقدّم في هذا الانتخاب بعد انسحابك أو الاعتذار عن ترشّحك." },
  { icon: <Megaphone />, text: "تلتزم ضوابط الدعاية: لا دعاية من حسابات أدِيب الرسمية، ولا من منصّته في غير بيانك، ولا تجريح لمرشّح، ولا وعد بنفع ولا ضغط بمنصب، ولا تطلب من أحد أن يُريك صوته. ومخالفتها تجمّد ترشّحك." },
  { icon: <ShieldCheck />, text: "تُقِرّ أنّ بيانات ترشّحك صحيحةٌ وتخصّك، وتُقِرّ بأحكام نظام الانتخابات." },
];

/**
 * بوّابةُ شروط الترشُّح — نافذةُ الهويّة (عنوانُها لوح، وشرحُها المقعدُ أوّلَ سطرٍ على الورق)، والشروطُ سطورٌ برموزها، فإذا وافق
 * **انتقل إلى صفحة إكمال البيان** `/run/[electionId]`. يُمرَّر `onAgree` بديلًا للانتقال في المعاينة.
 * (كانت تنبيهًا قديمًا يكرّر المقعدَ الذي في شرحها، ثمّ قائمةً بنقاطٍ من الهويّة القديمة.)
 */
export function TermsGate({ target, onClose, onAgree }: {
  target: { electionId: string; position: string } | null;
  onClose: () => void;
  onAgree?: (electionId: string) => void;
}) {
  const api = useElectionApi();
  const agree = () => {
    if (!target) return;
    if (onAgree) onAgree(target.electionId);
    else api.nav(`/dashboard/elections/run/${target.electionId}`);
    onClose();
  };

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title="شروط الترشّح"
      description={target?.position}
      size="md"
      footer={
        <>
          <AdButton variant="fill" icon={<Check />} onClick={agree}>أوافق وأُكمل</AdButton>
          <AdButton plain onClick={onClose}>إلغاء</AdButton>
        </>
      }
    >
      <ul className="ad-lines ad-elw-why">
        {TERMS.map((t) => <AdLine key={t.text} icon={t.icon} v={t.text} read />)}
      </ul>
    </Modal>
  );
}
