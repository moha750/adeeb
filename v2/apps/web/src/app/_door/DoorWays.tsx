"use client";

import { useEffect, useState } from "react";
import { Envelope } from "@phosphor-icons/react";
import { AppleLogo, GoogleLogo } from "@/app/_components/glyphs";
import { toArabicAuthError } from "@/lib/authErrors";
import { startOAuth } from "@/lib/oauthStart";
import type { AuthIntent, OAuthProvider } from "@/lib/oauthIntent";
import { readLastSignin, rememberSignin, type SigninWay } from "@/lib/lastSignin";
import { setDeeboMood } from "@/lib/deeboMood";
import { Way, Ways } from "./parts";

/**
 * **طرقُ الدخول أو الإنشاء — الخطوةُ الأولى في البابين.** ثلاثةُ أزرارٍ عريضةٍ لا نموذج:
 * قوقل أوّلًا (أكثرُ من يفتح حسابه يفتحه به)، ثمّ أبل، ثمّ البريد الذي يفتح خطوتَه. والفعلُ يقول البابَ:
 * «ادخل» في البوّابة و«أنشئ حسابك» في الإنشاء. ومن له طريقٌ أخير على هذا الجهاز يجد عليه
 * «آخر دخول» (`lib/lastSignin.ts`).
 *
 * من له حسابٌ ببريده المؤكَّد تُضمّ هويّةُ قوقل إليه في البابين. ومن لا حساب له يُنشأ له حسابٌ من
 * صفحة الإنشاء وحدها: في البوّابة يمحوه `/auth/callback` ويعيده بـ«لا حسابَ لك».
 */
const PROVIDERS: { key: OAuthProvider; name: string; Icon: typeof GoogleLogo }[] = [
  { key: "google", name: "قوقل", Icon: GoogleLogo },
  { key: "apple", name: "أبل", Icon: AppleLogo },
];

export function DoorWays({
  intent, next, onEmail, onError,
}: {
  intent: AuthIntent;
  next: string;
  onEmail: () => void;
  onError: (msg: string | null) => void;
}) {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [last, setLast] = useState<SigninWay | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ذاكرةُ المتصفّح بعد الترطيب
    setLast(readLastSignin());
    // **الدورانُ يعني «نحن مغادرون»، فإن بقينا فلا دوران**: من رجع من شاشة المزوّد عادت الصفحةُ
    // من ذاكرة الرجوع بزرٍّ يدور — فيُطفأ عند عودتها إلى الظهور.
    const stop = () => setBusy(null);
    const vis = () => { if (document.visibilityState === "visible") stop(); };
    window.addEventListener("pageshow", stop);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pageshow", stop);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  const go = (p: OAuthProvider) => {
    setBusy(p);
    onError(null);
    rememberSignin(p);
    setDeeboMood("wait");
    void startOAuth(p, next, intent).then((error) => {
      if (error) { onError(toArabicAuthError(error)); setBusy(null); }
    });
  };

  // كلماتُ المالك (٢٠٢٦-١٠-١٨): «ادخل بحساب قوقل» في البوّابة، و«أنشئ حسابك بقوقل» في الإنشاء
  const verb = intent === "login" ? "ادخل" : "أنشئ حسابك";
  const lastEmail = last === "password" || last === "code";
  const tag = "آخر دخول";

  return (
    <Ways label={intent === "login" ? "طرق الدخول" : "طرق إنشاء الحساب"}>
      {PROVIDERS.map(({ key, name, Icon }, i) => (
        <Way
          key={key}
          main={i === 0}
          icon={<Icon size={20} />}
          busy={busy === key}
          disabled={busy !== null}
          onClick={() => go(key)}
          tag={intent === "login" && last === key ? tag : undefined}
        >
          {intent === "login" ? `${verb} بحساب ${name}` : `${verb} بـ${name}`}
        </Way>
      ))}
      <Way icon={<Envelope size={20} />} disabled={busy !== null} onClick={onEmail} tag={intent === "login" && lastEmail ? tag : undefined}>
        {`${verb} ببريدك`}
      </Way>
    </Ways>
  );
}
