"use client";

import { createContext, useContext } from "react";
import type { NavGroup } from "./nav";

/**
 * الخريطة **كما يراها صاحبُ هذه الجلسة** (مخرَج `navFor`) — يحسبها الشريط الجانبيّ مرّةً،
 * ويقرؤها من يحتاجها في المحتوى. اليوم قارئُها {@link Breadcrumb}: منسدلُ رأس المجموعة
 * لا يعرض بندًا لا مفتاحَ له، فلا يُعِد الترشيح ولا يمرّ بالقدرات عبر عشرات الصفحات.
 */
const NavCtx = createContext<NavGroup[]>([]);

export const NavProvider = NavCtx.Provider;
export const useNav = () => useContext(NavCtx);
