import { fmtDateOnly } from "@/lib/dates";

/**
 * **موعدا الرؤية كما يُقرآن** (محمد ٢٠٢٦-١١-٢٣): بالكلام إن كُتب («بداية رمضان»)، وإلّا فالتاريخُ نفسه —
 * فلا تُلزَم رؤيةٌ بموعدٍ بالكلام لا معنى له. ملفٌّ بلا إطار: تقرؤه الصفحةُ العلنيّة وغرفُ البوّابة.
 */
export const visionFrom = (on: string, label?: string | null) => label?.trim() || fmtDateOnly(on);
export const visionTo = (on: string, label?: string | null) => label?.trim() || fmtDateOnly(on);
/** «من 1 نوفمبر 2026 حتى بداية رمضان» */
export const visionSpan = (startsOn: string, startsLabel: string | null | undefined, horizonOn: string, horizonLabel: string | null | undefined) =>
  `من ${visionFrom(startsOn, startsLabel)} حتى ${visionTo(horizonOn, horizonLabel)}`;
