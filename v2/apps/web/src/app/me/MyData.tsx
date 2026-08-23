"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Select } from "@adeeb/design-system";
import { At, Envelope, Hash, IdentificationBadge, MapPin, Phone, User, UsersThree } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import { GENDER_OPTIONS } from "@/lib/activities";
import { PHONE_HINT, PHONE_LEN, PHONE_PREFIX, isPhone, phoneError } from "@/lib/fieldFormats";
import { arabicNameError } from "@/lib/personName";
import { saveMyData } from "./actions";
import type { MyDataInput } from "./schema";
import type { MyAccount } from "./data";

const RPC_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "انتهت جلستك. سجّل دخولك من جديد.",
  PROFILE_EXISTS: "بياناتك محفوظةٌ سلفًا. أعِد تحميل الصفحة.",
  NAME_REQUIRED: "الاسم مطلوب.",
  NAME_NOT_ARABIC: "اكتب الاسم بالحروف العربيّة وحدها.",
  GENDER_REQUIRED: "حدّد جنسك.",
  PHONE_INVALID: `${PHONE_HINT}.`,
};
const rpcError = (raw: string | null | undefined): string => {
  const code = Object.keys(RPC_ERRORS).find((c) => (raw ?? "").includes(c));
  return code ? RPC_ERRORS[code] : "تعذّر حفظ بياناتك. حاول مجدّدًا.";
};

/**
 * بياناتُ صاحب الحساب — ثلاثةُ أحوالٍ لا رابع لها:
 *
 * - **لا صفَّ له** (دخل بالرمز ولم يحجز قطُّ): نموذجُ إنشاءٍ يمرّ بـ`create_my_account_profile` —
 *   البابُ المفوَّض الوحيد الذي يكتب صفًّا **بلا تاريخِ انضمام**، فلا يجعل نفسَه عضوًا.
 * - **صاحبُ حساب**: يحرّر اسمَه وجوّالَه ومدينتَه بفعلٍ خادميّ (الكتابةُ في `profiles` نُزعت عن
 *   المتصفّح، فالخادمُ يكتب ثلاثةَ أعمدةٍ لا رابع).
 * - **عضو**: يقرأ ولا يكتب — بياناتُه تُحرَّر في ملفّه باللوحة حيث حَكَمُ تغيير الاسم.
 *
 * والبريدُ لا يُحرَّر في الأحوال الثلاثة: هو هويّةُ الدخول نفسُها، وتبديلُه تبديلُ حسابٍ لا حقل.
 */
