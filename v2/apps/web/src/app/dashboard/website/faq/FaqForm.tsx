"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, SaveBar, SectionCard, Field, Textarea } from "@adeeb/design-system";
import { ChatText, TextT } from "@phosphor-icons/react";
import { PencilSimple, Question } from "@/app/_components/glyphs";
import { useToast } from "../../_components/ToastProvider";
import type { FaqEditData } from "./data";
import { createFaq, updateFaq, type FaqInput } from "./actions";
import { PageHeader } from "../../_components/PageHeader";

export function FaqForm({ faq }: { faq?: FaqEditData | null }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();

  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");

  const editing = faq != null;

  const toInput = (): FaqInput => ({ question, answer });

  /**
   * **أثمّة ما يُحفَظ؟** — الشريطُ اللاصق لا يظهر حتى يوجد. والمقارنةُ بلَقطةِ `toInput()`
   * نفسِها التي تُرسَل، والأصلُ يُجمَّد في حالةٍ تُهيَّأ مرّةً: الشاشةُ تُغادَر بعد الحفظ
   * فلا معنى لتحديثه. **ولا `useRef`** — قراءةُ `ref.current` أثناء الرسم يردّها
   * `react-hooks/refs` خطأً، والحالةُ المهيّأةُ مرّةً تقول المعنى نفسَه وتُقرأ في الرسم.
   */
  const snapshot = JSON.stringify(toInput());
  const [origin] = useState(snapshot);
  const dirty = snapshot !== origin;

  const save = () => {
    startSave(async () => {
      const input = toInput();
      const r = editing ? await updateFaq(faq.id, input) : await createFaq(input);
      if (r.ok) {
        toast.success(r.message);
        router.push("/dashboard/website/faq");
        router.refresh();
      } else toast.error(r.message);
    });
  };

  return (
    <>
      {/* «إلغاء» سقط: يكرّر فتاتَ المسار الذي فوقه بسطر. و«حفظ» فعلُ التزامٍ لا فعلُ
          رأسٍ، فنزل إلى الشريط اللاصق أسفلَه (حكمُ `/ui/page-header`). */}
      <PageHeader title={editing ? "تحرير السؤال" : "سؤال جديد"} />

      <div className="form-build">
        <SectionCard headerVariant="chip" icon={<Question />} title="السؤال والإجابة">
          <div className="form-grid">
            <Field className="form-full" label="السؤال" icon={<Question />} innerIcon={<PencilSimple />} placeholder="مثال: كيف أنضمّ إلى النادي؟" value={question} onChange={(e) => setQuestion(e.target.value)} required />
            <Textarea className="form-full" label="الإجابة" icon={<TextT />} innerIcon={<ChatText />} placeholder="اكتب إجابةً واضحةً ومختصرة" rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} required />
          </div>
        </SectionCard>
      </div>

      <SaveBar open={dirty} message={editing ? undefined : "سؤالٌ لم يُضَف بعد"}>
        <Button variant="primary" size="md" loading={saving} onClick={save}>
          {editing ? "حفظ التغييرات" : "إضافة السؤال"}
        </Button>
      </SaveBar>
    </>
  );
}
