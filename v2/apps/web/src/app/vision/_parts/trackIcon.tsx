import { DeviceMobile, Megaphone, PresentationChart, Target, UsersThree } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { ICON_WEIGHT } from "@/lib/iconWeight";

/** رمزُ المسار (مدخلُ الخادم بوزن الموقع: يُرسم في صفحةٍ خادميّة وفي غرفة البوّابة) من مفتاحه (`vision_tracks.icon`، والمفاتيحُ في `lib/vision/vocab.ts`) — والمجهولُ هدفٌ عامّ. */
export function trackIcon(key: string): ReactNode {
  switch (key) {
    case "users": return <UsersThree weight={ICON_WEIGHT} aria-hidden />;
    case "presentation": return <PresentationChart weight={ICON_WEIGHT} aria-hidden />;
    case "megaphone": return <Megaphone weight={ICON_WEIGHT} aria-hidden />;
    case "device": return <DeviceMobile weight={ICON_WEIGHT} aria-hidden />;
    default: return <Target weight={ICON_WEIGHT} aria-hidden />;
  }
}
