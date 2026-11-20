"use client";

import { useEffect, useTransition } from "react";
import { setPreviewAccess } from "@/lib/supabase/preview-access";
import { useRouter } from "next/navigation";
import { Eye, SignOut } from "@/app/_components/glyphs";
import { AdButton, AdNote } from "@/app/_ad/primitives";
import { refreshPreviewAccess, stopViewAs } from "./view-as-actions";

/**
 * شريط المعاينة — يعلو كلّ صفحةٍ ما دامت الهويّة مستعارة، **ولا يُخفى**:
 * ما يُنفَّذ أثناءها يُنسَب إلى المُعايَن في القاعدة وفي سجلّ النشاط، فإخفاؤه يجعل
 * المُعاين ينسى بأيّ يدٍ يكتب. لا صنف جديد — تنبيهُ المكتبة بنغمته (القاعدة ١).
 */
export function ViewAsBar({ targetName, realName, access }: {
  targetName: string | null; realName: string | null;
  /** رمزُ المعاينة للمتصفّح (`previewBrowserAccess`): يُسلَّم أثناء الرسم فيقرأ به كلُّ ما تحت الشريط من أوّل لحظة */
  access?: { token: string; exp: number; userId: string } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  setPreviewAccess(access ?? null);
  useEffect(() => {
    // يُجدَّد قبل أن ينقضي عمرُه (عشر دقائق)، ويُمحى حين ينتهي الشريطُ أي المعاينة. ويُعاد تسليمُه هنا لأنّ التركيبَ المزدوج
    // في التطوير يمحوه بين التركيبين
    setPreviewAccess(access ?? null);
    const t = setInterval(() => { void refreshPreviewAccess().then((a) => setPreviewAccess(a)); }, 8 * 60_000);
    return () => { clearInterval(t); setPreviewAccess(null); };
  }, [access]);

  const end = () =>
    start(async () => {
      await stopViewAs();
      router.replace("/dashboard");
      router.refresh();
    });

  // **تنبيهُ الصفحة من الهويّة** (`AdNote`، محمد ٢٠٢٦-١١-٢٠: «أعتقد أن هذا التنبيه من الهوية القديمة»): كان `Alert` النوافذ بزرّه القديم
  return (
    <div className="ad-viewas">
      <AdNote tone="warn" icon={<Eye />} label="معاينة"
        title={`تعاين بعين ${targetName?.trim() || "عضو"}`}
        action={<AdButton size="sm" icon={<SignOut />} busy={pending} onClick={end}>إنهاء المعاينة</AdButton>}>
        {`ترى وتتصرّف بصلاحيّته لا بصلاحيّتك${realName?.trim() ? ` (${realName.trim()})` : ""}، وكلُّ ما تفعله الآن يُنسب إليه في السجلّ.`}
      </AdNote>
    </div>
  );
}
