"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, SaveBar, SectionCard, Textarea } from "@adeeb/design-system";
import { ChatText, TextT } from "@phosphor-icons/react";
import { PaperPlaneRight, SmileyWink } from "@phosphor-icons/react";
import { Prohibit, Question } from "@/app/_components/glyphs";
import { IconDeebo } from "../../_shell/icons";
import { useToast } from "../../_components/ToastProvider";
import { PageHeader } from "../../_components/PageHeader";
import type { PersonaForm } from "./data";
import { probePersona, savePersona } from "./actions";

/** الرقمُ في طبعه يُسقط حارسَ الأرقام، فيُمنَع الحفظُ لا يُنبَّه عليه. */
const DIGITS = /[0-9٠-٩۰-۹]/;

const countLines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean).length;

/**
 * **طبعُ ديبو** — ورقةُ الهويّة صارت شاشة (٢٠٢٦-٠٨-٢٢).
 *
 * وكلُّ ما ههنا يسري على الزوّار **في اللحظة**: لا نشرَ ولا مراجعة. ولذلك بابان قبل
 * الحفظ: منعُ الأرقام (وعلّتُه في `actions.ts`)، و«جرّبه» يسأله بالمسوّدة قبل أن تُثبَّت.
 */
export function PersonaView({ persona }: { persona: PersonaForm }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [probing, startProbe] = useTransition();

  const [form, setForm] = useState<PersonaForm>(persona);
  const set = <K extends keyof PersonaForm>(key: K, v: PersonaForm[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const snapshot = JSON.stringify(form);
  const [origin, setOrigin] = useState(snapshot);
  const dirty = snapshot !== origin;

  // ما فيه رقمٌ ممّا يدخل التوجيه — يُسمّى للناظر قبل أن يضغط، لا بعد أن يُردّ.
  const numbered = (["identity", "tone", "boundaries", "unknownAnswer", "prohibitions"] as const)
    .filter((k) => DIGITS.test(form[k]));

  const asks = countLines(form.suggestedQuestions);

  const save = () => {
    startSave(async () => {
      const r = await savePersona(form);
      if (r.ok) {
        toast.success(r.message);
        setOrigin(JSON.stringify(form));
        router.refresh();
      } else toast.error(r.message);
    });
  };

  const probe = () => {
    startProbe(async () => {
      setAnswer(null);
      const r = await probePersona(form, question);
      if (r.ok) setAnswer(r.answer);
      else toast.error(r.message);
    });
  };

  return (
    <>
      <PageHeader title="طبع ديبو" />

      <Alert tone="warning" title="ما تكتبه هنا يقوله ديبو للناس فورًا">
        لا نشرَ بعده ولا مراجعة. وجرّبه بالسؤال أسفل الصفحة قبل أن تحفظ، فالتجربةُ تبني
        كلامَه بالمسوّدة ولا تمسّ ما يقوله اليوم.
      </Alert>

      {numbered.length > 0 ? (
        <Alert tone="danger" title="فيه رقم، والحفظُ مردود">
          ديبو مأذونٌ أن يذكر في جوابه كلّ رقمٍ يراه في طبعه، فرقمٌ واحدٌ هنا يفتح له بابَ
          الأرقام كلَّه. امحُ الرقم من: {numbered.map((k) => FIELD_AR[k]).join("، ")}.
        </Alert>
      ) : null}

      <div className="form-build">
        <SectionCard headerVariant="chip" icon={<IconDeebo />} title="من أنت">
          <div className="form-grid">
            <Textarea
              className="form-full"
              label="تعريفه بنفسه"
              icon={<TextT />}
              innerIcon={<ChatText />}
              placeholder="كيف يتحدّث عن نفسه، وقصّة اسمه، وجوابه حين يُسأل: هل أنت إنسان؟"
              rows={6}
              value={form.identity}
              onChange={(e) => set("identity", e.target.value)}
              required
            />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<SmileyWink />} title="نبرته">
          <div className="form-grid">
            <Textarea
              className="form-full"
              label="كيف يتكلّم"
              icon={<TextT />}
              innerIcon={<ChatText />}
              placeholder="ودود، مختصر، لا يتفاصح… وطول جوابه، وإيموجي أو بلا إيموجي"
              rows={4}
              value={form.tone}
              onChange={(e) => set("tone", e.target.value)}
              required
            />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<Prohibit />} title="حدوده">
          <div className="form-grid">
            <Textarea
              className="form-full"
              label="ما يفعله وما يعتذر عنه"
              icon={<TextT />}
              innerIcon={<ChatText />}
              placeholder="المسامرة، وطلب العمل، والشعر، والروابط…"
              rows={10}
              value={form.boundaries}
              onChange={(e) => set("boundaries", e.target.value)}
              required
            />
            <Textarea
              className="form-full"
              label="ما لا يفعله أبدًا"
              icon={<Prohibit />}
              innerIcon={<ChatText />}
              placeholder="محظورٌ في كلّ سطر"
              rows={8}
              value={form.prohibitions}
              onChange={(e) => set("prohibitions", e.target.value)}
            />
            <Field
              className="form-full"
              label="ما يقوله حين لا يعرف"
              icon={<Question />}
              innerIcon={<ChatText />}
              placeholder="هذا ما لا أعرفه، ولا أحبّ أن أخمّن…"
              value={form.unknownAnswer}
              onChange={(e) => set("unknownAnswer", e.target.value)}
              required
            />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<Question />} title="أسئلة شاشته الفارغة">
          <div className="form-grid">
            <Textarea
              className="form-full"
              label="الأسئلة المقترحة"
              icon={<Question />}
              innerIcon={<ChatText />}
              placeholder="سؤالٌ في كلّ سطر"
              rows={7}
              value={form.suggestedQuestions}
              onChange={(e) => set("suggestedQuestions", e.target.value)}
            />
            {/* القرارُ الذي كان معلّقًا في ورقة الهويّة: كم منها يُعرض. صار رقمًا بيده. */}
            <Field
              label="كم يُعرض منها"
              icon={<Question />}
              innerIcon={<Question />}
              placeholder="٤"
              type="number"
              min={0}
              max={asks}
              charset="digits"
              value={String(form.shownQuestions)}
              onChange={(e) => set("shownQuestions", Number(e.target.value) || 0)}
              helper={`المكتوب منها ${asks}`}
            />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<PaperPlaneRight />} title="جرّبه قبل أن تحفظ">
          <div className="form-grid">
            <Field
              className="form-full"
              label="اسأله بالمسوّدة"
              icon={<Question />}
              innerIcon={<PaperPlaneRight />}
              placeholder="مثال: هلا كيف حالك؟"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <div className="form-full">
              <Button variant="neutral" size="md" loading={probing} onClick={probe}>
                اسأل ديبو
              </Button>
            </div>
            {answer !== null ? (
              <Alert className="form-full" tone="info" title="جوابه بالمسوّدة">
                {answer}
              </Alert>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SaveBar open={dirty} message="طبعٌ لم يُحفظ بعد">
        <Button variant="primary" size="md" loading={saving} disabled={numbered.length > 0} onClick={save}>
          حفظ الطبع
        </Button>
      </SaveBar>
    </>
  );
}

const FIELD_AR: Record<string, string> = {
  identity: "من أنت",
  tone: "نبرته",
  boundaries: "حدوده",
  unknownAnswer: "جملة لا أعرف",
  prohibitions: "المحظورات",
};
