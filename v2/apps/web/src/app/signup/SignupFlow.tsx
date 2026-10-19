"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field } from "@adeeb/design-system";
import { At, CalendarCheck, Compass, Envelope, HandHeart, Key, Lock } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { toArabicAuthError } from "@/lib/authErrors";
import { EMAIL_HINT, emailError, isEmail } from "@/lib/fieldFormats";
import { SIGNUP_EMAIL_KEY } from "@/lib/oauthIntent";
import { rememberSignin } from "@/lib/lastSignin";
import { CELEBRATE_MS, setDeeboMood } from "@/lib/deeboMood";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { AltLink, Back, Chip, Fields, Head, Note, Way, Ways } from "@/app/_door/parts";
import { DoorWays } from "@/app/_door/DoorWays";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
/** يطابق `password_min_length` في `scripts/auth-config.mjs` — لا يُغيَّر أحدُهما وحده. */
const MIN_PW = 8;

type Step = "why" | "ways" | "email";

/**
 * **لماذا جئت؟** — أوّلُ خطوةٍ للقادم الجديد (قرار المالك ٢٠٢٦-١٠-١٨، والفكرةُ من Duolingo الذي
 * يبدأ بسؤالك عمّا تريد لا بنموذج). وجوابُها **وجهتُه بعد الحساب**: من جاء ليحجز يجد الفعاليّات،
 * ومن جاء ليتطوّع يجد خطوتَه في صفحة التطوّع، ومن جاء ليتعرّف يجد بوّابتَه. وهذا جذرُ ما لاحظه
 * المالك صباحَ اليوم: كان كلُّ من فتح حسابًا يُرمى في طلب تطوّع.
 * ومن جاء بوجهةٍ (من صندوق الحجز أو صفحة التطوّع) لا يُسأل: جوابُه معه.
 *
 * **والتطوّعُ أوّلًا وبلون الهويّة** (المالك ٢٠٢٦-١٠-١٩ برأي Claude): لا يرى السؤالَ إلّا زائرٌ عامٌّ
 * بلا وجهة — الحاجزُ والمتطوّعُ يأتيان بوجهتهما فلا يُسألان — فيُقدَّم له ما يريده النادي أكثر،
 * كما يُقدَّم «انضمّ إلينا» في رأس الموقع زرًّا ملوّنًا وحيدًا.
 */
const WHY = [
  { key: "volunteer", label: "أتطوّع مع أدِيب", Icon: HandHeart, to: "/join#step", reply: "بعد حسابك تجد خطوةَ التطوّع أمامك." },
  { key: "book", label: "أحجز فعاليّة", Icon: CalendarCheck, to: "/activities", reply: "بعد حسابك تجد الفعاليّات تنتظرك." },
  { key: "explore", label: "أتعرّف على أدِيب", Icon: Compass, to: "/dashboard", reply: "بعد حسابك تجد بوّابتك في أدِيب." },
] as const;

