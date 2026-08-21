import { color } from "@adeeb/theme-native";
import type { ComponentType } from "react";

import { AppleLogo as RawAppleLogoIcon } from "phosphor-react-native/src/icons/AppleLogo";
import { ArrowClockwise as RawArrowClockwiseIcon } from "phosphor-react-native/src/icons/ArrowClockwise";
import { ArrowCounterClockwise as RawArrowCounterClockwiseIcon } from "phosphor-react-native/src/icons/ArrowCounterClockwise";
import { ArrowSquareOut as RawArrowSquareOutIcon } from "phosphor-react-native/src/icons/ArrowSquareOut";
import { CalendarCheck as RawCalendarCheckIcon } from "phosphor-react-native/src/icons/CalendarCheck";
import { CalendarDots as RawCalendarDotsIcon } from "phosphor-react-native/src/icons/CalendarDots";
import { Camera as RawCameraIcon } from "phosphor-react-native/src/icons/Camera";
import { CaretDown as RawCaretDownIcon } from "phosphor-react-native/src/icons/CaretDown";
import { CaretLeft as RawCaretLeftIcon } from "phosphor-react-native/src/icons/CaretLeft";
import { Certificate as RawCertificateIcon } from "phosphor-react-native/src/icons/Certificate";
import { ClipboardText as RawClipboardTextIcon } from "phosphor-react-native/src/icons/ClipboardText";
import { Clock as RawClockIcon } from "phosphor-react-native/src/icons/Clock";
import { Eye as RawEyeIcon } from "phosphor-react-native/src/icons/Eye";
import { Heart as RawHeartIcon } from "phosphor-react-native/src/icons/Heart";
import { IdentificationCard as RawIdentificationCardIcon } from "phosphor-react-native/src/icons/IdentificationCard";
import { MapPin as RawMapPinIcon } from "phosphor-react-native/src/icons/MapPin";
import { MusicNotes as RawMusicNotesIcon } from "phosphor-react-native/src/icons/MusicNotes";
import { Newspaper as RawNewspaperIcon } from "phosphor-react-native/src/icons/Newspaper";
import { Palette as RawPaletteIcon } from "phosphor-react-native/src/icons/Palette";
import { Pause as RawPauseIcon } from "phosphor-react-native/src/icons/Pause";
import { Play as RawPlayIcon } from "phosphor-react-native/src/icons/Play";
import { Radio as RawRadioIcon } from "phosphor-react-native/src/icons/Radio";
import { SealCheck as RawSealCheckIcon } from "phosphor-react-native/src/icons/SealCheck";
import { SignOut as RawSignOutIcon } from "phosphor-react-native/src/icons/SignOut";
import { User as RawUserIcon } from "phosphor-react-native/src/icons/User";
import { UserMinus as RawUserMinusIcon } from "phosphor-react-native/src/icons/UserMinus";
import { Warning as RawWarningIcon } from "phosphor-react-native/src/icons/Warning";
import { YoutubeLogo as RawYoutubeLogoIcon } from "phosphor-react-native/src/icons/YoutubeLogo";

/**
 * أيقوناتُ التطبيق: **بيتٌ واحدٌ يُستورَد منه، وفيه يُضبط الوزنُ مرّةً واحدة.**
 *
 * وله سببان:
 *
 * **١) الحجم.** استيرادُ أيقونةٍ من جذر `phosphor-react-native` يجرّ المكتبةَ كلَّها
 * (١٥١٢ أيقونةً · ٧٦ ميغابايت على القرص) لأنّ Metro لا يهزّ الشجرة. والمكتبةُ تسمح
 * بالإفراد عبر بابٍ معتمَدٍ في `exports` (`./src/icons/*`)، فهذا ما يستعمله هذا الملفّ.
 * وقياسُ حزمة الإنتاج قبلَه وبعدَه مكتوبٌ في إيداعه.
 *
 * **٢) الوزن.** كان `IconContext` يضبطه للتطبيق كلِّه، وهو نفسُه يُستورَد من الجذر
 * فيُبطل الإفراد. فانتقل الضبطُ إلى هنا: كلُّ أيقونةٍ تخرج duotone بلون النصّ ومقاس ٢٤،
 * وما يمرّره النداءُ يفوز (كـ`weight="fill"` في موضعين).
 *
 * **ولا تُستورَد أيقونةٌ من جذر المكتبة في شاشة**، وهو قانونُ الويب نفسُه
 * (`app/_components/IconDefaults.tsx` و`glyphs.tsx` هناك).
 */

type Glyph = ComponentType<{
  size?: number;
  color?: string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
}>;

const glyph = (Raw: Glyph): Glyph =>
  function Glyphed(props) {
    return <Raw weight="duotone" color={color.text} size={24} {...props} />;
  };

export const AppleLogoIcon = glyph(RawAppleLogoIcon as unknown as Glyph);
export const ArrowClockwiseIcon = glyph(RawArrowClockwiseIcon as unknown as Glyph);
export const ArrowCounterClockwiseIcon = glyph(RawArrowCounterClockwiseIcon as unknown as Glyph);
export const ArrowSquareOutIcon = glyph(RawArrowSquareOutIcon as unknown as Glyph);
export const CalendarCheckIcon = glyph(RawCalendarCheckIcon as unknown as Glyph);
export const CalendarDotsIcon = glyph(RawCalendarDotsIcon as unknown as Glyph);
export const CameraIcon = glyph(RawCameraIcon as unknown as Glyph);
export const CaretDownIcon = glyph(RawCaretDownIcon as unknown as Glyph);
export const CaretLeftIcon = glyph(RawCaretLeftIcon as unknown as Glyph);
export const CertificateIcon = glyph(RawCertificateIcon as unknown as Glyph);
export const ClipboardTextIcon = glyph(RawClipboardTextIcon as unknown as Glyph);
export const ClockIcon = glyph(RawClockIcon as unknown as Glyph);
export const EyeIcon = glyph(RawEyeIcon as unknown as Glyph);
export const HeartIcon = glyph(RawHeartIcon as unknown as Glyph);
export const IdentificationCardIcon = glyph(RawIdentificationCardIcon as unknown as Glyph);
export const MapPinIcon = glyph(RawMapPinIcon as unknown as Glyph);
export const MusicNotesIcon = glyph(RawMusicNotesIcon as unknown as Glyph);
export const NewspaperIcon = glyph(RawNewspaperIcon as unknown as Glyph);
export const PaletteIcon = glyph(RawPaletteIcon as unknown as Glyph);
export const PauseIcon = glyph(RawPauseIcon as unknown as Glyph);
export const PlayIcon = glyph(RawPlayIcon as unknown as Glyph);
export const RadioIcon = glyph(RawRadioIcon as unknown as Glyph);
export const SealCheckIcon = glyph(RawSealCheckIcon as unknown as Glyph);
export const SignOutIcon = glyph(RawSignOutIcon as unknown as Glyph);
export const UserIcon = glyph(RawUserIcon as unknown as Glyph);
export const UserMinusIcon = glyph(RawUserMinusIcon as unknown as Glyph);
export const WarningIcon = glyph(RawWarningIcon as unknown as Glyph);
export const YoutubeLogoIcon = glyph(RawYoutubeLogoIcon as unknown as Glyph);
