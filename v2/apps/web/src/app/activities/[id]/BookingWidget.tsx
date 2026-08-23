"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Field, Select, Textarea } from "@adeeb/design-system";
import {
  At, Envelope, Hash, IdentificationBadge, Key, MapPin, Phone, User, UsersThree } from "@phosphor-icons/react";
import { CheckCircle, PencilSimple } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { AUDIENCE_LABEL, GENDER_OPTIONS } from "@/lib/activities";
import {
  EMAIL_HINT, PHONE_HINT, PHONE_LEN, PHONE_PREFIX, emailError, isEmail, isPhone, phoneError,
} from "@/lib/fieldFormats";
import { arabicNameError } from "@/lib/personName";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Step = "loading" | "email" | "otp" | "profile" | "ready" | "booked" | "unavailable";

type Booked = { id: string; gender: "male" | "female"; whatsappConfirmed: boolean };

// رموز أخطاء book/cancel (RAISE EXCEPTION) → عربيّة — تُلتقَط بالاحتواء.
const BOOK_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "انتهت الجلسة. أعد إدخال بريدك.",
  ACTIVITY_NOT_FOUND: "لم نعثر على الفعاليّة.",
  ACTIVITY_NOT_PUBLISHED: "الفعاليّة غير متاحة للحجز.",
  ACTIVITY_CANCELLED: "أُلغيت هذه الفعاليّة.",
  ACTIVITY_PAST: "انتهى وقت هذه الفعاليّة.",
  GENDER_REQUIRED: "لم نتعرّف على فئتك. أكمِل بياناتك.",
  ALREADY_BOOKED: "لديك حجزٌ مؤكّد في هذه الفعاليّة.",
  NO_SEATS_AVAILABLE_FOR_GENDER: "لا مقاعد متاحة لفئتك حاليًّا.",
  NO_SEATS_AVAILABLE: "اكتملت المقاعد.",
  WRONG_GENDER: "هذه الفعاليّة موجَّهة لجنسٍ آخر.",
  REASON_REQUIRED: "سبب الإلغاء مطلوب.",
  RESERVATION_NOT_FOUND: "لم نعثر على الحجز.",
  NOT_OWNER: "هذا الحجز ليس لك.",
  // أخطاء `create_my_account_profile` — بابُ الزائر إلى صفّه
  NAME_REQUIRED: "الاسم مطلوب.",
  NAME_NOT_ARABIC: "اكتب الاسم بالحروف العربيّة وحدها.",
  PHONE_INVALID: `${PHONE_HINT}.`,
  PROFILE_EXISTS: "بياناتك محفوظةٌ سلفًا. أعِد تحميل الصفحة.",
};
const bookError = (raw: string | null | undefined): string => {
  const code = Object.keys(BOOK_ERRORS).find((c) => (raw ?? "").includes(c));
  return code ? BOOK_ERRORS[code] : "تعذّر إتمام العمليّة. حاول مجدّدًا.";
};
const authError = (raw: string): string => {
  const m = raw.toLowerCase();
  if (m.includes("rate") || m.includes("too many")) return "محاولات كثيرة. انتظر قليلًا ثمّ أعِد المحاولة.";
  if (m.includes("expired") || m.includes("invalid")) return "الرمز غير صحيح أو انتهت صلاحيّته. اطلب رمزًا جديدًا.";
  return "تعذّرت العمليّة. حاول مجدّدًا.";
};

