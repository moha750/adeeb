import { LOGO_SCALE, LOOK, SHAPE, EXPORT } from "./defaults";
import type { QrFramePlace, QrFrameStyle, QrSpec } from "@/lib/qr";

/**
 * **بذرةُ المحرّر من وصفةٍ محفوظة** — عكسُ بناء المواصفة: ما حُفظ يعود حقولًا في الشاشة.
 * وما غاب يأخذ افتراضَ الهويّة من مصدره الواحد (`defaults`)، فلا رقمَ محفورٌ هنا.
 */
export function look(spec?: QrSpec | null) {
  const paint = spec?.dots?.paint;
  const gradient = !!paint && paint.kind !== "solid";
  return {
    gradient,
    ink: paint ? (paint.kind === "solid" ? paint.color : paint.from) : LOOK.ink,
    ink2: paint && paint.kind !== "solid" ? paint.to : LOOK.ink2,
    gradKind: (paint?.kind === "radial" ? "radial" : "linear") as "linear" | "radial",
    angle: paint?.kind === "linear" ? paint.angle : LOOK.angle,
    cx: paint?.kind === "radial" ? paint.cx ?? LOOK.cx : LOOK.cx,
    cy: paint?.kind === "radial" ? paint.cy ?? LOOK.cy : LOOK.cy,
    hasBg: spec ? spec.bg !== null : LOOK.hasBg,
    bg: spec?.bg ?? LOOK.bg,
    eyeTinted: !!spec?.eye?.color,
    eyeColor: spec?.eye?.color ?? LOOK.eyeColor,
    pupilColor: spec?.pupil?.color ?? LOOK.pupilColor,
    logo: spec?.logo?.href ?? null,
    logoScale: spec?.logo?.scale ?? LOGO_SCALE,
    /**
     * **ما لا تحرّره الشاشةُ يُحمَل كما حُفظ** (٢٠٢٦-٠٨-٣١): الشكلُ والمقاسُ وحجمُ الشعار
     * ثوابتُ هويّةٍ اليوم، فكانت البذرةُ تُهملها وتُعيد المواصفةَ بناءً من `defaults`. فأيُّ
     * صفٍّ حُفظ قبل تثبيتها يخرج مخالفًا لمحفوظه ⇒ «تغيّر شيء» لحظةَ الفتح ⇒ حفظٌ تلقائيٌّ
     * يعيد كتابة تصميمِ ملصقٍ مطبوعٍ بلا أن يلمس أحدٌ شيئًا. والوصفةُ عهدٌ لصاحبها.
     */
    dotsShape: spec?.dots?.shape ?? SHAPE.dots,
    eyeShape: spec?.eye?.shape ?? SHAPE.eye,
    pupilShape: spec?.pupil?.shape ?? SHAPE.pupil,
    size: spec?.size ?? EXPORT,
    framed: !!spec?.frame,
    frameStyle: (spec?.frame?.style ?? LOOK.frameStyle) as QrFrameStyle,
    framePlace: (spec?.frame?.place ?? LOOK.framePlace) as QrFramePlace,
    caption: spec?.frame?.caption ?? LOOK.caption,
    frameColor: spec?.frame?.color ?? LOOK.frameColor,
    captionColor: spec?.frame?.textColor ?? LOOK.captionColor,
  };
}
