"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, Select } from "@adeeb/design-system";
import {
  BookOpen, Books, Buildings, Cake, CalendarBlank, Certificate, GraduationCap, Hash, IdentificationBadge, IdentificationCard, Phone,
  SquaresFour, User, UserGear, UsersThree,
} from "@phosphor-icons/react";
import { Back, Btn, Fields, Head, Note, Way, Ways } from "@/app/_door/parts";
import { AdButton } from "@/app/_ad/primitives";
import { SignOut } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import { DoorShell } from "@/app/_door/DoorShell";
import { setDeeboMood } from "@/lib/deeboMood";
import { firstNameOf, arabicNameError, ARABIC_NAME_HINT } from "@/lib/personName";
import {
  DEGREES, GENDERS, NATIONAL_ID_HINT, NATIONAL_ID_LEN, NATIONAL_ID_RE, PHONE_HINT, PHONE_LEN, PHONE_PREFIX, PHONE_RE,
  RECORD_NO_HINT, RECORD_NO_MAX, RECORD_NO_RE, hasAcademicFields,
} from "@/lib/membershipFields";
import { emptyComplete, type CompleteInput } from "./vocab";
import { completeMyRecord } from "./actions";

export type Prefill = { fullName: string; phone: string; gender: string };
type Step = "me" | "study" | "done";

/** حقولُ الخطوة الأولى: إليها يُعاد صاحبُها إن ردّ الخادمُ واحدًا منها */
const ME_KEYS: (keyof CompleteInput)[] = ["full_name_triple", "national_id", "birth_date", "phone", "gender"];

const badBirth = (v: string) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isNaN(t) || t > Date.now();
};

/**
 * **بابُ السجلّ** (`/complete`، ١١-٢٤) — عضوٌ أُهديت إليه العضويّةُ ولا سجلَّ له تسوقه البوّابةُ إلى هنا، فلا يدخل غرفَها حتى يُكمله.
 *
 * **بابٌ من أبواب الحساب لا صفحةٌ عامّة:** كان «رأسًا مذهّبًا» فوق بطاقةٍ فيها أربعة عشر حقلًا في ثلاثة أقسام. وصاحبُه داخلٌ بجلسته
 * يُكمل شيئًا واحدًا ثمّ يمضي — فهو خطوتان بهيئة باب التطوّع: **بياناتُك** ثمّ **دراستُك**، وديبو في اللوح يكتب معه ويهنّئه.
 *
 * - **لا يُسأل عمّا نعرفه:** الجوّالُ والجنسُ في الحساب سلفًا، فيُطلبان ممّن ينقصانه وحدَه. والبريدُ لا يُعرض (لا يُعدَّل هنا).
 * - **ولا عمّا ليس واجبًا:** اللونُ المفضّل والحساباتُ مكانُها «حسابي» بقطعها (منتقي اللون، لا خانةَ `#RRGGBB`)، وتقولها التهنئة.
 * - **وله مخرج:** بابٌ لا يُخرج منه إلّا بإتمامه حبسٌ — فـ«تسجيل الخروج» سطرُ الطريق الآخر (زرٌّ لا رابط، انظر `signOut`).
 */
