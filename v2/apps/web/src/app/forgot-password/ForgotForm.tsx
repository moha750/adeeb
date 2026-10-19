"use client";

import { useEffect, useState, useTransition } from "react";
import { AltLink } from "@/app/_door/parts";
import { Alert, Button, Field } from "@adeeb/design-system";
import { At, Envelope } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { logSignin } from "@/lib/signinEvents";
import { CAPTCHA_PENDING, toArabicAuthError, waitSeconds } from "@/lib/authErrors";
import { EMAIL_HINT, emailError, isEmail } from "@/lib/fieldFormats";
import { markResetSent } from "@/lib/resetWindow";
import { setDeeboMood } from "@/lib/deeboMood";
import { TurnstileWidget, useTurnstileWait } from "@/app/_components/Turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * طلبُ رابط استعادة — الردُّ **محايدٌ عمدًا**: نجاحٌ واحدٌ سواءٌ أكان البريد مسجّلًا أم لا،
 * فلا تصير الشاشةُ كاشفةً لمن هو عضوٌ في النادي (تعداد الحسابات). ولا يُستثنى من الحياد
 * إلّا ما ليس عن الحساب: تجاوزُ حدّ الإرسال أو انقطاعُ الشبكة.
 */
/** مهلةُ Supabase بين رسالتين لنفس المستخدم (‏Minimum interval per user). */
const COOLDOWN = 60;
/** عمرُ الرابط بالدقائق — يطابق `Email OTP expiration` في Supabase (600 ثانية). لا تغيّر أحدَهما وحده. */
const LINK_TTL_MIN = 10;

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  /** المعروض أحمرَ لأنّ الطلب رُفض لا لأنّه نجح — يختفي وحده حين يبلغ العدّاد صفرًا. */
  const [waiting, setWaiting] = useState(false);
  const [pending, start] = useTransition();
  // درعُ الباب — الرمزُ يُستهلك مرّةً، فيُعاد ضبطُ الودجة بعد كلّ إرسالٍ نجح أو ردّ
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  const waitToken = useTurnstileWait(tsToken, !!TURNSTILE_SITE_KEY);
  /** رايةُ الصيغة تُرفع عند مغادرة الحقل أو عند الإرسال — لا وهو يكتب أوّلَ محرف. */
  const [emailTouched, setEmailTouched] = useState(false);

  // ديبو يعيش اللحظة: يفكّر وأنت تنتظر، ويعتذر حين يتعثّر شيء، ويرفع إبهامه حين يُرسَل الرابط
  useEffect(() => {
    setDeeboMood(sent ? "success" : pending ? "busy" : err ? "error" : "idle");
  }, [sent, pending, err]);

  /** العدّاد يمنع الطلبَ قبل أوانه بدل أن يُرسله فيُردّ بخطأ حدّ الوتيرة. */
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const send = () => {
    setErr(null);
    // ردُّ هذه الشاشة محايدٌ عمدًا («أُرسل الرابط إن كان البريد مسجّلًا»)، فلو مرّ المكسور
    // لَجلس صاحبُه ينتظر رابطًا لا يجيء ولا شيء يقول له لِمَ. والصيغةُ ليست إفشاءً لحساب.
    if (!isEmail(email)) { setEmailTouched(true); setErr(`${EMAIL_HINT}.`); return; }
    start(async () => {
      // الزرُّ يدور ريثما يجيء رمزُ الدرع — لا يُرسَل طلبٌ بلا رمزٍ فيُردّ (انظر `useTurnstileWait`)
      const captchaToken = await waitToken();
      if (TURNSTILE_SITE_KEY && !captchaToken) { setErr(CAPTCHA_PENDING); return; }
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken,
      });
      setTsReset((n) => n + 1);
      if (error) {
        // مهلةُ الوتيرة تُقاد بالعدّاد نفسه فيتحرّك رقمُها؛ وما سواها نصٌّ ثابت.
        const wait = waitSeconds(error.message);
        if (wait) { setLeft(wait); setWaiting(true); return; }
        setErr(toArabicAuthError(error.message));
        return;
      }
      logSignin(supabase, "password", "reset_requested", "forgot");
      markResetSent(); // ختمُ لحظة الإرسال — منه تُحسب مهلةُ شاشة التعيين
      setSent(true);
      setWaiting(false);
      setLeft(COOLDOWN);
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  /** رقمُه يتحرّك مع العدّاد، ويرفع نفسَه عند الصفر — فلا يبقى نصٌّ يكذب. */
  const waitAlert =
    waiting && left > 0 ? <Alert tone="danger">انتظر {left} ثانية ثمّ أعِد المحاولة.</Alert> : null;

  if (sent) {
    return (
      <div className="aauth-form">
        {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}
        {waitAlert}

        {/*
          البريدُ المكتوبُ يُعاد على المستخدم: هو ما أدخله هو، فعرضُه لا يفشي شيئًا عن
          الحسابات — ويكشف الخطأ المطبعيّ فورًا. هذا علاجُ «كتب بريده خطأً فظلّ ينتظر»
          دون التخلّي عن الردّ المحايد.
        */}
        {/* **الشرطُ في الرأس لا في ذيل الجملة** (المالك ٢٠٢٦-١٠-١٩: جرّب بريدًا وهميًّا فقرأها «أُرسل
            إلى الوهميّ»). والردُّ يبقى محايدًا: لا يُعرف من هنا أَلِلبريد حسابٌ أم لا — فالاستعادةُ لا
            تمرّ بالدرع كما يمرّ الرمز، وسؤالٌ عن الحساب بلا درعٍ بابُ تعدادٍ لكلّ من شاء. */}
        <Alert tone="info" title="إن كان لهذا البريد حسابٌ في أدِيب، فقد وصله الرابط">
          تفقّد <b className="font-latin" dir="ltr">{email.trim()}</b> واضغط الرابط لتعيين كلمة مرورٍ
          جديدة. صالحٌ {LINK_TTL_MIN} دقائق ولمرّةٍ واحدة. لم يصلك؟ تحقّق من مجلّد المهملات، أو من
          كتابة البريد — أو لعلّه ليس لك حسابٌ بعدُ.
        </Alert>

        {/* الدرعُ يبقى بعد الإرسال: إعادةُ الإرسال بريدٌ آخر، فتحتاج رمزًا آخر. */}
        {TURNSTILE_SITE_KEY ? (
          <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} />
        ) : null}

        {/* «يعمل الآن» بـ loading، و«غير متاح» بـ disabled — القاعدة ٧، ويجتمعان بلا تعارض */}
        <Button
          variant="primary"
          size="lg"
          className="aauth-submit"
          loading={pending}
          disabled={left > 0}
          onClick={send}
        >
          {left > 0 ? `أعِد الإرسال بعد ${left} ثانية` : "أعِد إرسال الرابط"}
        </Button>

        {/* تصحيحُ البريد يُلغي مهلةَ الوتيرة: حدُّ Supabase لكلّ **مستخدم**، وبريدٌ آخر مستخدمٌ آخر. */}
        <Button
          variant="ghost"
          size="md"
          className="aauth-back"
          onClick={() => { setSent(false); setWaiting(false); setLeft(0); setErr(null); }}
        >
          البريد خاطئ؟ عدّله
        </Button>

        <AltLink lead="ليس لك حسابٌ بعد؟" href="/signup">أنشئ حسابًا</AltLink>
      </div>
    );
  }

  return (
    <form className="aauth-form" onSubmit={submit} noValidate>
      {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}
      {waitAlert}

      <Field
        label="البريد الإلكترونيّ"
        type="email"
        charset="latin"
        icon={<Envelope />}
        innerIcon={<At />}
        placeholder="you@adeeb.club"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => setEmailTouched(true)}
        error={emailError(email, emailTouched)}
        required
      />

      {TURNSTILE_SITE_KEY ? (
        <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} />
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={pending}
        disabled={email.trim() === "" || (waiting && left > 0)}
        className="aauth-submit"
      >
        {waiting && left > 0 ? `أعِد المحاولة بعد ${left} ثانية` : "أرسل رابط الاستعادة"}
      </Button>

      <AltLink lead="تذكّرتَها؟" href="/login">بوّابة أدِيب</AltLink>
    </form>
  );
}
