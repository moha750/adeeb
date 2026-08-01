import { cn } from "../lib/cn";

export interface LogoLoaderProps {
  /** الاتّجاه: الرأسيّ للشاشة الكاملة (بدء الموقع)، والأفقيّ للتنقّل داخل الصفحة. */
  orientation?: "vertical" | "horizontal";
  /** عرضُ الشعار — الارتفاع يتبعه بنسبة الأصل (`aspect-ratio`)، فلا يُمرَّر. */
  size?: number;
  /** طبقةٌ ثابتة تغطّي النافذة (شاشة البدء) بدل كتلةٍ في التدفّق (تحميل التنقّل). */
  fixed?: boolean;
  /** نصُّ قارئ الشاشة — الشعارُ صامتٌ بصريًّا، والحالةُ تُقال هنا. */
  label?: string;
  /** انزياحُ الطبقة الثابتة (تلاشٍ + رفعُ التقاطِ الفأرة) — لشاشة البدء وحدها. */
  dismissed?: boolean;
  /** أدنى ارتفاعٍ يتوسّطه الشعار (`--ldr-min`) — الافتراض `62vh`. */
  minHeight?: string;
  className?: string;
}

/**
 * شاشةُ التحميل — **الشعارُ نفسُه هو المؤشّر**، لا دائرةٌ تدور.
 *
 * طبقتان فوق بعضهما بمقاسٍ واحد: **شعارٌ شبحٌ** باهت (الصورة الحقيقيّة من
 * `public/brand`، فالهويّة حاضرةٌ ولو سكن كلُّ شيء)، و**وهجٌ** يصعد فيه من أسفله
 * إلى أعلاه — قناعُه شكلُ الشعار نفسِه، فلا يفيض عن حدوده حرفًا. يُقرأ «يتنفّس
 * ويمتلئ» لا «يدور»، ولا يحتاج جافاسكربت: الحركةُ CSS خالصة، فتعمل في `loading.tsx`
 * الخادميّة وفي شاشة البدء قبل الترطيب معًا.
 *
 * **الاتّجاهان ليسا ذوقًا:** الرأسيّ (674×1080) يملأ شاشةً فارغة، والأفقيّ
 * (1841.8×1080) لا يزيح محتوى اللوحة عند التنقّل بين تبويباتها.
 */
export function LogoLoader({
  orientation = "vertical",
  size,
  fixed = false,
  label = "جارٍ التحميل…",
  dismissed = false,
  minHeight,
  className,
}: LogoLoaderProps) {
  const src = orientation === "vertical" ? "/brand/logo-vertical.svg" : "/brand/logo-horizontal.svg";

  // الرمزان يُضبطان على الجذر: `--ldr-sz` يُورَّث إلى `.ldr-mark`، والسطريُّ يغلب الصنف.
  const vars: Record<string, string> = {};
  if (size) vars["--ldr-sz"] = `${size}px`;
  if (minHeight) vars["--ldr-min"] = minHeight;

  return (
    <div
      className={cn("ldr", orientation === "vertical" ? "ldr-v" : "ldr-h", fixed && "ldr-fixed", className)}
      role="status"
      aria-live="polite"
      data-hidden={dismissed ? "true" : undefined}
      style={Object.keys(vars).length ? vars : undefined}
    >
      <div className="ldr-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ldr-ghost" src={src} alt="" aria-hidden />
        <span className="ldr-ink" aria-hidden />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
