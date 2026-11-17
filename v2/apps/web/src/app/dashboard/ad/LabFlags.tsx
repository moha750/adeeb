"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { AdLab } from "@/app/_ad/lab";

/** يقرأ أعلامَ المعاينة من الرابط (`?f=panel`، `?f=states`، `?f=page`، `?f=select`) — مؤقّت، يُحذف مع المختبر. */
export function LabFlags({ children }: { children: ReactNode }) {
  const sp = useSearchParams();
  const path = usePathname();
  const dry = !!path?.startsWith("/dashboard/ad/upload");
  const panel = sp.get("f") === "panel";
  const allStates = sp.get("f") === "states";
  const pageSize = sp.get("f") === "page" ? 3 : undefined;
  const select = sp.get("f") === "select";
  const as = sp.get("as");
  const asRole = as === "owner" || as === "edit" || as === "read" || as === "steward" ? as : undefined;
  return <AdLab.Provider value={{ filterPanelAt: panel ? 1 : undefined, allStates, asRole, pageSize, select, dry }}>{children}</AdLab.Provider>;
}
