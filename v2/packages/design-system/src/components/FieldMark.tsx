import type { ReactElement } from "react";

/**
 * وسم الإلزام/الاختيار لصفّ التسمية — مصدرٌ واحد لكلّ الحقول (`Field` · `Textarea` · `Select`)
 * وأيّ حقلٍ مخصّص. الإلزاميّ = نجمة `Asterisk` حمراء في حبّة Aurora (`.fld-req`)؛
 * الاختياريّ = «(اختياريّ)» رماديّ (`.fld-opt`). التنسيق في `components.css` بجانب `.fld-lbl`.
 */
export function FieldMark({ optional, required }: { optional?: boolean; required?: boolean }): ReactElement | null {
  if (optional) return <span className="fld-opt">(اختياريّ)</span>;
  if (required) {
    return (
      <span className="fld-req" aria-hidden="true">
        <svg viewBox="0 0 256 256" fill="currentColor">
          <path d="M128 24a8 8 0 0 0-8 8v76.69L61.66 50.34a8 8 0 1 0-11.32 11.32L108.69 120H32a8 8 0 0 0 0 16h76.69l-58.35 58.34a8 8 0 0 0 11.32 11.32L120 147.31V224a8 8 0 0 0 16 0v-76.69l58.34 58.35a8 8 0 0 0 11.32-11.32L147.31 136H224a8 8 0 0 0 0-16h-76.69l58.35-58.34a8 8 0 0 0-11.32-11.32L136 108.69V32a8 8 0 0 0-8-8Z" />
        </svg>
      </span>
    );
  }
  return null;
}
