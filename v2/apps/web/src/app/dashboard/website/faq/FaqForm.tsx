"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Textarea } from "@adeeb/design-system";
import { ChatCenteredText, ChatText, FloppyDisk, TextT } from "@phosphor-icons/react";
import { PencilSimple, Plus, Question } from "@/app/_components/glyphs";
import { useToast } from "../../_components/ToastProvider";
import type { FaqEditData } from "./data";
import { createFaq, updateFaq, type FaqInput } from "./actions";
import { AdCard } from "@/app/_ad/primitives";
import { FormRoom, FormSection } from "@/app/_ad/form";

export function FaqForm({ faq }: { faq?: FaqEditData | null }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();

  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");

  const editing = faq != null;

  const toInput = (): FaqInput => ({ question, answer });

  /**
   * **أثمّة ما يُحفَظ؟** — في التحرير لا يُحفظ قبل أوّل تغيير، وفي الضيّق يلحقك الفعلُ حين يوجد (`FormRoom`). والمقارنةُ بلَقطةِ `toInput()`
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

  /* التذكرةُ كما ستظهر في غرفة الأسئلة (`_ad/rooms/FaqRoom`): السؤالُ عنوانُها والإجابةُ سطرُها (والكعبُ ترتيبُه في الغرفة) */
  const preview = (
    <div className="ad-form-preview-card" data-untitled={question.trim() ? undefined : ""}>
      <AdCard seed={faq?.id ?? "new-faq"} title={question.trim() || "السؤال"}
        meta={[answer.trim() ? { icon: <ChatCenteredText />, text: answer.trim() } : { icon: <ChatCenteredText />, text: "الإجابة لم تُكتب", tone: "muted" }]} />
    </div>
  );

  return (
    <FormRoom
      title={editing ? "تحرير السؤال" : "سؤال جديد"}
      preview={preview}
      commit={{
        primary: editing
          ? { label: "حفظ التغييرات", icon: <FloppyDisk />, onClick: save, busy: saving, held: !dirty }
          : { label: "إضافة السؤال", icon: <Plus />, onClick: save, busy: saving },
        cancelHref: "/dashboard/website/faq",
        dirty,
      }}
    >
      <FormSection id="qa" icon={<Question />} title="السؤال والإجابة">
        <div className="form-grid">
          <Field className="form-full" label="السؤال" icon={<Question />} innerIcon={<PencilSimple />} placeholder="مثال: كيف أنضمّ إلى النادي؟" value={question} onChange={(e) => setQuestion(e.target.value)} required />
          <Textarea className="form-full" label="الإجابة" icon={<TextT />} innerIcon={<ChatText />} placeholder="اكتب إجابةً واضحةً ومختصرة" rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} required />
        </div>
      </FormSection>
    </FormRoom>
  );
}
