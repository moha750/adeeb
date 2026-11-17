"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Field, Select, Textarea } from "@adeeb/design-system";
import { Armchair, Hash, IdentificationBadge, MapPin, Phone, SignIn, Ticket, User, UserPlus, UsersThree } from "@phosphor-icons/react";
import { PencilSimple, XCircle } from "@/app/_components/glyphs";
import { AdButton } from "@/app/_ad/primitives";
import { AdSection } from "@/app/_ad/account";
import { FormHint } from "@/app/_ad/form";
import { createClient } from "@/lib/supabase/client";
import { AUDIENCE_LABEL, GENDER_OPTIONS } from "@/lib/activities";
import { AR_SEAT, arCount } from "@/lib/arabicCount";
import { PHONE_HINT, PHONE_LEN, PHONE_PREFIX, isPhone, phoneError } from "@/lib/fieldFormats";
import { arabicNameError, firstNameOf } from "@/lib/personName";
/**
 * **ولا يُنشأ حسابٌ ههنا** (قرار المالك ٢٠٢٦-١٠-١٨): كان الصندوقُ يفتح حسابًا ببريدٍ ورمز، فصار
 * لإنشاء الحساب بابٌ واحد (`/signup`) وللدخول بابٌ واحد (`/login`). ومن لا جلسةَ له يرى زرّين
 * إليهما، ويعود بعدهما إلى هذه الفعاليّة **وصندوقُ الحجز أمامه** (`#book`)، فيُكمل بياناته
 * ويحجز. ورأى المالكُ الانتقالَ مألوفًا؛ وشرطُه أن يُقاس: الحجوزاتُ قبله وبعده.
 */
type Step = "loading" | "auth" | "profile" | "ready" | "booked" | "unavailable";

type Booked = { id: string; gender: "male" | "female"; whatsappConfirmed: boolean };

// رموز أخطاء book/cancel (RAISE EXCEPTION) → عربيّة — تُلتقَط بالاحتواء.
const BOOK_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "انتهت الجلسة. ادخل من بوّابة أدِيب من جديد.",
  ACTIVITY_NOT_FOUND: "لم نعثر على الفعاليّة.",
  ACTIVITY_NOT_PUBLISHED: "الفعاليّة غير متاحة للحجز.",
  ACTIVITY_CANCELLED: "أُلغيت هذه الفعاليّة.",
  ACTIVITY_PAST: "انتهى وقت هذه الفعاليّة.",
  BOOKING_CLOSED: "أُغلق التسجيل في هذه الفعاليّة.",
  GENDER_REQUIRED: "لم نتعرّف على فئتك. أكمِل بياناتك.",
  ALREADY_BOOKED: "لديك حجزٌ مؤكّد في هذه الفعاليّة.",
  NO_SEATS_AVAILABLE_FOR_GENDER: "لا مقاعد متاحة لفئتك حاليًّا.",
  NO_SEATS_AVAILABLE: "اكتملت المقاعد.",
  WRONG_GENDER: "هذه الفعاليّة موجَّهة لجنسٍ آخر.",
  REASON_REQUIRED: "سبب الإلغاء مطلوب.",
  RESERVATION_NOT_FOUND: "لم نعثر على الحجز.",
  NOT_OWNER: "هذا الحجز ليس لك.",
  // أخطاء `create_my_account_profile` — بابُ صديق أدِيب إلى صفّه
  NAME_REQUIRED: "الاسم مطلوب.",
  NAME_NOT_ARABIC: "اكتب الاسم بالحروف العربيّة وحدها.",
  PHONE_INVALID: `${PHONE_HINT}.`,
  PROFILE_EXISTS: "بياناتك محفوظةٌ سلفًا. أعِد تحميل الصفحة.",
};
const bookError = (raw: string | null | undefined): string => {
  const code = Object.keys(BOOK_ERRORS).find((c) => (raw ?? "").includes(c));
  return code ? BOOK_ERRORS[code] : "تعذّر إتمام العمليّة. حاول مجدّدًا.";
};