export function MyData({ me }: { me: MyAccount }) {
  const router = useRouter();
  const [sb] = useState(() => createClient());
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState(me.fullName);
  const [phone, setPhone] = useState(me.phone);
  const [city, setCity] = useState(me.city);
  const [gender, setGender] = useState<"male" | "female" | "">(me.gender ?? "");

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof MyDataInput, string>>>({});
  /** رايةُ الجوّال تُرفع عند مغادرة الحقل أو عند الإرسال — لا وهو يكتب رقمه أوّلَ محرف. */
  const [phoneTouched, setPhoneTouched] = useState(false);
  /** ورايةُ الاسم مثلُها: العربيّةُ شرطٌ يُقال عند المغادرة لا عند أوّل محرفٍ يُكتب. */
  const [nameTouched, setNameTouched] = useState(false);

  /* ── عضوٌ: عرضٌ وإحالة ── */
  if (me.isMember) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info" title="أنت عضوٌ في أديب">
          بياناتُك ومسيرتُك في <Link className="font-bold underline" href="/dashboard">بوّابة أديب</Link>، وهناك تُحرَّر.
        </Alert>
        <div className="flex flex-col gap-3">
          <Field label="الاسم الكامل" icon={<User />} innerIcon={<PencilSimple />} placeholder="اسمك الثلاثيّ" value={me.fullName} disabled readOnly />
          <Field label="البريد الإلكترونيّ" type="email" charset="latin" icon={<Envelope />} innerIcon={<At />} placeholder="you@example.com" value={me.email} disabled readOnly />
          <Field label="رقم الجوّال" type="tel" charset="digits" prefix={PHONE_PREFIX} icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx" value={me.phone} disabled readOnly />
        </div>
      </div>
    );
  }

  /* ── لا صفَّ له: إنشاءٌ بالدالّة المفوَّضة ── */
  const create = async () => {
    setErr(null); setOk(null);
    if (!fullName.trim()) { setErr("الاسم مطلوب."); return; }
    const nameErr = arabicNameError(fullName);
    if (nameErr) { setNameTouched(true); setErr(`${nameErr}.`); return; }
    if (!phone.trim()) { setErr("رقم الجوّال مطلوب."); return; }
    if (!isPhone(phone)) { setPhoneTouched(true); setErr(`${PHONE_HINT}.`); return; }
    if (!gender) { setErr("حدّد جنسك."); return; }
    setBusy(true);
    const { error } = await sb.rpc("create_my_account_profile", {
      p_full_name: fullName.trim(),
      p_phone: phone.trim(),
      p_gender: gender,
      p_city: city.trim() || null,
      p_accepts_marketing: true,
    });
    setBusy(false);
    if (error) { setErr(rpcError(error.message)); return; }
    setOk("حُفظت بياناتك.");
    router.refresh();
  };

  /* ── صاحبُ حساب: تحريرٌ بفعلٍ خادميّ ── */
  const save = () => {
    setErr(null); setOk(null); setFieldErrors({});
    const nameErr = arabicNameError(fullName);
    if (nameErr) { setNameTouched(true); setErr(`${nameErr}.`); return; }
    if (!isPhone(phone)) { setPhoneTouched(true); setErr(`${PHONE_HINT}.`); return; }
    start(async () => {
      const res = await saveMyData({ fullName, phone, city });
      if (!res.ok) {
        setErr(res.message);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      setOk(res.message);
      router.refresh();
    });
  };

  const working = busy || pending;

  return (
    <div className="flex flex-col gap-3">
      {!me.hasProfile ? (
        <Alert tone="info">أكمِل بياناتك مرّةً واحدة، بها نحجز مقعدك ونتواصل معك.</Alert>
      ) : null}
      {ok ? <Alert tone="success" onClose={() => setOk(null)}>{ok}</Alert> : null}
      {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}

      <Field
        label="الاسم الكامل" icon={<User />} innerIcon={<PencilSimple />} placeholder="اسمك الثلاثيّ"
        value={fullName} onChange={(e) => setFullName(e.target.value)} onBlur={() => setNameTouched(true)}
        error={fieldErrors.fullName ?? (nameTouched ? arabicNameError(fullName) ?? undefined : undefined)} required
      />
      <Field
        label="البريد الإلكترونيّ" type="email" charset="latin" icon={<Envelope />} innerIcon={<At />}
        placeholder="you@example.com" value={me.email} disabled readOnly
        helper="بريدُك هو مفتاحُ دخولك، لا يُبدَّل من هنا."
      />
      <Field
        label="رقم الجوّال" type="tel" charset="digits" maxLength={PHONE_LEN} prefix={PHONE_PREFIX}
        icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx"
        value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setPhoneTouched(true)}
        error={fieldErrors.phone ?? phoneError(phone, phoneTouched)} required
      />
      {!me.hasProfile ? (
        <Select
          label="الجنس" icon={<UsersThree />} options={GENDER_OPTIONS} value={gender}
          onValueChange={(v) => setGender(v as "male" | "female")} required
        />
      ) : null}
      <Field
        label="المدينة" icon={<MapPin />} innerIcon={<IdentificationBadge />} placeholder="مدينتك"
        value={city} onChange={(e) => setCity(e.target.value)} error={fieldErrors.city} optional
      />

      <div className="btn-row">
        <Button variant="primary" size="md" loading={working} onClick={me.hasProfile ? save : create}>
          حفظ البيانات
        </Button>
      </div>
    </div>
  );
}
