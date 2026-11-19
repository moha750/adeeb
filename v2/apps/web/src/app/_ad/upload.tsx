"use client";

/**
 * **حقلُ الرفع** (اعتمده محمد ٢٠٢٦-١١-١٣: «مو حيل عجبني ولكنه مقبول») — حقلُ الصورة الواحد في كلّ نماذج البوابة: غلافُ الفعاليّة،
 * صورةُ العمل، غلافُ الخبر، إضافةُ صور المعرض، شعارُ الراعي. كان فارغُه قطعةً كبيرةً من اللوح الكحليّ تزاحم لوحَ الغرفة.
 * - **فارغًا: منطقةُ إفلاتٍ بحدٍّ متقطّع** (ذوقُه: «الحدّ مقسّم أو كذا مقطع… والأيقونة في النصف للإفلات والإدراج») في جسم القسم
 *   لا على حدّه («لا تجعل هذا المنقّط يصل إلى الهيدر»)، ورمزُ الرفع الكحليّ في وسطها، ثمّ جملتاها، ثمّ الصيغُ والحدّ سطرًا ثالثًا.
 *   والمنطقةُ كلُّها زرُّ الاختيار، فلا «اختيار» في رأس القسم.
 * - **بصورة والحقلُ هو القسم (`bare`)**: الصورةُ وحدها بنسبتها، و«تغيير» و«إزالة» في رأس القسم، ولا صفَّ «الصورة الحاليّة» (طلبُه).
 * - **بصورة بجانب حقولٍ أخرى** (شعارُ الراعي): يبقى في بئره، صفُّه الأعلى اسمُه وفعلاه، والصورةُ تحته.
 * ويقبل الإفلات على الحقل كلّه، ويقول «أفلتها هنا» حين يُسحب ملفٌّ فوقه، ويدور حين يُرفع.
 * (جُرّب معه «السطر» — الصورةُ مصغّرةً في سطرٍ كسطور «حسابي» — وفارغٌ بنسبة الصورة عليه النقش، وسقطا.)
 */
import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSectionSlots } from "./slots";
import { FieldMark } from "@adeeb/design-system";
import { ArrowsClockwise, Plus, Trash, UploadSimple } from "@/app/_components/glyphs";
import { AdButton } from "./primitives";
import { DashEdge } from "./dash";