/**
 * **ما يرسمه الحجزُ أجزاء**: يسلّم صاحبَه **حالَك** (`title` جملتُها، و`sub` شرحُها، و`tone` نغمتُها)، و**الفعل** (`acts`)، و**ما يحتاج
 * مساحةً** (`panel`: إكمالُ البيانات مرّةً، وسببُ الإلغاء). وصفحةُ الفعاليّة ترسمها **تنبيهًا** (`AdNote`) تحت التذكرة (محمد ٢٠٢٦-١١-١٦:
 * «بما أنّ احجز مقعدي يتغيّر بحسب الحساب أو الحال، ما رأيك أن يتحوّل إلى تنبيه؟»): الحالُ رسالةٌ لك وحدك، والتذكرةُ حقائقُ لكلّ من يراها.
 * **وأفعالُ التنبيه صناديقُ بختم لونه برموزها** (`AdButton soft`، قاعدةُ التنبيه في البوّابة: «قطعةُ اللوح المصمتة تنافس ختمَ التنبيه نفسَه»)،
 * والخطِرُ (إلغاءُ الحجز) صندوقُه الأحمر.
 * (كان قسمًا كاملًا برأسه «مبالغ… ماخذ مساحة جدًّا كبيرة»، ثمّ جملةً في قاع التذكرة.)
 */
export type BookingParts = { title: ReactNode; sub?: ReactNode; tone?: "info" | "ok" | "warn" | "bad"; live?: boolean; acts?: ReactNode; panel?: ReactNode;
  /** ختمٌ خاصٌّ بالحال: `full` المكتملة (رمزُ الجمع لا رمزُ التنبيه) */
  icon?: "full" };
