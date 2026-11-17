"use client";

import { createContext, useContext } from "react";

/**
 * **موضعا القسم لحقلٍ هو القسمُ نفسُه** (حقلُ الرفع بلا بئر، محمد ٢٠٢٦-١١-١٣): `head` طرفُ رأس القسم حيث تُوضع أفعالُه («تغيير»، «إزالة»)،
 * و`under` تحت القسم حيث يُكتب وصفُه (الصيغُ والحجم) خارجَ إطاره كوصف كلّ حقلٍ تحت بئره. يملؤهما `FormSection`، ويُرسَل إليهما بـ`createPortal`.
 */
export const SectionSlots = createContext<{ head: HTMLElement | null; under: HTMLElement | null }>({ head: null, under: null });
export const useSectionSlots = () => useContext(SectionSlots);
