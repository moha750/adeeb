"use client";

import { Button, Field, Modal, Switch } from "@adeeb/design-system";
import { TextT } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import type { AnnouncementRow } from "./data";

/** حدُّ القاعدة نفسُه، يُعَدّ وهو يكتب فلا يُفاجئه الردُّ بعد الحفظ. */
export const MAX = 120;

/** ما تُحرّره النافذة: إعلانٌ جديد، أو صفٌّ قائم. */
export type Editing = { kind: "new" } | { kind: "edit"; row: AnnouncementRow };

/**
 * محرّر الإعلان — **نافذةٌ لا صفحة** (قرارُ المالك ٢٠٢٦-٠٩-١٩ بعد أن سألني رأيي).
 *
 * والقاعدةُ التي جرى عليها الحكم: **صفحةٌ لسجلٍّ ذي أقسام، ونافذةٌ لحقل.** والإعلانُ
 * حقلٌ واحدٌ ومزلاجٌ واحد، فصفحةٌ كاملةٌ برأسٍ وفتاتِ مسارٍ وشريطِ حفظٍ تجعل تحريرَ
 * جملةٍ أربعَ انتقالات. وربحٌ ثانٍ خاصٌّ بهذه الغرفة: الإعلاناتُ تُقرأ متتابعةً في
 * شريطٍ واحد، فكتابةُ واحدٍ وأخواتُه ظاهرةٌ خلف النافذة تضبط نَفَسها ونبرتها.
 * وأخواتُها الأربعُ (الأعمال · الإحصاءات · الرعاة · الأسئلة) تبقى صفحاتٍ حتّى يُطلَب
 * تحويلُها: التماثلُ في القاعدة لا في الشكل.
 *
 * **ومُتحكَّمٌ به كأخيه `SupervisionModal`:** القيمُ يملكها المستدعي لا النافذة، فلا
 * تُهيَّأ حالةٌ من `props` في أثرٍ يسبق الفتح، ولا تُفقَد حركةُ الخروج بإخفاء العنصر.
 */
export function AnnouncementModal({
  editing,
  text,
  onText,
  isActive,
  onActive,
  busy,
  onClose,
  onSubmit,
}: {
  editing: Editing | null;
  text: string;
  onText: (v: string) => void;
  isActive: boolean;
  onActive: (v: boolean) => void;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  /* **العدّادُ يصعد إلى ١٢٠ ولا ينزل إلى صفر** (أمرُ المالك ٢٠٢٦-٠٩-١٩): كان يقول
     «بقي ٦٠ محرفًا» فيعدّ ما تبقّى، فصار يقول ما كُتب. و«بقي» سقطت لأنّها صارت
     تكذب على الرقم.
     **والمعدودُ بعد السقف لا بعد المتغيّر، ومجرّدٌ من التنوين** (صيغةُ المالك
     حرفًا ٢٠٢٦-٠٩-١٩: «110 من 120 حرف»): الرقمُ الصاعدُ يمرّ على الواحد والاثنين
     في أوّل ما يُكتَب، فلو لحق المعدودُ المتغيّرَ لَقرأ الكاتبُ «١ حرف» مع كلّ
     ضغطة. */
  const used = text.trim().length;
  const left = MAX - used;
  const empty = used < 2;

  return (
    <Modal
      open={editing !== null}
      onClose={onClose}
      busy={busy}
      title={editing?.kind === "edit" ? "تحرير الإعلان" : "إعلان جديد"}
      description="يمرّ في شريط الصفحة الرئيسية"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>إلغاء</Button>
          <Button
            variant="primary"
            size="md"
            loading={busy}
            disabled={empty || left < 0}
            onClick={onSubmit}
          >
            {editing?.kind === "edit" ? "حفظ التغييرات" : "إضافة الإعلان"}
          </Button>
        </>
      }
    >
      {/* حقلُ سطرٍ واحد لا مساحةُ نصّ: الشريطُ سطرٌ يجري، والمساحةُ تَعِد بسطرٍ
          ثانٍ لا يُرسَم. والعدّادُ يقول ما كُتب من حدّ القاعدة، صاعدًا إليه. */}
      <Field
        label="نصّ الإعلان"
        icon={<TextT />}
        innerIcon={<PencilSimple />}
        placeholder="مثال: وما زالت الحكاية تُكتب"
        helper={left >= 0 ? `${used} من ${MAX} حرف` : undefined}
        error={left < 0 ? `تجاوزت الحدّ بـ ${Math.abs(left)} حرف` : undefined}
        value={text}
        onChange={(e) => onText(e.target.value)}
        required
      />
      {/* **والمزلاجُ لا يُعرَض عند الإنشاء** (أمرُ المالك ٢٠٢٦-٠٩-٢٤): «الذي
          سينشئ يريد نشره أكيد». وهو كذلك، وسؤالُه في تلك اللحظة سؤالٌ جوابُه
          معروفٌ سلفًا، يزيد خطوةً ويوهم أنّ ثَمَّ قرارًا. فالجديدُ يولد في
          الشريط (وعنوانُ النافذة يقوله: «يمرّ في شريط الصفحة الرئيسية»)،
          والإطفاءُ فعلٌ يُتَّخذ بعدُ: من الكرت بمزلاجه، أو من هذه النافذة حين
          تُفتَح للتحرير. */}
      {editing?.kind === "edit" ? (
        <Switch
          row
          label="يمرّ في الشريط"
          description="المُطفَأُ يبقى محفوظًا هنا ولا يراه زوار الموقع."
          checked={isActive}
          onChange={(e) => onActive(e.target.checked)}
        />
      ) : null}
    </Modal>
  );
}