export function SignupFlow({ next: given, askWhy }: { next: string; askWhy: boolean }) {
  const router = useRouter();
  const [sb] = useState(() => createClient());
  const [step, setStep] = useState<Step>(askWhy ? "why" : "ways");
  const [next, setNext] = useState(given);
  const [why, setWhy] = useState<(typeof WHY)[number] | null>(null);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  const [emailTouched, setEmailTouched] = useState(false);

  // من ردّته البوّابةُ بـ«لا حسابَ بهذا البريد» يجد بريدَه مكتوبًا وخطوتَه مفتوحة
  useEffect(() => {
    try {
      const v = sessionStorage.getItem(SIGNUP_EMAIL_KEY);
      sessionStorage.removeItem(SIGNUP_EMAIL_KEY);
      if (v) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- ذاكرةُ المتصفّح بعد الترطيب
        setEmail(v);
        setStep("email");
      }
    } catch { /* يكتبه من جديد */ }
  }, []);

  // ── ديبو يعيش الخطوة: يكتب اسمك في دفتره، ويُغمض عينيه عند كلمة المرور ──
  const [focus, setFocus] = useState<"email" | "password" | null>(null);
  const [hush, setHush] = useState(false);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- خطأٌ جديدٌ يُعيد الاعتذار
    if (err) setHush(false);
  }, [err]);
  useEffect(() => {
    setDeeboMood(ok ? "success" : busy ? "busy" : err && !hush ? "error" : focus ?? "idle");
  }, [ok, busy, err, hush, focus]);
  const on = (f: "email" | "password") => ({ onFocus: () => { setFocus(f); setHush(true); }, onBlur: () => setFocus(null) });

  const go = (s: Step) => { setErr(null); setFocus(null); setStep(s); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!isEmail(email)) { setEmailTouched(true); setErr(`${EMAIL_HINT}.`); return; }
    if (pw.length < MIN_PW) { setErr(`كلمة المرور ${MIN_PW} أحرفٍ فأكثر.`); return; }
    setBusy(true);
    const { data, error } = await sb.auth.signUp({ email: email.trim(), password: pw, options: { captchaToken: tsToken ?? undefined } });
    setBusy(false);
    if (error) { setTsReset((n) => n + 1); setErr(toArabicAuthError(error.message)); return; }
    // بلا جلسةٍ لا يمضي: يقع هذا لو أُعيد تشغيل تأكيد البريد يومًا في إعداد المصادقة
    if (!data.session) { setErr("أُنشئ حسابك. افتح بريدك لتأكيده ثمّ ادخل من بوّابة أدِيب."); return; }
    rememberSignin("password");
    setOk(true);
    setTimeout(() => { router.replace(next); router.refresh(); }, CELEBRATE_MS);
  };

  const portalHref = `/login?next=${encodeURIComponent(next)}`;
  const oops = err ? <Note tone="error" title="عذرًا">{err}</Note> : null;
  const alt = <AltLink lead="لك حسابٌ في أدِيب؟" href={portalHref}>بوّابة أدِيب</AltLink>;

  return (
    <>
      {step === "why" ? (
        <section key="why" className="door-step">
          <Head kicker="حيّاك الله" sub="جوابُك يحدّد أين تجد نفسك بعد الحساب.">ما الذي جاء بك؟</Head>
          {/* التطوّعُ مقدَّمٌ بلون الهويّة، والآخران بإطارها */}
          <Ways label="ما الذي جاء بك">
            {WHY.map((w) => (
              <Way key={w.key} main={w.key === "volunteer"} icon={<w.Icon size={20} />} onClick={() => { setWhy(w); setNext(w.to); go("ways"); }}>
                {w.label}
              </Way>
            ))}
          </Ways>
          {alt}
        </section>
      ) : null}

      {step === "ways" ? (
        <section key="ways" className="door-step">
          {askWhy && why ? <Chip label="تغيير سبب مجيئك" onEdit={() => go("why")}>{why.label}</Chip> : null}
          <Head sub={why ? why.reply : "حسابٌ واحدٌ لكلّ ما في أدِيب."}>أنشئ حسابك</Head>
          {oops}
          <DoorWays intent="signup" next={next} onEmail={() => go("email")} onError={setErr} />
          {alt}
        </section>
      ) : null}

      {step === "email" ? (
        <form key="email" className="door-step" noValidate onSubmit={submit}>
          <Back onClick={() => go("ways")}>طرقُ الإنشاء</Back>
          <Head sub="حسابٌ واحدٌ لكلّ ما في أدِيب.">حسابٌ ببريدك</Head>
          {oops}
          <Fields>
            <Field
              label="البريد الإلكترونيّ" type="email" charset="latin" icon={<Envelope />} innerIcon={<At />}
              placeholder="you@example.com" autoComplete="email" autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)}
              {...on("email")} onBlur={() => { setEmailTouched(true); setFocus(null); }}
              error={emailError(email, emailTouched)} required
            />
            <Field
              label="كلمة المرور" type="password" dir="ltr" icon={<Lock />} innerIcon={<Key />}
              placeholder="••••••••" autoComplete="new-password" helper={`${MIN_PW} أحرفٍ فأكثر`}
              value={pw} onChange={(e) => setPw(e.target.value)} {...on("password")} required
            />
            {TURNSTILE_SITE_KEY ? <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} /> : null}
            <Button type="submit" variant="primary" size="lg" loading={busy}>إنشاء الحساب</Button>
          </Fields>
          {alt}
        </form>
      ) : null}
    </>
  );
}
