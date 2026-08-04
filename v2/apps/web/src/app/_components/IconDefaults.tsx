"use client";
// وزنُ الأيقونات صفةُ **الموقع كلّه** لا صفةُ كلّ أيقونةٍ على حدة: كلّ أيقونات أديب duotone —
// طبقةٌ خافتةٌ تملأ الشكل خلف خطّه فيثقُل حضورُها. سياقٌ واحد في الجذر يكفي، فلا يُرصَّع
// `weight` في مئات المواضع. (كان السياق محصورًا بخريطة لوحة التحكّم، وكانت ٣٨١ أيقونةً
// تكتب وزنها صراحةً — أُزيلت كلّها إذ الخاصّةُ تغلب السياق فتنقُض المصدر الواحد.)
//
// عميليّ لأنّ `IconContext` من Phosphor يستعمل `createContext`؛ والأبناء يبقون خادميّين
// (يمرّون خاصّيةً لا يُسحَبون للحزمة العميليّة)، والسياق يسري إليهم إذ هم أبناءٌ في الشجرة.
import { IconContext } from "@phosphor-icons/react";
import { ICON_WEIGHT } from "@/lib/iconWeight";

// ثابتٌ خارج المكوّن: مرجعٌ واحد لا يتغيّر، فلا يُعاد رسمُ كلّ مستهلكي السياق عند كلّ ترطيب.
const ICON_DEFAULTS = { weight: ICON_WEIGHT, color: "currentColor", size: "1em", mirrored: false } as const;

export function IconDefaults({ children }: { children: React.ReactNode }) {
  return <IconContext.Provider value={ICON_DEFAULTS}>{children}</IconContext.Provider>;
}