export function AdUpload({
  label, icon, required, value, onFile, onFiles, onClear, busy, shape = "wide", help, error, accept, alt, bare, unlabeled, multiple, add, dry, dragging, file: picked, noun = "image", whole,
}: {
  label: string;
  icon: ReactNode;
  required?: boolean;
  value: string | null;
  onFile?: (file: File) => void;
  /** صورٌ كثيرةٌ معًا (منطقةُ إضافة المعرض) */
  onFiles?: (files: File[]) => void;
  onClear?: () => void;
  busy?: boolean | number;
  shape?: "wide" | "square";
  help?: string;
  error?: string;
  accept: string;
  alt: string;
  /** الحقلُ هو القسم: اسمُه عنوانُ القسم، فلا يُكرَّر في الحقل، وفعلاه في رأس القسم */
  bare?: boolean;
  /** القسمُ يسمّي الحقلَ ويحمل علامتَه (`FormSection mark`)، فلا يُكتب فوق منطقة الإفلات اسمٌ يكرّره ولا «(اختياريّ)» ثانية؛
   *  وصفُّ الملفّ المختار يبقى باسمه بلا علامة (محمد ٢٠٢٦-١١-١٩: «الملف (اختياري)» فوق «ملفّك الانتخابي»). */
  unlabeled?: boolean;
  multiple?: boolean;
  /** منطقةُ «إضافة» في آخر قائمة (المعرض): بلا قيمة */
  add?: boolean;
  /** مختبر: الصورةُ المختارةُ تُعرض محلّيًّا ولا تُرفع */
  dry?: boolean;
  /** مختبر: حالُ السحب ثابتًا ليُرى في صفحة الحالات */
  dragging?: boolean;
  /**
   * **ملفٌّ لا صورة** (وجهةُ الباركود: صورةٌ أو PDF، ٢٠٢٦-١١-١٤): المختارُ يُقال باسمه وحجمه في صفّ البئر، ولا معاينة إن لم يكن صورة —
   * الحقلُ نفسُه بحالاته (الإفلات، والسحب، والرفع)، لا زرُّ مرفقٍ من الهويّة القديمة بجانبه
   */
  file?: { name: string; meta: string; icon: ReactNode } | null;
  /** ما يُرفع: صورةٌ (الافتراض) أو ملفٌّ (صورةٌ أو PDF) — فتقول جملُ الحقل «الملف» لا «الصورة» */
  noun?: "image" | "file";
  /** الصورةُ كاملةً في معاينتها لا مقصوصةً بنسبة الغلاف: ما يراه من يمسح الباركود يُرى كلُّه (ملصقٌ قائمٌ يُقصّ نصفُه في 16:9) */
  whole?: boolean;
}) {
  const id = useId();
  const slots = useSectionSlots();
  const input = useRef<HTMLInputElement>(null);
  const [dragOn, setDrag] = useState(false);
  const drag = dragOn || !!dragging;
  const [local, setLocal] = useState<string | null>(null);
  useEffect(() => () => { if (local) URL.revokeObjectURL(local); }, [local]);
  const shown = add ? null : dry ? local ?? value : value;
  /* التركيزُ لا يسقط إلى أوّل الصفحة: الزرُّ الذي نُقر يغيب مع تبدّل الحال (المنطقةُ ← «تغيير»، «إزالة» ← المنطقة)، فيُنقل إلى بديله */
  const root = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  // **الممتلئُ صورةٌ أو ملفّ** (المراجع ٢٠٢٦-١١-١٧): كان يُقاس بالصورة وحدها، فاختيارُ PDF يبدّل المنطقةَ بصفّه والتركيزُ يسقط إلى أوّل الصفحة
  const full = !!(shown || picked);
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    const where = full ? (bare && slots.head ? slots.head : root.current) : root.current;
    where?.querySelector<HTMLElement>(full ? ".ad-up-acts .ad-btn" : ".ad-drop")?.focus();
  }, [full, bare, slots.head]);
  // والمرفوضُ لا يبدّل شيئًا: يُنسى طلبُ النقل، وإلّا خطف التركيزَ تبدّلٌ لاحقٌ لا صلةَ له بالنقر
  useEffect(() => { if (error) refocus.current = false; }, [error]);
  const working = !!busy;
  const take = (list: File[]) => {
    if (!list.length || working) return;
    if (!add) refocus.current = true;
    if (dry && !add) { setLocal(URL.createObjectURL(list[0])); return; }
    if (multiple && onFiles) onFiles(list); else onFile?.(list[0]);
  };
  const clear = () => { refocus.current = true; if (dry) setLocal(null); onClear?.(); };
  const pick = () => { if (!working) input.current?.click(); };
  const isFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");
  const over = (e: DragEvent) => { if (!isFiles(e)) return; e.preventDefault(); if (!working) setDrag(true); };
  const leave = (e: DragEvent) => { if (e.currentTarget.contains(e.relatedTarget as Node | null)) return; setDrag(false); };
  const drop = (e: DragEvent) => { if (!isFiles(e)) return; e.preventDefault(); setDrag(false); take(Array.from(e.dataTransfer.files ?? [])); };
  const say = error ?? help;
  const busyText = typeof busy === "number" && busy > 1 ? `تُرفع ${busy} صور` : noun === "file" ? "يُرفع الملف" : "تُرفع الصورة";
  const state = working ? busyText : drag ? "أفلتها هنا" : null;
  const spin = <span className="ad-spin" aria-hidden />;

  const acts = (
    <span className="ad-up-acts">
      {/* الاسمُ في غلافه: في الضيّق يُخفى عن العين ويبقى اسمَ الزرّ (`.ad-up-act-t`) */}
      <AdButton variant="line" size="sm" icon={<ArrowsClockwise />} onClick={pick} held={working}><span className="ad-up-act-t">تغيير</span></AdButton>
      {onClear ? <AdButton variant="danger" size="sm" icon={<Trash />} onClick={clear} held={working}><span className="ad-up-act-t">إزالة</span></AdButton> : null}
    </span>
  );
  const file = (
    <input ref={input} type="file" accept={accept} multiple={multiple} hidden tabIndex={-1}
      onChange={(e) => { const l = Array.from(e.target.files ?? []); e.target.value = ""; take(l); }} />
  );
  const common = {
    "data-look": "a", "data-shape": shape, "data-full": shown || picked ? "" : undefined, "data-drag": drag || undefined,
    "data-busy": working || undefined, "data-whole": whole || undefined, "data-err": error ? "" : undefined, "data-bare": bare || undefined, "data-add": add || undefined,
    onDragOver: over, onDragLeave: leave, onDrop: drop,
  };
  const view = shown ? (
    <figure className="ad-up-view">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shown} alt={alt} referrerPolicy="no-referrer" />
      {/* الاستبدالُ يُرفع بمربّع الرفع نفسِه وجملتِه، كرفع أوّل صورة */}
      {working ? <span className="ad-up-busy" role="status"><span className="ad-drop-ic" aria-hidden>{spin}</span><span className="ad-drop-t">{busyText}</span></span> : null}
    </figure>
  ) : null;

  // **منطقةُ الإفلات**: الحدُّ المتقطّع يقول «هنا مكانٌ يُملأ» لا «هنا صندوق». وفي الجوّال لا سحبَ ولا إفلات: جملتُه وحدها (`.ad-drop-touch`)
  if (!shown && !picked) {
    const many = add || multiple;
    return (
      <div ref={root} className="ad-up form-full" {...common}>
        {bare || add || unlabeled ? null : <span className="ad-up-k">{label}<FieldMark required={required} optional={!required} /></span>}
        <button type="button" className="ad-drop" onClick={pick} disabled={working} aria-describedby={say ? `${id}-h` : undefined}
          aria-label={state ?? (add ? "إضافة صور" : `اختيار ${label}`)}>
          {/* الحدُّ المقطّعُ قطعةُ الهويّة الواحدة (`DashEdge`)، ويمشي هنا حين يُسحب ملفٌّ فوقه */}
          <DashEdge />
          <span className="ad-drop-ic" aria-hidden>{working ? spin : add ? <Plus /> : <UploadSimple />}</span>
          {/* الأسطرُ كلُّها باقيةٌ في كلّ حال، ويتبدّل نصُّ الأوّل وحده («أفلتها هنا»، «تُرفع الصورة») ويُخفى الباقي بلا أن يُنزع — كان
              يُنزع، فتصغر المنطقةُ تحت المؤشّر 34px ساعةَ الإفلات ويقفز ما تحتها، ويغيب الحدُّ ساعةَ الحاجة إليه (المراجع ٢٠٢٦-١١-١٣) */}
          <span className="ad-drop-t ad-drop-mouse" role={working ? "status" : undefined}>{state ?? (many ? "اسحب الصور إلى هنا" : noun === "file" ? "اسحب الملف إلى هنا" : "اسحب الصورة إلى هنا")}</span>
          <span className="ad-drop-t ad-drop-touch" role={working ? "status" : undefined}>{state ?? <span className="ad-drop-a">{many ? "اختر الصور من جهازك" : noun === "file" ? "اختر ملفًّا من جهازك" : "اختر صورة من جهازك"}</span>}</span>
          {/* الاختيارُ يُقرأ فعلًا بلونه وثقله: هو ما يفعله أكثرُ الناس، فلا يكون همسًا رماديًّا تحت جملة السحب */}
          <span className="ad-drop-s ad-drop-mouse" data-off={state ? "" : undefined}>أو <span className="ad-drop-a">{noun === "file" && !many ? "اختره من جهازك" : "اخترها من جهازك"}</span></span>
          {/* الصيغُ والحدّ سطرُها الثالث داخلها — خارجَها بدا هامشًا للصفحة لا وصفًا للحقل، ويغيب بعد الاختيار. والرفضُ يُعلَن لقارئ
              الشاشة حين يظهر (كان مربوطًا بالوصف وحده، فلا يُقال شيء) */}
          {say ? <span className="ad-drop-h" id={`${id}-h`} role={error ? "alert" : undefined}>{say}</span> : null}
        </button>
        {file}
      </div>
    );
  }

  // **الحقلُ هو القسم**: الفعلان في رأس القسم، والجسمُ الصورةُ وحدها. وقبل أن يُعرف الرأسُ (أوّلُ رسمٍ من الخادم) لا فعلَ يُرسم
  // في مكانٍ آخر — كان يُرسم صفُّ «الصورة الحاليّة» لحظةً ثمّ يختفي
  if (bare) {
    return (
      <div ref={root} className="ad-up form-full" {...common}>
        {slots.head ? createPortal(acts, slots.head) : null}
        <div className="ad-up-well">{view}</div>
        {file}
      </div>
    );
  }

  return (
    <div ref={root} className="ad-up form-full" {...common}>
      <div className="ad-up-well">
        <div className="ad-up-row">
          <span className="ad-up-ic" aria-hidden>{working ? spin : picked ? picked.icon : icon}</span>
          <span className="ad-up-t">
            <span className="ad-up-k">{label}{unlabeled ? null : <FieldMark required={required} optional={!required} />}</span>
            <span className="ad-up-v" data-full="">{state ?? (picked ? picked.name : dry && local ? "صورةٌ جديدة" : "الصورة الحاليّة")}</span>
            {picked && !state ? <span className="ad-up-meta">{picked.meta}</span> : null}
          </span>
          {acts}
        </div>
        {view}
      </div>
      {/* وصفُ الملفّ تحت صفّه («الملفّ الحاليّ باقٍ…» والصيغ): كان يغيب حين يُختار ملفٌّ وكان القديمُ يقوله (المراجع ٢٠٢٦-١١-١٧) */}
      {picked && say ? <span className="ad-up-help" role={error ? "alert" : undefined}>{say}</span> : null}
      {file}
    </div>
  );
}