export function BookingWidget({ activityId, unlimited, splitByGender, targetGender, totalRemaining, maleRemaining, femaleRemaining, render }: { activityId: string; unlimited: boolean; splitByGender: boolean; targetGender: "male" | "female" | null; totalRemaining: number; maleRemaining: number | null; femaleRemaining: number | null;
  render: (parts: BookingParts) => ReactNode }) {
  const [sb] = useState(() => createClient());
  const [step, setStep] = useState<Step>("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // يعود من البابين إلى الصفحة نفسها عند صندوق الحجز
  const back = encodeURIComponent(`${usePathname()}#book`);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [reason, setReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [booked, setBooked] = useState<Booked | null>(null);
  /** اسمُ صاحب الجلسة الأوّلُ للتحيّة («أهلًا محمد») — من صفّه في `profiles` إن كان له صفّ */
  const [hello, setHello] = useState<string | null>(null);
  /** رايتا الصيغة تُرفعان عند مغادرة الحقل أو عند الإرسال — لا والزائر يكتب أوّلَ محرف. */
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  // النمط المشترك: أيّ جنسٍ متاحٌ ما دام في الإجمالي متّسع؛ المقسّم: لكلّ جنسٍ سقفُه
  const genderAvailable = (g: "male" | "female") => {
    if (targetGender && g !== targetGender) return false;   // موجَّهة لجنسٍ آخر
    return unlimited ? true : splitByGender ? (g === "male" ? (maleRemaining ?? 0) > 0 : (femaleRemaining ?? 0) > 0) : totalRemaining > 0;
  };
  const bothFull = unlimited ? false : splitByGender ? (maleRemaining ?? 0) <= 0 && (femaleRemaining ?? 0) <= 0 : totalRemaining <= 0;
  const genderOptions = GENDER_OPTIONS.filter((o) => genderAvailable(o.value));

  /** يوجّه المستخدم بحسب حالته: مصادَق؟ له حجز مؤكّد؟ له فئة (عضو/صديق أدِيب)؟ */
  const route = async () => {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setStep("auth"); return; }

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
      // عضوًا كان أو صديقًا لأدِيب — و`visitors` حُنّط. ومن لا صفَّ له فحسابٌ بلا بيانات.
      const { data: prof } = await sb.from("profiles").select("gender, full_name").eq("id", user.id).maybeSingle();
      const g = (prof?.gender ?? null) as "male" | "female" | null;
      if (prof?.full_name) setHello(firstNameOf(prof.full_name));
      if (g) {
        setGender(g);
        setStep(genderAvailable(g) ? "ready" : "unavailable");
      } else {
        // مصادَق بلا ملفّ — صديقٌ جديد: إن كان صنفٌ واحد متاحًا فاختره سلفًا
        if (genderOptions.length === 1) setGender(genderOptions[0].value);
        setStep(bothFull ? "unavailable" : "profile");
      }
    } catch {
      setStep("auth");
    }
  };

  // تهيئةٌ عند التركيب — قراءةُ حالة الجلسة والحجز من Supabase (نظامٌ خارجيّ)؛ كلّ setState
  // فيها يقع بعد await فلا يتزامن، وroute تُعيد التوجيه بعد كلّ فعل لاحق أيضًا.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تهيئةٌ غير متزامنة من نظامٍ خارجيّ
    void route();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!user) { setBusy(false); setStep("auth"); return; }
    // بابُ صديق أدِيب إلى صفِّه: دالّةٌ مفوَّضة تكتب `joined_date` فارغًا — فيملك حسابًا ولا
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

  /* ── العرض بحسب الخطوة ──
     أجزاءٌ بقطع الهويّة (٢٠٢٦-١١-١٦): الحالُ جملةٌ بنغمتها في قاع التذكرة، والفعلُ زرُّ الهويّة (`AdButton`: الأساسيُّ قطعةٌ من اللوح)،
     والحقولُ حقولُ النماذج نفسُها في قسمٍ تحت التذكرة. والسلوكُ كما كان حرفًا. */

  // الخطأُ يُقال حيث وقع الفعل: في القسم إن كان مفتوحًا، وإلّا جملةَ الحال في القاع
  const errLine = err ? <FormHint tone="bad">{err}</FormHint> : null;

  if (step === "loading") return render({ title: "جارٍ التحقّق…", tone: "info" });

  // ready: كم بقي لفئتك — والصفرُ حالٌ («مكتملة») لا «باقٍ 0 مقعد» تحته «احجز مقعدي» (محمد ٢٠٢٦-١١-١٦: «فلماذا؟»)
  const left = unlimited ? null : splitByGender ? (gender === "male" ? maleRemaining : femaleRemaining) : totalRemaining;
  const isFull = step === "ready" && left != null && left <= 0;

  if (step === "unavailable" || isFull) {
    if (targetGender && gender && gender !== targetGender) {
      return render({ title: "مخصّصة لفئة أخرى", sub: `هذه الفعاليّة موجَّهة ${AUDIENCE_LABEL[targetGender]} فقط.`, tone: "warn" });
    }
    // **المكتملةُ حالٌ هادئة** لا تحذير (محمد ٢٠٢٦-١١-١٦: الكهرمانيُّ «غير جميل أبدًا»): الامتلاءُ نجاحُ الفعاليّة لا خطرٌ عليك
    return render({ title: "مكتملة", sub: "اكتملت المقاعد المتاحة لفئتك. تابعنا لفعاليّاتٍ قادمة.", tone: "info", icon: "full" });
  }

  if (step === "booked" && booked) {
    // **«مؤكَّد» بعد واتساب لا قبله**: الحجزُ يحفظ المقعد، والتأكيدُ اتّصالٌ يأتي بعده — فلا يُقال «مؤكَّد» لمن لم يُتّصَل به بعد
    // (كما تقوله «حجوزاتي» نفسُها).
    const failed = err && !showCancel;
    return render({
      title: failed ? err : booked.whatsappConfirmed ? "حجزُك مؤكَّد" : "حُفظ مقعدُك",
      sub: failed ? undefined : booked.whatsappConfirmed ? "أكّدنا حضورك، ومقعدُك محفوظ." : "سنتواصل معك عبر واتساب لتأكيد حضورك.",
      tone: failed ? "bad" : "ok", live: true,
      acts: (
        <>
          <AdButton variant="soft" size="sm" icon={<Ticket />} href="/dashboard/bookings">حجوزاتي</AdButton>
          {showCancel ? null : <AdButton variant="danger" size="sm" icon={<XCircle />} onClick={() => setShowCancel(true)}>إلغاء الحجز</AdButton>}
        </>
      ),
      panel: showCancel ? (
        <AdSection icon={<XCircle />} title="إلغاء الحجز" foot={
          <div className="ad-bk">
            {errLine}
            <Textarea label="سبب الإلغاء" icon={<PencilSimple />} innerIcon={<PencilSimple />} placeholder="اختياريّ" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} optional />
            <div className="ad-bk-row">
              <AdButton variant="danger-fill" size="sm" busy={busy} onClick={cancel}>تأكيد الإلغاء</AdButton>
              <AdButton variant="quiet" size="sm" held={busy} onClick={() => setShowCancel(false)}>تراجع</AdButton>
            </div>
          </div>
        } />
      ) : undefined,
    });
  }

  if (step === "profile") {
    return render({
      title: "أكمِل بياناتك مرّةً واحدة",
      sub: "وبعدها يُحجز مقعدُك مباشرةً.",
      tone: "info",
      panel: (
        <AdSection icon={<IdentificationBadge />} title="بياناتك" foot={
          <div className="ad-bk">
            {errLine}
            <Field label="الاسم الكامل" icon={<User />} innerIcon={<PencilSimple />} placeholder="اسمك الثلاثيّ" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setNameTouched(true)} error={nameTouched ? arabicNameError(name) ?? undefined : undefined} required />
            <Field label="رقم الجوّال" type="tel" charset="digits" maxLength={PHONE_LEN} prefix={PHONE_PREFIX} icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setPhoneTouched(true)} error={phoneError(phone, phoneTouched)} required />
            <Select label="الجنس" icon={<UsersThree />} options={genderOptions} value={gender} onValueChange={(v) => setGender(v as "male" | "female")} required />
            <Field label="المدينة" icon={<MapPin />} innerIcon={<IdentificationBadge />} placeholder="مدينتك" value={city} onChange={(e) => setCity(e.target.value)} optional />
            <div className="ad-bk-row"><AdButton variant="fill" busy={busy} onClick={submitProfile}>تأكيد الحجز</AdButton></div>
          </div>
        } />
      ),
    });
  }

  if (step === "auth") {
    // **المكتملةُ تقولها قبل الدخول** (إصلاح ٢٠٢٦-١١-١٦): كان من لا جلسةَ له يُدعى إلى إنشاء حسابٍ ليحجز في فعاليّةٍ لا مقعدَ فيها، ثمّ
    // يعود فيجد «اكتملت المقاعد». فالمكتملةُ لكلّ فئةٍ تقول ذلك من أوّلها، ولا تدعو إلى البابين
    if (bothFull) return render({ title: "مكتملة", sub: "اكتملت المقاعد كلُّها. تابعنا لفعاليّاتٍ قادمة.", tone: "info", icon: "full" });
    // **أوضحُ وألطف** (محمد ٢٠٢٦-١١-١٦): يقول البابين بأسمائهما — حسابٌ جديد، أو دخولٌ لمن له حساب — وأنّه يعود إلى هنا
    return render({
      title: err ?? "احجز مقعدك بحسابك في أدِيب",
      sub: err ? undefined : "أنشئ حسابك في دقيقة، أو سجّل الدخول إن كان لديك حساب، وتعود إلى هنا لتُتمّ حجزك.",
      tone: err ? "bad" : "info",
      acts: (
        <>
          <AdButton variant="soft" size="sm" icon={<UserPlus />} href={`/signup?next=${back}`}>أنشئ حسابًا</AdButton>
          <AdButton variant="soft" size="sm" icon={<SignIn />} href={`/login?next=${back}`}>سجّل الدخول</AdButton>
        </>
      ),
    });
  }

  // **تحيّةٌ باسمه** (محمد ٢٠٢٦-١١-١٦: «لماذا لا تكون ألطف؟ أهلًا محمد…»)، والفعلُ بجنس صاحبه
  const go = gender === "female" ? "احجزي مقعدك" : "احجز مقعدك";
  return render({
    title: err ?? (left == null ? "التسجيلُ مفتوح" : `باقٍ ${arCount(left, AR_SEAT)}${splitByGender && gender ? ` ${AUDIENCE_LABEL[gender]}` : ""}`),
    sub: err ? undefined : hello ? `أهلًا ${hello}، ${go} بضغطة زرّ.` : `${go} بضغطة زرّ.`,
    tone: err ? "bad" : "info",
    acts: <AdButton variant="soft" size="sm" icon={<Armchair />} busy={busy} onClick={book}>احجز مقعدي</AdButton>,
  });
}
