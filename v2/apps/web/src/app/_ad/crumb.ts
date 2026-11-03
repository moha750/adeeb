"use client";

import { usePathname } from "next/navigation";
import { crumbFor, navOwnerHref } from "@/app/dashboard/_shell/crumb";
import { useNav } from "@/app/dashboard/_shell/nav-context";
import { iconKeyForHref } from "@/app/dashboard/_shell/nav";

/**
 * **فتاتُ الغرفة من مسارها الفعليّ** (٢٠٢٦-١١-٠٢). كانت تُبنى من `navPath` بلا ورقة، فالغرفةُ على مسارٍ تحت بندٍ
 * («شريط الإعلانات» و«الأخبار المعروضة» تحت «اللوحة الإعلانية»، وصفحةُ الحملة تحت «مولّد الباركود») فقدت رابطَ بندها،
 * والمالكُ طلب تماثلَ الفتات (٢٠٢٦-١٠-٠٣). فالآن: المسارُ الفعليّ، واسمُ الغرفة ورقةً — فيقف البندُ رابطًا قبلها حين يختلف
 * مسارُه — ثمّ تُحذف الورقة لأنّ اسمَ اللوح هو هي.
 */
export function useRoomCrumb(navPath: string, title: string) {
  const nav = useNav();
  const path = usePathname() ?? navPath;
  return crumbFor(path, nav, title)
    .filter((st) => st.kind !== "leaf")
    .map((st) => ({ label: st.label, href: st.kind === "link" ? st.href : undefined }));
}

/** رمزُ الغرفة من الخريطة؛ والمسارُ الذي ليس بندًا (غرفةٌ تحت بند) يأخذ رمزَ بنده، كما يرث فتاتَه. */
export function roomIconKey(navPath: string) {
  const own = iconKeyForHref(navPath);
  if (own) return own;
  const owner = navOwnerHref(navPath);
  return owner ? iconKeyForHref(owner) : null;
}
