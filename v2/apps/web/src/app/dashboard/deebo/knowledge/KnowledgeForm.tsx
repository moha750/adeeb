"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, SaveBar, SectionCard, Field, Switch, Textarea } from "@adeeb/design-system";
import { ChatText, TextT } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { IconDeebo } from "../../_shell/icons";
import { useToast } from "../../_components/ToastProvider";
import type { FactEditData } from "./data";
import { createFact, updateFact, type FactInput } from "./actions";
import { PageHeader } from "../../_components/PageHeader";

/**
 * **الأرقامُ تُنبَّه ولا تُمنَع.**
 *
 * القاعدةُ «لا رقمًا يتغيّر» لا تُقاس بآلة: «مقرُّنا في الأحساء» بلا رقم، و«تأسّس النادي
 * سنة كذا» رقمٌ ثابتٌ لا يكذب، و«أعضاؤنا كذا» رقمٌ يكذب بعد شهر. فمن يعرف الفرقَ هو
 * الكاتب لا الحقل. ولذلك تحذيرٌ يظهر عند أوّل رقم، والحفظُ لا يُمنَع.
 */
const hasDigits = (v: string) => /[0-9٠-٩۰-۹]/.test(v);

export function KnowledgeForm({ fact }: { fact?: FactEditData | null }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();

  const [title, setTitle] = useState(fact?.title ?? "");
  const [body, setBody] = useState(fact?.body ?? "");
  const [isActive, setIsActive] = useState(fact?.isActive ?? true);

  const editing = fact != null;

  const toInput = (): FactInput => ({ title, body, isActive });

  /* أثمّة ما يُحفَظ؟ — الشريطُ اللاصق لا يظهر حتى يوجد، والمقارنةُ بلَقطةِ `toInput()`
     نفسِها التي تُرسَل. والأصلُ يُجمَّد في حالةٍ تُهيَّأ مرّةً: الشاشةُ تُغادَر بعد الحفظ
     فلا معنى لتحديثه (وقراءةُ `ref.current` أثناء الرسم يردّها `react-hooks/refs` خطأً). */
  const snapshot = JSON.stringify(toInput());
  const [origin] = useState(snapshot);
  const dirty = snapshot !== origin;

  const save = () => {
    startSave(async () => {
      const input = toInput();
      const r = editing ? await updateFact(fact.id, input) : await createFact(input);
      if (r.ok) {
        toast.success(r.message);
        router.push("/dashboard/deebo/knowledge");
        router.refresh();
      } else toast.error(r.message);
    });
  };

  return (
    <>
      <PageHeader title={editing ? "تحرير الواقعة" : "واقعة جديدة"} crumbLeaf={editing ? "تحرير" : undefined} />

      <div className="form-build">
        <SectionCard headerVariant="chip" icon={<IconDeebo />} title="ما يعرفه ديبو">
          <div className="form-grid">
            <Field
              className="form-full"
              label="العنوان"
              icon={<TextT />}
              innerIcon={<PencilSimple />}
              placeholder="مثال: أين أديب"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              className="form-full"
              label="النصّ"
              icon={<ChatText />}
              innerIcon={<TextT />}
              placeholder="اكتبها جملةً أو جملتين، كما يقولها ديبو لسائله"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
            {hasDigits(`${title} ${body}`) ? (
              <Alert className="form-full" tone="warning" title="فيها رقم" compact>
                إن كان ثابتًا لا يتبدّل فدعه، وإن كان عددًا يزيد أو تاريخًا يمضي فامحُه:
                ديبو يقول ما هنا حرفيًّا بعد سنة.
              </Alert>
            ) : null}
            <Switch
              className="form-full"
              row
              label="يقولها ديبو"
              description="الموقوفةُ تبقى محفوظةً هنا ولا تدخل معرفته."
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </div>
        </SectionCard>
      </div>

      <SaveBar open={dirty} message={editing ? undefined : "واقعةٌ لم تُضَف بعد"}>
        <Button variant="primary" size="md" loading={saving} onClick={save}>
          {editing ? "حفظ التغييرات" : "إضافة الواقعة"}
        </Button>
      </SaveBar>
    </>
  );
}
