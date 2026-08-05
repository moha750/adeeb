"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ChartPanel, Field, Textarea } from "@adeeb/design-system";
import { ChatText, TextT } from "@phosphor-icons/react";
import { PencilSimple, Question } from "@/app/_components/glyphs";
import { useToast } from "../../_components/ToastProvider";
import type { FaqEditData } from "./data";
import { createFaq, updateFaq, type FaqInput } from "./actions";
import { Breadcrumb } from "../../_shell/Breadcrumb";

export function FaqForm({ faq }: { faq?: FaqEditData | null }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();

  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");

  const editing = faq != null;
  const crumbLeaf = editing ? "تحرير" : "سؤال جديد";

  const toInput = (): FaqInput => ({ question, answer });

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
      <div className="ash-phead">
        <div>
          <Breadcrumb leaf={crumbLeaf} />
          <h1>{editing ? "تحرير السؤال" : "سؤال جديد"}</h1>
        </div>
        <div className="form-head-actions">
          <Button variant="ghost" size="md" onClick={() => router.push("/dashboard/website/faq")} disabled={saving}>إلغاء</Button>
          <Button variant="primary" size="md" loading={saving} onClick={save}>{editing ? "حفظ التغييرات" : "إضافة السؤال"}</Button>
        </div>
      </div>

      <div className="form-build">
        <ChartPanel headerVariant="chip" icon={<Question />} title="السؤال والإجابة">
          <div className="form-grid">
            <Field className="form-full" label="السؤال" icon={<Question />} innerIcon={<PencilSimple />} placeholder="مثال: كيف أنضمّ إلى النادي؟" value={question} onChange={(e) => setQuestion(e.target.value)} required />
            <Textarea className="form-full" label="الإجابة" icon={<TextT />} innerIcon={<ChatText />} placeholder="اكتب إجابةً واضحةً ومختصرة" rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} required />
          </div>
        </ChartPanel>
      </div>
    </>
  );
}
