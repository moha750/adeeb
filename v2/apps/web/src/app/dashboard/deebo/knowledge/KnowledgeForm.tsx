"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Textarea } from "@adeeb/design-system";
import { ChatCenteredText, ChatText, FloppyDisk, TextT } from "@phosphor-icons/react";
import { Eye, EyeSlash, PencilSimple, Plus } from "@/app/_components/glyphs";
import { IconDeebo } from "../../_shell/icons";
import { useToast } from "../../_components/ToastProvider";
import type { FactEditData } from "./data";
import { createFact, updateFact, type FactInput } from "./actions";
import { AdBadge, AdCard, AdNote } from "@/app/_ad/primitives";
import { FormRoom, FormSection, FormToggle } from "@/app/_ad/form";

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

  /* أثمّة ما يُحفَظ؟ — في التحرير لا يُحفظ قبل أوّل تغيير، وفي الضيّق يلحقك الفعلُ حين يوجد (`FormRoom`)، والمقارنةُ بلَقطةِ `toInput()`
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

  /* التذكرةُ كما ستظهر في غرفة المعرفة (`_ad/rooms/DeeboKnowledgeRoom`): الحالُ شارتُها («يقولها» أو «موقوفة»)، والنصُّ سطرُها */
  const preview = (
    <div className="ad-form-preview-card" data-untitled={title.trim() ? undefined : ""}>
      <AdCard seed={fact?.id ?? "new-fact"} title={title.trim() || "العنوان"}
        chips={isActive ? <AdBadge tone="ok" icon={<Eye />}>يقولها</AdBadge> : <AdBadge icon={<EyeSlash />}>موقوفة</AdBadge>}
        meta={[body.trim() ? { icon: <ChatCenteredText />, text: body.trim() } : { icon: <ChatCenteredText />, text: "النصّ لم يُكتب", tone: "muted" }]} />
    </div>
  );

  return (
    <FormRoom
      title={editing ? "تحرير الواقعة" : "واقعة جديدة"}
      preview={preview}
      commit={{
        primary: editing
          ? { label: "حفظ التغييرات", icon: <FloppyDisk />, onClick: save, busy: saving, held: !dirty }
          : { label: "إضافة الواقعة", icon: <Plus />, onClick: save, busy: saving },
        cancelHref: "/dashboard/deebo/knowledge",
        dirty,
      }}
    >
      <FormSection id="fact" icon={<IconDeebo />} title="ما يعرفه ديبو">
        <div className="form-grid">
          <Field
            className="form-full"
            label="العنوان"
            icon={<TextT />}
            innerIcon={<PencilSimple />}
            placeholder="مثال: أين أدِيب"
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
          {/* التنبيهُ بلغة الغرف (`AdNote`) لا `Alert` القديم: صفحةُ النموذج غرفة */}
          {hasDigits(`${title} ${body}`) ? (
            <div className="form-full">
              <AdNote tone="warn" label="فيها رقم">
                إن كان ثابتًا لا يتبدّل فدعه، وإن كان عددًا يزيد أو تاريخًا يمضي فامحُه: ديبو يقول ما هنا حرفيًّا بعد سنة.
              </AdNote>
            </div>
          ) : null}
          <FormToggle
            className="form-full"
            icon={<IconDeebo />}
            label="يقولها ديبو"
            description="الموقوفةُ تبقى محفوظةً هنا ولا تدخل معرفته."
            checked={isActive}
            onChange={setIsActive}
          />
        </div>
      </FormSection>
    </FormRoom>
  );
}
