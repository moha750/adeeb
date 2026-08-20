import { color } from "@adeeb/theme-native";
import { IconContext } from "phosphor-react-native";
import type { ReactNode } from "react";

/**
 * وزنُ الأيقونات duotone للتطبيق كلِّه، يُضبط مرّةً واحدة.
 * نظيرةُ `app/_components/IconDefaults.tsx` في الويب، وبالقاعدة نفسِها:
 * **لا يُمرَّر `weight` مع أيقونةٍ مفردةٍ أبدًا.**
 *
 * والاستثناءاتُ التي يُفسدها duotone في الويب (الأسهمُ والزوايا و+/×/✓) بابُها هناك
 * `glyphs.tsx`. حين تظهر الحاجةُ هنا يُفتَح لها بابٌ مثلُه، لا `weight` متناثرٌ في الشاشات.
 */
export function IconDefaults({ children }: { children: ReactNode }) {
  return (
    <IconContext.Provider
      value={{
        weight: "duotone",
        color: color.text,
        size: 24,
      }}
    >
      {children}
    </IconContext.Provider>
  );
}
