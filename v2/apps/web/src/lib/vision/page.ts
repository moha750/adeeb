import "server-only";
import { revalidatePath } from "next/cache";
import { VISION_PATH } from "./vocab";

/**
 * **صفحةُ الرؤية العامّة** — مسارُها وإنعاشُها من مصدرٍ واحد، على سَنن `lib/structurePage.ts`.
 *
 * تُبنى مرّةً كلَّ خمس دقائق شبكةَ أمان، وكلُّ فعلٍ في غرفة «متابعة الرؤية» يستدعي `refreshVisionPages`
 * فتُضاء القطعةُ في الهلال لحظةَ الحفظ.
 */
export { VISION_PATH };

export function refreshVisionPages(slug?: string) {
  revalidatePath(VISION_PATH);
  if (slug) revalidatePath(`${VISION_PATH}/${slug}`);
}