export function CompleteFlow({ prefill, today }: { prefill: Prefill; today: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("me");
  const [v, setV] = useState<CompleteInput>({ ...emptyComplete, full_name_triple: prefill.fullName, phone: prefill.phone, gender: prefill.gender });
  const [errs, setErrs] = useState<Partial<Record<keyof CompleteInput, string>>>({});
  const [top, setTop] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [busy, start] = useTransition();
  // ما في الحساب سلفًا لا يُسأل عنه (ويبقى في القيم ليُرسل)
  const [askPhone] = useState(() => !PHONE_RE.test(prefill.phone));
  const [askGender] = useState(() => !prefill.gender);

  useEffect(() => {
    setDeeboMood(step === "done" ? "success" : busy ? "busy" : top ? "error" : typing ? "email" : "idle");
  }, [step, busy, top, typing]);

  const set = (k: keyof CompleteInput) => (val: string) => { setV((p) => ({ ...p, [k]: val })); setErrs((e) => ({ ...e, [k]: undefined })); };
  const on = { onFocus: () => setTyping(true), onBlur: () => setTyping(false) };
  const academic = hasAcademicFields(v.academic_degree);

  const checkMe = () => {
    const e: typeof errs = {};
    const nameErr = arabicNameError(v.full_name_triple);
    if (v.full_name_triple.trim().length < 5) e.full_name_triple = "اكتب اسمك الثلاثيّ كاملًا.";
    else if (nameErr) e.full_name_triple = `${ARABIC_NAME_HINT}.`;
    if (!NATIONAL_ID_RE.test(v.national_id.trim())) e.national_id = `${NATIONAL_ID_HINT}.`;
    if (badBirth(v.birth_date)) e.birth_date = "تاريخ ميلادٍ غير صالح.";
    if (!PHONE_RE.test(v.phone.trim())) e.phone = `${PHONE_HINT}.`;
    if (!v.gender) e.gender = "حدّد جنسك.";
    return e;
  };
  const checkStudy = () => {
    const e: typeof errs = {};
    if (!v.academic_degree) e.academic_degree = "اختر الدرجة العلميّة.";
    if (academic) {
      if (!v.college?.trim()) e.college = "الكلّيّة مطلوبة لهذه الدرجة.";
      if (!v.major?.trim()) e.major = "التخصّص مطلوب لهذه الدرجة.";
      if (!RECORD_NO_RE.test(v.academic_record_number?.trim() ?? "")) e.academic_record_number = `${RECORD_NO_HINT}.`;
    }
    return e;
  };

  const next = (ev: FormEvent) => {
    ev.preventDefault();
    setTop(null);
    const e = checkMe();
    setErrs(e);
    if (Object.keys(e).length) { setTop("راجع الحقولَ المعلَّمةَ بالأحمر."); return; }
    setStep("study");
  };

  const save = (ev: FormEvent) => {
    ev.preventDefault();
    setTop(null);
    const e = checkStudy();
    setErrs(e);
    if (Object.keys(e).length) { setTop("راجع الحقولَ المعلَّمةَ بالأحمر."); return; }
    start(async () => {
      const res = await completeMyRecord(v);
      if (res.ok) { setStep("done"); return; }
      setErrs(res.fieldErrors ?? {});
      setTop(res.message);
      if (res.fieldErrors && ME_KEYS.some((k) => res.fieldErrors?.[k])) setStep("me");
    });
  };

  const first = prefill.fullName ? firstNameOf(prefill.fullName) : null;
  // **الخروجُ زرٌّ لا رابط** (١١-٢٤): رابطُ `/logout` يجلبه `Link` مسبقًا حين يظهر، فيُخرج صاحبَه قبل أن ينقر (أخرجَ محمدًا في المعاينة)
  const [leaving, leave] = useTransition();
  const signOut = () => leave(async () => {
    setDeeboMood("busy");
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  });
  const out = (
    <p className="ad-alt">
      <span>لستَ مستعدًّا الآن؟</span>
      <AdButton size="sm" icon={<SignOut />} busy={leaving} onClick={signOut}>تسجيل الخروج</AdButton>
    </p>
  );

  return (
    <DoorShell door="record" say={step === "done" ? { big: "أهلًا بك في بوّابتك", small: "سجلُّك في أدِيب كامل." } : undefined}>
      {step === "me" ? (
        <>
          <form className="door-step" key="me" onSubmit={next} noValidate>
            <Head kicker="الخطوة الأولى من اثنتين" sub="بياناتٌ يحتاجها سجلُّ عضويّتك، وتكتبها مرّةً واحدة.">
              {first ? `أكمل سجلّك يا ${first}` : "أكمل سجلّك"}
            </Head>
            {top ? <Note tone="error" title={top} /> : null}
            <Fields>
              <Field label="الاسم الثلاثيّ" icon={<User />} innerIcon={<IdentificationBadge />} placeholder="الاسم الأوّل واسم الأب واسم العائلة"
                value={v.full_name_triple} onChange={(e) => set("full_name_triple")(e.target.value)} error={errs.full_name_triple} required {...on} />
              <Field label="رقم الهويّة" charset="digits" maxLength={NATIONAL_ID_LEN} icon={<IdentificationCard />} innerIcon={<Hash />} placeholder="10 أرقام"
                value={v.national_id} onChange={(e) => set("national_id")(e.target.value)} error={errs.national_id} required {...on} />
              <Field label="تاريخ الميلاد" type="date" placeholder="" icon={<Cake />} innerIcon={<CalendarBlank />} max={today}
                value={v.birth_date} onChange={(e) => set("birth_date")(e.target.value)} error={errs.birth_date} required {...on} />
              {askPhone ? (
                <Field label="رقم الجوّال" type="tel" charset="digits" maxLength={PHONE_LEN} prefix={PHONE_PREFIX} icon={<Phone />} innerIcon={<Hash />}
                  placeholder="05xxxxxxxx" value={v.phone} onChange={(e) => set("phone")(e.target.value)} error={errs.phone} required {...on} />
              ) : null}
              {askGender ? (
                <Select label="الجنس" icon={<UsersThree />} options={GENDERS} value={v.gender} onValueChange={set("gender")} error={errs.gender} required />
              ) : null}
              <Btn type="submit" size="lg">تابع</Btn>
            </Fields>
          </form>
          {out}
        </>
      ) : step === "study" ? (
        <>
          <form className="door-step" key="study" onSubmit={save} noValidate>
            <Back onClick={() => { setTop(null); setStep("me"); }} />
            <Head kicker="الخطوة الثانية من اثنتين" sub="دراستُك اليوم، أو عملُك إن لم تكن تدرس.">دراستُك</Head>
            {top ? <Note tone="error" title={top} /> : null}
            <Fields>
              <Select label="الدرجة العلميّة" icon={<Certificate />} options={DEGREES} value={v.academic_degree}
                onValueChange={set("academic_degree")} error={errs.academic_degree} required />
              {academic ? (
                <>
                  <Field label="الكلّيّة" icon={<GraduationCap />} innerIcon={<Buildings />} placeholder="مثال: كلّيّة الآداب"
                    value={v.college ?? ""} onChange={(e) => set("college")(e.target.value)} error={errs.college} required {...on} />
                  <Field label="التخصّص" icon={<BookOpen />} innerIcon={<Books />} placeholder="مثال: اللغة العربيّة"
                    value={v.major ?? ""} onChange={(e) => set("major")(e.target.value)} error={errs.major} required {...on} />
                  <Field label="الرقم الأكاديميّ" charset="digits" maxLength={RECORD_NO_MAX} icon={<IdentificationCard />} innerIcon={<Hash />}
                    placeholder="مثال: 443001234" value={v.academic_record_number ?? ""} onChange={(e) => set("academic_record_number")(e.target.value)}
                    error={errs.academic_record_number} required {...on} />
                </>
              ) : null}
              <Btn type="submit" size="lg" loading={busy}>احفظ سجلّي</Btn>
            </Fields>
          </form>
          {out}
        </>
      ) : (
        <section className="door-step" key="done">
          <Head kicker="شكرًا لك" sub="لونُك المفضّل وحساباتُك في مواقع التواصل تضيفها من «حسابي» متى شئت.">اكتمل سجلُّك</Head>
          <Ways label="ما بعد السجلّ">
            <Way main icon={<SquaresFour />} onClick={() => { router.replace("/dashboard"); router.refresh(); }}>ادخل بوّابتك</Way>
            <Way icon={<UserGear />} onClick={() => router.push("/dashboard/account")}>حسابي</Way>
          </Ways>
        </section>
      )}
    </DoorShell>
  );
}
