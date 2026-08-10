"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Accordion, Button, ModalSectionHeading, Modal } from "@adeeb/design-system";
import { Compass } from "@phosphor-icons/react";
import { Question } from "@/app/_components/glyphs";
import { IconLife } from "./icons";

// المحتوى مصدرٌ واحد هنا — نصوصٌ مُتحقّقة من واقع اللوحة (أقسام القائمة · حالات العضويّة)،
// لا وعودَ بميزات غير موجودة. يتوسّع أو يُربَط بدليلٍ حقيقيّ حين يُقرّ.
const GUIDES: { q: string; a: ReactNode }[] = [
  {
    q: "التنقّل في اللوحة",
    a: "القائمة الجانبيّة مقسومة إلى: «العضوية» لإدارة الأعضاء، و«التفاعل» للفعاليّات والاستبيانات والانتخابات، و«المحتوى» لما يظهر في الصفحة الرئيسيّة، و«النظام» للصلاحيّات وإحصاءات الزوّار.",
  },
  {
    q: "طيّ الشريط الجانبيّ",
    a: "اضغط المقبض على حافّة الشريط ليطوي القائمة إلى أيقونات فتتّسع مساحة العمل؛ ويُحفظ اختيارك للزيارات القادمة.",
  },
  {
    q: "إدارة محتوى الصفحة الرئيسيّة",
    a: "من قسم «المحتوى» تُضيف وتُرتّب وتحذف الأعمال والإحصاءات والرعاة والأسئلة الشائعة والمكتبة، كلٌّ من مجلده.",
  },
  {
    q: "متابعة الأعضاء وحالاتهم",
    a: "من قسم «العضوية»: «نشط» للفاعلين، و«موقوف» لمن انتهت عضويّته. افتح أيّ عضو لعرض ملفّه كاملًا.",
  },
];

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "ماذا تعني حالات العضويّة؟",
    a: "«نشط»: عضوٌ قائمة عضويّته. «موقوف»: عضويّةٌ منتهية. «غير نشط»: حسابٌ خامل لا يظهر إلّا في «كل الأعضاء». ومن نقص سجلُّه يُطالَب بإكماله عند دخوله لا بحالةٍ تُوسَم بها عضويّته.",
  },
  {
    q: "أين أجد بيانات دخول الأعضاء؟",
    a: "من قسم «العضوية» ← «بيانات الدخول».",
  },
  {
    q: "أين أرى إحصاءات زوّار الموقع؟",
    a: "من قسم «النظام» ← «إحصائيّات الزوّار».",
  },
  {
    q: "كيف أسجّل الخروج؟",
    a: "من زرّ الخروج في أعلى الشريط العلويّ، بجانب الإشعارات.",
  },
  {
    q: "أحتاج مساعدة إضافيّة؟",
    a: "لأيّ استفسار أو صلاحيّة لا تملكها، تواصل مع مسؤول النظام في النادي.",
  },
];

/**
 * مركز المساعدة — زناد تذييل الشريط الجانبيّ ونافذته.
 * الزرّ يحمل أصناف `.ash-foot` نفسها (فيتبع طيّ الريّل)، والنافذة تُركَّب من مكوّنات المكتبة
 * وحدها (Modal · ModalSectionHeading · Accordion · Button) — بلا تنسيقٍ شارد.
 */
export function HelpCenter() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="ash-foot" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="ash-fic"><IconLife /></span>
        <span className="ash-ftx"><b>مركز المساعدة</b><span>أدلّة وأسئلة شائعة</span></span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="مركز المساعدة"
        description="أدلّة سريعة وأسئلة شائعة حول استخدام بوّابة أديب."
        size="md"
        footer={<Button variant="ghost" onClick={() => setOpen(false)}>إغلاق</Button>}
      >
        <ModalSectionHeading icon={<Compass />} title="أدلّة سريعة" />
        <Accordion items={GUIDES} />
        <ModalSectionHeading icon={<Question />} title="أسئلة شائعة" />
        <Accordion items={FAQS} />
      </Modal>
    </>
  );
}
