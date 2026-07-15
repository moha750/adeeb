import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** عنوان قسم موحّد: eyebrow + عنوان درامي بـLyon + لمسة باترن. tone="onDark" للأقسام الكحلية. */
export function SectionHeading({
  eyebrow,
  title,
  align = "start",
  tone = "default",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  align?: "start" | "center";
  tone?: "default" | "onDark";
  className?: string;
}) {
  const dark = tone === "onDark";
  return (
    <div className={cn("mb-10", align === "center" && "text-center", className)}>
      {eyebrow ? (
        <p className={cn("mb-3 font-body text-sm font-bold", dark ? "text-steel-300" : "text-secondary")}>
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "font-display text-3xl font-black leading-[1.1] md:text-4xl lg:text-5xl",
          dark ? "text-white" : "text-content",
        )}
      >
        {title}
      </h2>
      <div
        className={cn("mt-4 h-3.5 w-28 bg-repeat-x opacity-90", align === "center" && "mx-auto")}
        style={{
          backgroundImage: dark ? "url(/brand/pattern-white.svg)" : "url(/brand/pattern.svg)",
          backgroundSize: "auto 100%",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
