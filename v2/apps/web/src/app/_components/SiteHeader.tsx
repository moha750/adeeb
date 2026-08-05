"use client";

import { useState } from "react";
import { Header } from "@adeeb/design-system";
import { RegistrationClosedModal } from "./RegistrationClosed";

/**
 * رأسُ الموقع كما يلبسه أدِيب — `Header` المكتبة وقد صار فعلُه الأوّل يفتح نافذةً لا ينقل.
 *
 * ولمَ لفافةٌ ولم يُمرَّر الفعلُ في كلّ صفحة؟ لأنّ ما يفعله زرُّ «انضمّ إلينا» قرارٌ واحدٌ للموقع
 * كلِّه — فلو مُرِّر في عشر صفحاتٍ لَتخلّفت واحدةٌ يومَ يُفتح البابُ ثانيةً. وههنا يُبدَّل مرّةً.
 */
export function SiteHeader(props: Omit<React.ComponentProps<typeof Header>, "ctaHref" | "onCta">) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Header {...props} onCta={() => setOpen(true)} />
      <RegistrationClosedModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
