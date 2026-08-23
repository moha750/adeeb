"use client";

import { useCallback, useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { Megaphone } from "@phosphor-icons/react";
import { ArrowUUpLeft, Eye, EyeSlash, PencilSimple, Trash } from "@/app/_components/glyphs";
import { PageHeader } from "../../dashboard/_components/PageHeader";
import type { MenuGroup } from "../../dashboard/_components/DropdownMenu";
import type { CrumbStep } from "../../dashboard/_shell/crumb";

/**
 * معرضُ رأس الصفحة — **الرأسُ المُقَرّ وحدَه** (٢٠٢٦-٠٨-٢٢).
 *
 * كان يعرض الجيلَ الثاني إلى جانبه للمقارنة، فطلب المالك إفرادَه (٢٠٢٦-٠٨-٢٢): «أرى
 * جيلين فأتشتّت». والمقارنةُ محفوظةٌ حيث تنفع: متحفُ «قبل وبعد» في `/ui/page-header`،
 * والدفترُ منظورًا في `/ui/page-header/ledger`. أمّا هذه فصفحةُ **ضبطٍ**: شكلٌ واحدٌ
 * يُنظر إليه ويُعدَّل.
 *
 * وترتيبُه بكلمة المالك: صفٌّ للملاحة، وصفٌّ للاسم وحاله، وصفٌّ للفعل. والإطاراتُ
 * تُمرَّر بالإصبع أو بالعجلة، فيُرى التكثّفُ عند بدء العمل.
 */

const WIDTHS = [
  { value: "390", label: "جوّال ٣٩٠" },
  { value: "430", label: "جوّال كبير" },
  { value: "768", label: "لوح" },
  { value: "1100", label: "سطح مكتب" },
];

const STATES = [
  { value: "draft", label: "مسودّة" },
  { value: "live", label: "منشور" },
];

const TITLES = [
  { value: "short", label: "عنوانٌ قصير" },
  { value: "long", label: "عنوانٌ طويل" },
];

const TITLE_TEXT: Record<string, string> = {
  short: "مجلّة أديب، العدد الثالث",
  long: "مجلّة أديب، العدد الثالث: ملفُّ الشعر الحديث في المنطقة الشرقيّة",
};

const CRUMB = (leaf: string): CrumbStep[] => [
  { kind: "link", label: "بوّابة أديب", href: "#" },
  { kind: "link", label: "المحتوى", href: "#" },
  { kind: "link", label: "إدارة الموقع", href: "#" },
  { kind: "link", label: "إرثٌ يُروى", href: "#" },
  { kind: "leaf", label: leaf },
];

const MENU_DRAFT: MenuGroup[] = [
  { items: [{ label: "معاينة المنشور", icon: <Eye /> }] },
  { danger: true, items: [{ label: "حذف المنشور", icon: <Trash />, danger: true }] },
];

const MENU_LIVE: MenuGroup[] = [
  { items: [{ label: "معاينة المنشور", icon: <Eye /> }, { label: "تحرير", icon: <PencilSimple /> }] },
  { danger: true, items: [{ label: "حذف المنشور", icon: <Trash />, danger: true }] },
];

const BODY =
  "اسحب صور الصفحات هنا، أو اخترها من جهازك. الصفحةُ الأولى هي الغلاف، وترتيبُ ما بعدها ترتيبُ القراءة. ولا تُنشَر مجلّةٌ ناقصةُ الغلاف. راجع الصفحات قبل النشر، فالرابطُ يخرج إلى الناس ولا يُسحَب. وللمجلّة فهرسٌ يُبنى من عناوين الصفحات، وللقارئ سحبٌ بالإصبع. والصفحاتُ تُرتَّب بالسحب، وتُحذف بالمفتاح، وتُستبدل بالإفلات فوقها. ولا يُحفَظ الترتيبُ حتى تقول احفظ.";

/** يقيس ارتفاع الرأس الساكن — رقمٌ محسوبٌ يتبع تبدّل العرض، لا مقدَّر */
function useHeight(): [number, (el: HTMLDivElement | null) => void] {
  const [h, setH] = useState(0);
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const target = el.querySelector(".phn");
    if (!target) return;
    const apply = () => setH(Math.round(target.getBoundingClientRect().height));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(target);
  }, []);
  return [h, ref];
}

