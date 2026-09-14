"use client";

import { useEffect, useState } from "react";
import { Button } from "@adeeb/design-system";
import { AppleLogo, GoogleLogo } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import { toArabicAuthError } from "@/lib/authErrors";

/**
 * **الدخولُ والتسجيلُ بمزوّدٍ اجتماعيّ — بابٌ واحدٌ للفعلين.**
 *
 * من له حسابٌ ببريده المؤكَّد تُضمّ هويّةُ قوقل إليه (ربطٌ تلقائيّ في Supabase) فيدخل بقدراته
 * كما هي، **ومن لا حساب له يُنشأ له حسابٌ** — فُتح البابُ للجميع في م٣ (٢٠٢٦-٠٨-٠٥)، ولم يبقَ
 * من منع الخطّاف `hook_block_oauth_signup` إلّا بريدُ أبل المُخفى. ولذلك يسكن هذا المكوّنُ
 * شاشتي الدخول والتسجيل معًا: الفعلُ عند المزوّد واحدٌ، والفرقُ فرقُ نيّةِ من ضغط.
 *
 * **ولا يمنح عضويّةً بحال**: الحسابُ يُفتح بلا `joined_date`، وبلا جوّالٍ ولا جنس — فمن دخل
 * بقوقل يُساق إلى `/me` ليُكمل بياناته، ثمّ إلى `/join` إن أراد العضويّة.
 *
 * **والقائمةُ مرآةُ ما فُعّل في `v2/scripts/auth-config.mjs`**: زرُّ مزوّدٍ لم يُضبط سرُّه هناك
 * يردّ «Unsupported provider» في وجه العضو — فلا يُضاف اسمٌ ههنا قبل أن يُطبَّق إعدادُه.
 * (أبل تلتحق حين يُضبط سرُّها.)
 */
const PROVIDERS = [
  {
    key: "google" as const,
    label: "المتابعة بحساب قوقل",
    Icon: GoogleLogo,
    // **اختيارُ الحساب لا آخرُ حسابٍ دخل:** أكثرُ أعضائنا لهم أكثرُ من حساب قوقل في المتصفّح،
    // وبلا هذا يمرّرهم قوقل بالأخير صامتًا — فيُردّون ببريدٍ ليس بريدَ عضويّتهم.
    params: { prompt: "select_account" } as Record<string, string> | undefined,
  },
  {
    key: "apple" as const,
    label: "المتابعة بحساب أبل",
    Icon: AppleLogo,
    // ولا `prompt` لأبل: لا تعرفه، ومعاملٌ لا تعرفه قد يُردّ `invalid_request` — وهي تسأل
    // عن الحساب من نفسها أصلًا. فالمعاملُ يتبع مزوّدَه لا يُعمَّم عليهم.
    params: undefined,
  },
];

export function OAuthButtons({ next, onError }: { next: string; onError: (msg: string | null) => void }) {
  // اسمُ المزوّد لا `true`: الزرُّ المضغوط وحده يدور، وأخوه يبقى متاحًا حتى تُغادر الصفحة.
  const [busy, setBusy] = useState<string | null>(null);

  /**
   * **الدورانُ يعني «نحن مغادرون»، فإن بقينا فلا دوران** (٢٠٢٦-٠٩-١٤).
   *
   * كان الإطفاءُ معلّقًا على الفشل وحدَه، ظنًّا أنّ النجاح مغادرةٌ لا رجعةَ منها. ومن ضغط
   * «المتابعة بحساب قوقل» ثمّ رجع من شاشة المزوّد (تراجعًا أو خروجًا بالخطأ) عادت الصفحةُ
   * من ذاكرة الرجوع (bfcache) بحالتها كما تركها: الزرُّ يدور، و`disabled` معقودٌ على
   * `loading` في `Button` — فيصير البابُ مغلقًا لا يُضغط إلّا بتحديثٍ يدويّ. وليست العلّةُ
   * في متصفّحٍ بعينه: سفاري يحفظ الصفحة كذلك ولو حملت `no-store`.
   *
   * فالحدُّ ليس «هل فشل النداء؟» بل «هل ما زلنا هنا؟». وعودةُ الصفحة إلى الظهور جوابٌ
   * قاطع: `pageshow` تُنادى عند الاستعادة من ذاكرة الرجوع، و`visibilitychange` تمسك ما
   * فاتها (تبويبٌ رُجع إليه ولم يقع تنقّلٌ أصلًا). وضغطةٌ ثانيةٌ بعد إطفاءٍ في غير محلّه
   * لا تضرّ: تحويلةٌ تغلب أختَها، والوجهةُ واحدة.
   */
  useEffect(() => {
    const stop = () => setBusy(null);
    const onShow = () => stop();
    const onVisible = () => {
      if (document.visibilityState === "visible") stop();
    };
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const start = ({ key: provider, params }: (typeof PROVIDERS)[number]) => {
    setBusy(provider);
    onError(null);
    void (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: params,
        },
      });
      // الفشلُ يُبقينا في الصفحة فيُطفأ فورًا. والنجاحُ مغادرةٌ يبقى الدورانُ معها،
      // ويتكفّل حارسُ العودة أعلاه بإطفائه إن رجع صاحبُه من شاشة المزوّد.
      if (error) {
        onError(toArabicAuthError(error.message));
        setBusy(null);
      }
    })();
  };

  return (
    <>
      {PROVIDERS.map((p) => (
        <Button
          key={p.key}
          type="button"
          variant="ghost"
          size="lg"
          className="aauth-submit"
          loading={busy === p.key}
          onClick={() => start(p)}
        >
          <p.Icon size={20} />
          {p.label}
        </Button>
      ))}
    </>
  );
}
