import {
  BookOpenText, ChartLineUp, Compass, DeviceMobile, GlobeHemisphereEast, GraduationCap, Handshake, Heart, Lightbulb, Megaphone, Microphone, PenNib,
  PresentationChart, Target, Trophy, UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { ICON_WEIGHT } from "@/lib/iconWeight";

/** رمزُ المسار (مدخلُ الخادم بوزن الموقع: يُرسم في صفحةٍ خادميّة وفي غرفة البوّابة) من مفتاحه (`vision_tracks.icon`، والمفاتيحُ في `lib/vision/vocab.ts`) — والمجهولُ هدفٌ عامّ. */
export function trackIcon(key: string): ReactNode {
  switch (key) {
    case "users": return <UsersThree weight={ICON_WEIGHT} aria-hidden />;
    case "presentation": return <PresentationChart weight={ICON_WEIGHT} aria-hidden />;
    case "megaphone": return <Megaphone weight={ICON_WEIGHT} aria-hidden />;
    case "device": return <DeviceMobile weight={ICON_WEIGHT} aria-hidden />;
    case "book": return <BookOpenText weight={ICON_WEIGHT} aria-hidden />;
    case "handshake": return <Handshake weight={ICON_WEIGHT} aria-hidden />;
    case "lightbulb": return <Lightbulb weight={ICON_WEIGHT} aria-hidden />;
    case "chart": return <ChartLineUp weight={ICON_WEIGHT} aria-hidden />;
    case "trophy": return <Trophy weight={ICON_WEIGHT} aria-hidden />;
    case "heart": return <Heart weight={ICON_WEIGHT} aria-hidden />;
    case "graduation": return <GraduationCap weight={ICON_WEIGHT} aria-hidden />;
    case "microphone": return <Microphone weight={ICON_WEIGHT} aria-hidden />;
    case "pen": return <PenNib weight={ICON_WEIGHT} aria-hidden />;
    case "globe": return <GlobeHemisphereEast weight={ICON_WEIGHT} aria-hidden />;
    case "compass": return <Compass weight={ICON_WEIGHT} aria-hidden />;
    default: return <Target weight={ICON_WEIGHT} aria-hidden />;
  }
}