export function BookingWidget({ activityId, unlimited, splitByGender, targetGender, totalRemaining, maleRemaining, femaleRemaining }: { activityId: string; unlimited: boolean; splitByGender: boolean; targetGender: "male" | "female" | null; totalRemaining: number; maleRemaining: number | null; femaleRemaining: number | null }) {
  const [sb] = useState(() => createClient());
  const [step, setStep] = useState<Step>("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [reason, setReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [booked, setBooked] = useState<Booked | null>(null);
  // درعُ إرسال الرمز — هذا أوسعُ أبواب البريد في الموقع (يُرسل لأيّ عنوانٍ يُكتب)، فلا يُترك
  // بلا حارس. والرمزُ يُستهلك مرّةً، فيُعاد ضبطُ الودجة بعد كلّ إرسال.
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  /** رايتا الصيغة تُرفعان عند مغادرة الحقل أو عند الإرسال — لا والزائر يكتب أوّلَ محرف. */
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  // النمط المشترك: أيّ جنسٍ متاحٌ ما دام في الإجمالي متّسع؛ المقسّم: لكلّ جنسٍ سقفُه
  const genderAvailable = (g: "male" | "female") => {
    if (targetGender && g !== targetGender) return false;   // موجَّهة لجنسٍ آخر
    return unlimited ? true : splitByGender ? (g === "male" ? (maleRemaining ?? 0) > 0 : (femaleRemaining ?? 0) > 0) : totalRemaining > 0;
  };
  const bothFull = unlimited ? false : splitByGender ? (maleRemaining ?? 0) <= 0 && (femaleRemaining ?? 0) <= 0 : totalRemaining <= 0;
  const genderOptions = GENDER_OPTIONS.filter((o) => genderAvailable(o.value));

  /** يوجّه المستخدم بحسب حالته: مصادَق؟ له حجز مؤكّد؟ له فئة (عضو/زائر)؟ */
  const route = async () => {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setStep("email"); return; }
      setEmail(user.email ?? "");

      const { data: resv } = await sb
        .from("activity_reservations")
        .select("id, gender_at_booking, whatsapp_confirmed_at")
        .eq("activity_id", activityId)
        .eq("status", "confirmed")
        .limit(1)
        .maybeSingle();
      if (resv) {
        setBooked({ id: resv.id, gender: resv.gender_at_booking, whatsappConfirmed: resv.whatsapp_confirmed_at != null });
        setStep("booked");
        return;
      }

      // بيتٌ واحدٌ يُسأل بعد توحيد الهويّة (م١): `profiles` صار صفَّ كلِّ صاحبِ حساب —
      // عضوًا كان أو زائرًا — و`visitors` حُنّط. ومن لا صفَّ له فحسابٌ بلا بيانات.
      const { data: prof } = await sb.from("profiles").select("gender").eq("id", user.id).maybeSingle();
      const g = (prof?.gender ?? null) as "male" | "female" | null;
      if (g) {
        setGender(g);
        setStep(genderAvailable(g) ? "ready" : "unavailable");
      } else {
        // مصادَق بلا ملفّ — زائر جديد: إن كان صنفٌ واحد متاحًا فاختره سلفًا
        if (genderOptions.length === 1) setGender(genderOptions[0].value);
        setStep(bothFull ? "unavailable" : "profile");
      }
    } catch {
      setStep("email");
    }
  };

  // تهيئةٌ عند التركيب — قراءةُ حالة الجلسة والحجز من Supabase (نظامٌ خارجيّ)؛ كلّ setState
  // فيها يقع بعد await فلا يتزامن، وroute تُعيد التوجيه بعد كلّ فعل لاحق أيضًا.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تهيئةٌ غير متزامنة من نظامٍ خارجيّ
    void route();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendOtp = async () => {
    setErr(null);
    if (!email.trim()) { setErr("أدخل بريدك الإلكترونيّ."); return; }
    // بريدٌ مكسورُ الصيغة يُرسَل إلى العدم: الرمزُ يذهب ولا يصل، فينتظره الزائرُ ولا يجيء
    if (!isEmail(email)) { setEmailTouched(true); setErr(`${EMAIL_HINT}.`); return; }
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, captchaToken: tsToken ?? undefined },
    });
    setBusy(false);
    setTsReset((n) => n + 1);
    if (error) { setErr(authError(error.message)); return; }
    setNotice("أرسلنا رمزًا إلى بريدك. أدخِله أدناه.");
    setStep("otp");
  };

  const verify = async () => {
    setErr(null);
    if (otp.trim().length < 6) { setErr("أدخل الرمز المكوّن من ٦ أرقام."); return; }
    setBusy(true);
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: "email" });
    if (error) { setBusy(false); setErr(authError(error.message)); return; }
    setNotice(null);
    setStep("loading");
    await route();
    setBusy(false);
  };

  const book = async () => {
    setErr(null);
    setBusy(true);
    const { error } = await sb.rpc("book_activity_seat", { p_activity_id: activityId });
    if (error) { setBusy(false); setErr(bookError(error.message)); return; }
    await route();
    setBusy(false);
  };

  const submitProfile = async () => {
    setErr(null);
    if (!name.trim()) { setErr("الاسم مطلوب."); return; }
    const nameErr = arabicNameError(name);
    if (nameErr) { setNameTouched(true); setErr(`${nameErr}.`); return; }
    if (!phone.trim()) { setErr("رقم الجوّال مطلوب."); return; }
    if (!isPhone(phone)) { setPhoneTouched(true); setErr(`${PHONE_HINT}.`); return; }
    if (!gender) { setErr("اختر فئتك."); return; }
    setBusy(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setBusy(false); setStep("email"); return; }
    // بابُ الزائر إلى صفِّه: دالّةٌ مفوَّضة تكتب `joined_date` فارغًا — فيملك حسابًا ولا
    // يملك أن يجعل نفسه عضوًا (الإدراجُ المباشر في `profiles` صار على قدرةٍ إداريّة).
    const { error } = await sb.rpc("create_my_account_profile", {
      p_full_name: name.trim(),
      p_phone: phone.trim(),
      p_gender: gender,
      p_city: city.trim() || null,
      p_accepts_marketing: true,
    });
    if (error) { setBusy(false); setErr(bookError(error.message)); return; }
    // بعد حفظ الملفّ نحجز مباشرةً (تدفّق واحد)
    const { error: bErr } = await sb.rpc("book_activity_seat", { p_activity_id: activityId });
    if (bErr) { setBusy(false); setErr(bookError(bErr.message)); return; }
    await route();
    setBusy(false);
  };

  const cancel = async () => {
    setErr(null);
    setBusy(true);
    const { error } = await sb.rpc("cancel_activity_reservation", {
      p_reservation_id: booked?.id, p_reason: reason.trim() || "إلغاء من صاحب الحجز",
    });
    if (error) { setBusy(false); setErr(bookError(error.message)); return; }
    setShowCancel(false); setReason(""); setBooked(null);
    await route();
    setBusy(false);
  };

  /* ── العرض بحسب الخطوة ── */

  if (step === "loading") return <div className="text-content-muted text-sm">…جارٍ التحقّق</div>;

  if (step === "unavailable") {
    if (targetGender && gender && gender !== targetGender) {
      return <Alert tone="warning" title="مخصّصة لفئة أخرى">هذه الفعاليّة موجَّهة {AUDIENCE_LABEL[targetGender]} فقط.</Alert>;
    }
    return <Alert tone="warning" title="اكتملت المقاعد">لا مقاعد متاحة لفئتك حاليًّا. تابعنا لفعاليّاتٍ قادمة.</Alert>;
  }

  if (step === "booked" && booked) {
    return (
      <Alert tone="success" title="حجزك مؤكّد" icon={<CheckCircle />}>
        <div className="flex flex-col gap-3">
          <span>
            احتفظنا بمقعدك. سنتواصل معك عبر واتساب لتأكيد الحضور، وحجزُك محفوظٌ في{" "}
            <a className="font-bold underline" href="/me">حسابك</a>.
          </span>
          {err ? <span className="text-danger text-sm">{err}</span> : null}
          {!showCancel ? (
            <div className="btn-row"><Button variant="ghost-danger" size="sm" onClick={() => setShowCancel(true)}>إلغاء الحجز</Button></div>
          ) : (
            <div className="flex flex-col gap-2">
              <Textarea label="سبب الإلغاء" icon={<PencilSimple />} innerIcon={<PencilSimple />} placeholder="اختياريّ" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} optional />
              <div className="btn-row">
                <Button variant="danger" size="sm" loading={busy} onClick={cancel}>تأكيد الإلغاء</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)} disabled={busy}>تراجع</Button>
              </div>
            </div>
          )}
        </div>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}

      {step === "email" ? (
        <>
          <p className="text-sm text-content-muted">أدخل بريدك ليصلك رمز تأكيد، بلا كلمة مرور.</p>
          <Field label="البريد الإلكترونيّ" type="email" charset="latin" icon={<Envelope />} innerIcon={<At />} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setEmailTouched(true)} error={emailError(email, emailTouched)} required />
          {TURNSTILE_SITE_KEY ? (
            <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} />
          ) : null}
          <Button variant="primary" size="md" loading={busy} onClick={sendOtp}>إرسال الرمز</Button>
        </>
      ) : null}

      {step === "otp" ? (
        <>
          <Field label="رمز التأكيد" charset="digits" icon={<Key />} innerIcon={<Hash />} placeholder="______" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} required />
          {/* الدرعُ باقٍ ههنا لأجل «إعادة الإرسال» — إرسالٌ آخر يحتاج رمزًا آخر. */}
          {TURNSTILE_SITE_KEY ? (
            <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} />
          ) : null}
          <div className="btn-row">
            <Button variant="primary" size="md" loading={busy} onClick={verify}>تأكيد</Button>
            <Button variant="ghost" size="md" onClick={sendOtp} disabled={busy}>إعادة الإرسال</Button>
          </div>
        </>
      ) : null}

      {step === "profile" ? (
        <>
          <p className="text-sm text-content-muted">أكمِل بياناتك مرّةً واحدة لإتمام الحجز.</p>
          <Field label="الاسم الكامل" icon={<User />} innerIcon={<PencilSimple />} placeholder="اسمك الثلاثيّ" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setNameTouched(true)} error={nameTouched ? arabicNameError(name) ?? undefined : undefined} required />
          <Field label="رقم الجوّال" type="tel" charset="digits" maxLength={PHONE_LEN} prefix={PHONE_PREFIX} icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setPhoneTouched(true)} error={phoneError(phone, phoneTouched)} required />
          <Select label="الجنس" icon={<UsersThree />} options={genderOptions} value={gender} onValueChange={(v) => setGender(v as "male" | "female")} required />
          <Field label="المدينة" icon={<MapPin />} innerIcon={<IdentificationBadge />} placeholder="مدينتك" value={city} onChange={(e) => setCity(e.target.value)} optional />
          <Button variant="primary" size="md" loading={busy} onClick={submitProfile}>تأكيد الحجز</Button>
        </>
      ) : null}

      {step === "ready" ? (
        <>
          <p className="text-sm text-content-muted">أنت مسجّل الدخول، احجز مقعدك بضغطة.</p>
          <Button variant="primary" size="md" loading={busy} onClick={book}>احجز مقعدي</Button>
        </>
      ) : null}
    </div>
  );
}
