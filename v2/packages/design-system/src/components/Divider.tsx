import { cn } from "../lib/cn";

export interface DividerProps {
  /** كلمةُ الفصل — «أو» بين طريقَي دخول. **إلزاميّة**: الفاصلُ الأصمّ يُضاف حين يُطلب لا استباقًا. */
  label: string;
  className?: string;
}

/**
 * فاصلٌ بكلمةٍ في وسطه — يفصل **بديلين متساويين** لا خطوتين متتابعتين: كلمةَ المرور عن
 * الدخول بمزوّد. وخطّاه يتلاشيان خارجًا من الكلمة بمفردات `ModalSectionHeading` نفسِها
 * (‏`--card-stroke` بعرضه الموحَّد) — خطٌّ واحدٌ في الهوية لا وصفتان.
 *
 * وليس `ModalSectionHeading`: ذاك **عنوانُ** قسمٍ بأيقونته يبدأ من أوّل السطر ويُعنون ما بعده،
 * وهذا **فاصلٌ** متوسّطٌ لا يعنون شيئًا — يقول «أو» بين ما قبله وما بعده.
 */
export function Divider({ label, className }: DividerProps) {
  return (
    <div className={cn("adiv", className)} role="separator">
      <span className="adiv-label">{label}</span>
    </div>
  );
}
