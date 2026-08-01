import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * عنوان قسم صفحة الهبوط — «الرأس المُذهّب».
 * البنية: فئةٌ كبيرة تتلاشى إلى الخلفية من أسفل (يخرج منها العنوان) · عنوانٌ بتدرّج
 * الهوية على تظليلٍ متدرّج مستدير ممتدّ (كقلم التحديد) · شعرةٌ تكمل العرض · جملةٌ واصفة اختياريّة.
 * بلا أرقام ولا باترن. tone="onDark" للأقسام الكحلية.
 * قاعدة النصّ (مُقَرّة): العين (eyebrow) = كلمةٌ واحدة، والعنوان (title) = كلمتان — اتّساقٌ وإيقاع.
 *
 * **خطّ العين `--font-latin` لا `--font-display`** (قاعدة الخطّ اللاتينيّ): العين قد تحمل
 * لاتينيًّا («404 ERROR» في صفحة «غير موجود»)، وكانت أرقامُه تُرسم بـEras (نطاق U+0030-0039
 * محوَّلٌ إليه داخل عائلة Lyon في `fonts.css`) وحروفُه بـLyon Arabic — **خطّان في سطرٍ واحد**.
 * والمكدّس اللاتينيّ آخرُه `Lyon Arabic`، وEras لا يملك عربيّة (مُتحقَّقٌ من جدول محارف الملفّ)،
 * فالعين العربيّة تسقط إليه تلقائيًّا — رسمُها لا يتغيّر، واللاتينيّة تتوحّد على Eras.
 *
 * المقاسات مائعة (clamp): يصغر النصّ بسلاسة مع عرض الشاشة فيبقى **سطرًا واحدًا** في كلّ المقاسات
 * (لا التفاف ولا خروج) — فتبقى المسطرة والتظليل شريطًا واحدًا نظيفًا بلا JS.
 */

// مائع: أدنى (يسع أضيق شاشة) → مفضّل (يتبع العرض) → أقصى (حجم الحاسوب)
const TITLE = "font-display font-black leading-[1.05] text-[clamp(1.75rem,11vw,3.75rem)]";

// الفئة — نصٌّ يتلاشى رأسيًّا إلى الشفّاف من أسفل، فيتبع لونَ الخلفية
const categoryFill: CSSProperties = {
  backgroundImage: "linear-gradient(to bottom, var(--steel-300) 0%, transparent 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
};

// العنوان (الوضع الفاتح) — تدرّج الهوية معكوسًا بزاوية؛ يبقى أبيض على الكحليّ
const titleFill: CSSProperties = {
  backgroundImage: "linear-gradient(135deg, var(--navy-800), var(--steel-400))",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
  // كشفُ التشكيل فوق الحرف (شدّة/حركات): background-clip: text يقصّ ما يعلو صندوق النصّ،
  // والحشو العلويّ يوسّع صندوق رسم التدرّج ليشمله. لا يزيح التخطيط لأنّ العنوان عنصرٌ سطريّ.
  paddingTop: "0.35em",
};

// لونُ التظليل: تدرّجٌ فولاذيّ فاتح، وشبه‑أبيض شفّاف على الكحليّ
const markerBg = (dark: boolean) =>
  dark ? "rgba(255,255,255,.16)" : "linear-gradient(135deg, var(--steel-200), var(--steel-100))";

export function LandingHeading({
  eyebrow,
  title,
  deck,
  align = "start",
  tone = "default",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  deck?: string;
  align?: "start" | "center";
  tone?: "default" | "onDark";
  className?: string;
}) {
  const dark = tone === "onDark";
  const center = align === "center";
  const rule = "h-px flex-1 bg-steel-300/50";
  return (
    <div className={cn("mb-10", center && "text-center", className)}>
      {eyebrow ? (
        <span
          className="block whitespace-nowrap font-latin font-black leading-[1.4] text-[clamp(2.25rem,13vw,4.5rem)] -mb-[0.6em]"
          style={categoryFill}
          aria-hidden
        >
          {eyebrow}
        </span>
      ) : null}

      <div className="flex items-center gap-4 md:gap-5">
        {center ? <span className={rule} aria-hidden /> : null}
        <h2 className={cn("whitespace-nowrap", TITLE, dark ? "text-white" : "text-content")}>
          <span className="relative inline-block">
            <span
              className="absolute inset-x-[-0.12em] bottom-[0.08em] h-[0.4em]"
              style={{ background: markerBg(dark), borderRadius: "var(--radius-sm)" }}
              aria-hidden
            />
            <span className="relative" style={dark ? undefined : titleFill}>
              {title}
            </span>
          </span>
        </h2>
        <span className={rule} aria-hidden />
      </div>

      {deck ? (
        <p
          className={cn(
            "mt-3 max-w-xl text-base leading-relaxed md:text-lg",
            center && "mx-auto",
            dark ? "text-steel-200" : "text-content-muted",
          )}
        >
          {deck}
        </p>
      ) : null}
    </div>
  );
}