function Frame({
  tag,
  note,
  fill = true,
  children,
}: {
  tag: string;
  note?: string;
  fill?: boolean;
  children: React.ReactNode;
}) {
  const [h, ref] = useHeight();
  return (
    <div className="phnlab-col">
      <div className="phdlab-tag">
        <span className="dot" aria-hidden />
        {tag}
        <span className="h">{h ? h + "px" : ""}</span>
      </div>
      {/* الرأسُ ابنٌ مباشرٌ للمُمرِّر: اللاصقُ محبوسٌ في صندوق أبيه، فلو لُفّ في غلافِ
          قياسٍ يحضنه لم يجد مدًى يتحرّك فيه. */}
      <div className="phnlab-frame" ref={ref}>
        {children}
        {fill ? <div className="phnlab-fill">{BODY}</div> : null}
      </div>
      {note ? <p className="phnlab-note">{note}</p> : null}
    </div>
  );
}

export default function PageHeaderNextLab() {
  const [w, setW] = useState("390");
  const [st, setSt] = useState("draft");
  const [t, setT] = useState("short");
  const title = TITLE_TEXT[t];
  const live = st === "live";

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Page Header</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">الرأسُ الجامع</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          ثلاثةُ صفوفٍ على الجوّال: صفٌّ للملاحة، وصفٌّ للاسم وحاله، وصفٌّ للفعل. والمسارُ
          كاملٌ يُسحَب بالإصبع ولا يُقصّ منه مقطع. وعلى الشاشة الواسعة يعود الفعلُ إلى جوار
          الاسم. مرّر داخل الإطار لترى الرأسَ يتكثّف جزيرةً بصفٍّ واحد.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-content-muted">العرض:</span>
            <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض الإطار" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-content-muted">الحال:</span>
            <Segmented items={STATES} value={st} onValueChange={setSt} aria-label="حال السجلّ" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-content-muted">العنوان:</span>
            <Segmented items={TITLES} value={t} onValueChange={setT} aria-label="طول العنوان" />
          </div>
        </div>
      </Container>

      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="phnlab mt-12" style={{ ["--phnlab-w" as string]: w + "px" }}>
          <Frame
            tag="رأسُ سجلّ"
            note="الحالُ تتبدّل بالمبدّل أعلاه: المسودّةُ فعلُها «نشر» أساسيًّا، والمنشورُ فعلُه العكسيُّ مسمًّى لا مطويًّا في النقاط."
          >
            <PageHeader
              title={title}
              parent={{ label: "إرثٌ يُروى", href: "#" }}
              crumb={CRUMB(title)}
              status={{ label: live ? "منشور" : "مسودّة", tone: live ? "success" : "warning" }}
              action={
                live
                  ? { label: "إلغاء النشر", icon: <EyeSlash size={18} />, kind: "reverse", onClick: () => {} }
                  : { label: "نشر", icon: <Megaphone size={18} />, onClick: () => {} }
              }
              menu={live ? MENU_LIVE : MENU_DRAFT}
            />
          </Frame>

          <Frame
            tag="رأسٌ بلا فعل"
            note="واحدٌ وثمانون رأسًا من تسعةٍ وتسعين في اللوحة هكذا: مسارٌ واسمٌ ولا فعل. والورقةُ الأخيرةُ تسقط وحدَها حين تساوي العنوان."
          >
            <PageHeader
              title="مهامّي"
              crumb={[
                { kind: "link", label: "بوّابة أديب", href: "#" },
                { kind: "link", label: "التفاعل", href: "#" },
                { kind: "leaf", label: "مهامّي" },
              ]}
            />
          </Frame>

          <Frame
            tag="شاشةُ مرحلة"
            note="محرّرُ الخبر: فعلُ المرحلة واحدٌ ظاهر، وما دونه في النقاط مرتّبًا: الإرجاعُ أوّلًا لأنّه الفعلُ المضادّ، ثمّ ما ليس من المرحلة."
          >
            <PageHeader
              title="أديب يفتتح موسمَه الثقافيّ"
              parent={{ label: "غرفة التحرير", href: "#" }}
              crumb={[
                { kind: "link", label: "بوّابة أديب", href: "#" },
                { kind: "link", label: "المحتوى", href: "#" },
                { kind: "link", label: "غرفة التحرير", href: "#" },
                { kind: "leaf", label: "أديب يفتتح موسمَه الثقافيّ" },
              ]}
              status={{ label: "ينتظر المراجعة", tone: "info" }}
              action={{ label: "نشر", icon: <Megaphone size={18} />, onClick: () => {} }}
              menu={[
                { items: [{ label: "إعادة بملاحظة", icon: <ArrowUUpLeft /> }] },
                { items: [{ label: "معاينة الخبر", icon: <Eye /> }, { label: "تمييز الخبر" }] },
                { danger: true, items: [{ label: "حذف الخبر", icon: <Trash />, danger: true }] },
              ]}
            />
          </Frame>
        </div>
      </div>
    </main>
  );
}
