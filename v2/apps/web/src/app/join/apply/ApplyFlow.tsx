"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, Select } from "@adeeb/design-system";
import { Hash, IdentificationBadge, MapPin, Phone, SquaresFour, User, UsersThree, WhatsappLogo } from "@phosphor-icons/react";
import { AltLink, Btn, DoorAlert, Fields, Head, Note, Way, Ways } from "@/app/_door/parts";
import { UnitIcon } from "@/app/dashboard/_components/UnitIcon";
import { createClient } from "@/lib/supabase/client";
import { setDeeboMood } from "@/lib/deeboMood";
import { GENDER_OPTIONS } from "@/lib/activities";
import { PHONE_HINT, PHONE_LEN, PHONE_PREFIX, isPhone, phoneError } from "@/lib/fieldFormats";
import { VOLUNTEERS_GROUP_URL } from "@/lib/volunteersGroup";
import type { CommitteeOption } from "../data";

export type ApplyStep = "data" | "prefs" | "edit" | "done";
/** اللجنةُ ورمزُها كما اختارته الإدارة في الهيكلة */
export type ApplyOption = CommitteeOption & { icon: string | null };

const ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "انتهت جلستك. سجّل دخولك من جديد.",
  PROFILE_EXISTS: "بياناتك محفوظةٌ سلفًا. أعِد تحميل الصفحة.",
  NAME_REQUIRED: "الاسم مطلوب.",
  GENDER_REQUIRED: "حدّد جنسك.",
  PHONE_INVALID: `${PHONE_HINT}.`,
  NO_PROFILE: "أكمِل بياناتك أوّلًا.",
  ALREADY_MEMBER: "أنت عضوٌ في أدِيب سلفًا.",
  ALREADY_VOLUNTEER: "أنت من المتطوّعين سلفًا.",
  NOT_VOLUNTEER: "لستَ من المتطوّعين. قدّم أوّلًا.",
  PREFS_COUNT: "رتّب رغباتك الثلاث.",
  PREFS_DUPLICATE: "لا تُكرّر اللجنة في رغبتين.",
  PREFS_INVALID: "إحدى اللجان لم تعد متاحة. أعِد تحميل الصفحة.",
};
const rpcError = (raw: string | null | undefined, fallback: string): string => {
  const code = Object.keys(ERRORS).find((c) => (raw ?? "").includes(c));
  return code ? ERRORS[code] : fallback;
};

const RANK_LABEL = ["الرغبة الأولى", "الرغبة الثانية", "الرغبة الثالثة"];

/**
 * **خطوتا التطوّع على هيئة أبواب الحساب** (١١-٢٤): رأسُ الخطوة، والحقولُ، وزرُّ اللوح، و«الملاحظة» للخطأ، وديبو في اللوح يعيشها معك —
 * يكتب ما تقول، ويفكّر ريثما يُحفظ، ويهنّئك حين تصير متطوّعًا. والخطوةُ تمضي في الصفحة نفسها بلا إعادة تحميل.
 * والعدُّ («الخطوة الأولى من اثنتين») لمن بدأ بالبيانات وحده: من له ملفٌّ خطوتُه واحدة فلا يُعَدّ له.
 */
export function ApplyFlow({ first, options, initialPrefs, female: givenFemale }: {
  first: ApplyStep; options: ApplyOption[] | null; initialPrefs: number[]; female: boolean;
}) {
  const [step, setStep] = useState<ApplyStep>(first);
  const [counted] = useState(first === "data");
  const [female, setFemale] = useState(givenFemale);

  if (step === "data") {
    return <DataStep onDone={(g) => { setFemale(g === "female"); setStep("prefs"); }} />;
  }
  if (step === "done") return <DoneStep female={female} />;
  return (
    <PrefsStep options={options} initialPrefs={initialPrefs} edit={step === "edit"} counted={counted}
      onDone={() => setStep("done")} />
  );
}

/** يربط ديبو بالخطوة: يكتب وأنت تكتب، ويفكّر وهي تُحفظ، ويعتذر إن تعثّرت */
function useDeebo(busy: boolean, err: string | null, typing: boolean) {
  useEffect(() => {
    setDeeboMood(busy ? "busy" : err ? "error" : typing ? "email" : "idle");
  }, [busy, err, typing]);
}

function DataStep({ onDone }: { onDone: (gender: string) => void }) {
  const [sb] = useState(() => createClient());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [city, setCity] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  useDeebo(busy, err, typing);
  const on = { onFocus: () => setTyping(true), onBlur: () => setTyping(false) };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) { setErr("الاسم مطلوب."); return; }
    if (!isPhone(phone)) { setPhoneTouched(true); setErr(`${PHONE_HINT}.`); return; }
    if (!gender) { setErr("حدّد جنسك."); return; }
    setBusy(true);
    const { error } = await sb.rpc("create_my_account_profile", {
      p_full_name: name.trim(),
      p_phone: phone.trim(),
      p_gender: gender,
      p_city: city.trim() || null,
      p_accepts_marketing: true,
    });
    setBusy(false);
    if (error) { setErr(rpcError(error.message, "تعذّر حفظ بياناتك. حاول مجدّدًا.")); return; }
    onDone(gender);
  };

  return (
    <form className="door-step" onSubmit={submit} noValidate>
      <Head kicker="الخطوة الأولى من اثنتين" sub="ثلاثةُ حقولٍ لا غير، ثمّ ترتيبُ رغباتك في اللجان.">عرّفنا بنفسك</Head>
      {err ? <Note tone="error" title={err} /> : null}
      <Fields>
        <Field
          label="الاسم الكامل" icon={<User />} innerIcon={<IdentificationBadge />} placeholder="اسمك الثلاثيّ" autoComplete="name"
          value={name} onChange={(e) => setName(e.target.value)} required {...on}
        />
        <Field
          label="رقم الجوّال" type="tel" charset="digits" maxLength={PHONE_LEN} prefix={PHONE_PREFIX}
          icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx" autoComplete="tel"
          value={phone} onChange={(e) => setPhone(e.target.value)} onFocus={on.onFocus}
          onBlur={() => { setPhoneTouched(true); on.onBlur(); }}
          error={phoneError(phone, phoneTouched)} required
        />
        <Select
          label="الجنس" icon={<UsersThree />} options={GENDER_OPTIONS} value={gender}
          onValueChange={(v) => setGender(v as "male" | "female")} required
        />
        <Field
          label="المدينة" icon={<MapPin />} innerIcon={<MapPin />} placeholder="مدينتك"
          value={city} onChange={(e) => setCity(e.target.value)} optional {...on}
        />
        <Btn type="submit" size="lg" loading={busy}>احفظ وتابع</Btn>
      </Fields>
    </form>
  );
}

function PrefsStep({ options, initialPrefs, edit, counted, onDone }: {
  options: ApplyOption[] | null; initialPrefs: number[]; edit: boolean; counted: boolean; onDone: () => void;
}) {
  const router = useRouter();
  const [sb] = useState(() => createClient());
  const list = useMemo(() => options ?? [], [options]);
  const need = Math.min(3, list.length);
  const [picks, setPicks] = useState<string[]>(() =>
    Array.from({ length: need }, (_, i) => (initialPrefs[i] ? String(initialPrefs[i]) : "")),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useDeebo(busy, err, false);

  // ما اختير في رغبةٍ يسقط من أختيها
  const optionsFor = (slot: number) =>
    list.filter((o) => !picks.some((p, i) => i !== slot && p === String(o.id))).map((o) => ({ value: String(o.id), label: o.name }));
  const iconOf = (v: string) => {
    const o = list.find((x) => String(x.id) === v);
    return o ? <UnitIcon icon={o.icon} kind="committee" /> : <UsersThree />;
  };
  const complete = need > 0 && picks.every((p) => p !== "");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setSaved(false);
    if (!complete) { setErr("رتّب رغباتك الثلاث."); return; }
    setBusy(true);
    const { error } = await sb.rpc(edit ? "set_my_volunteer_preferences" : "apply_for_volunteering", { p_prefs: picks.map(Number) });
    setBusy(false);
    if (error) { setErr(rpcError(error.message, "تعذّر حفظ طلبك. حاول مجدّدًا.")); return; }
    if (edit) { setSaved(true); router.refresh(); } else onDone();
  };

  const head = edit
    ? <Head sub="أنت من متطوّعي أدِيب، ولك أن تعيد ترتيبها متى شئت.">حدّث رغباتك</Head>
    : <Head kicker={counted ? "الخطوة الثانية من اثنتين" : undefined} sub="ثلاثُ لجانٍ بترتيب رغبتك فيها، وبها تصير متطوّعًا في الحال.">رتّب رغباتك</Head>;

  if (options === null || !need) {
    return (
      <section className="door-step">
        {head}
        {options === null
          ? <Note tone="error" title="تعذّر تحميل اللجان">إعداد الخادم ناقص. أبلغ الإدارة.</Note>
          : <Note tone="warn" title="لا لجانَ متاحةً الآن">لم تُفتح لجانٌ لترتيب الرغبات بعد. تابِعنا.</Note>}
      </section>
    );
  }

  return (
    <>
      <form className="door-step" onSubmit={submit} noValidate>
        {head}
        {err ? <Note tone="error" title={err} /> : null}
        {saved ? <DoorAlert tone="success" title="حُدّثت رغباتك." onClose={() => setSaved(false)} /> : null}
        <Fields>
          {picks.map((value, slot) => (
            <Select
              key={slot} label={RANK_LABEL[slot]} icon={iconOf(value)} options={optionsFor(slot)} value={value}
              onValueChange={(v) => { setPicks((prev) => prev.map((p, i) => (i === slot ? v : p))); setSaved(false); }} required
            />
          ))}
          <Btn type="submit" size="lg" loading={busy} disabled={!complete}>{edit ? "احفظ رغباتك" : "قدّم، وكن متطوّعًا"}</Btn>
        </Fields>
      </form>
      {edit
        ? <AltLink lead="فرصُك وساعاتُك في بوّابتك." href="/dashboard/volunteer">بوّابتك</AltLink>
        : <AltLink lead="لم تتعرّف على اللجان بعد؟" href="/join#committees">تصفّح اللجان</AltLink>}
    </>
  );
}

/** صار متطوّعًا: ديبو يهنّئ، وأوّلُ ما يُفعل قروبُ المتطوّعين — فيه تُعلن الفرص — ثمّ بوّابتُه */
function DoneStep({ female }: { female: boolean }) {
  const router = useRouter();
  useEffect(() => setDeeboMood("success"), []);
  return (
    <section className="door-step">
      <Head kicker="تهانينا" sub="الفرصُ تُعلَن في قروب المتطوّعين وتظهر في بوّابتك. ادخل القروب لتبلغك أوّلَ ما تُعلن.">
        {female ? "صرتِ متطوّعةً في أدِيب" : "صرتَ متطوّعًا في أدِيب"}
      </Head>
      <Ways label="ما بعد التطوّع">
        <Way main icon={<WhatsappLogo />} onClick={() => window.open(VOLUNTEERS_GROUP_URL, "_blank", "noopener,noreferrer")}>ادخل قروب المتطوّعين</Way>
        <Way icon={<SquaresFour />} onClick={() => router.push("/dashboard/volunteer")}>بوّابتك</Way>
      </Ways>
    </section>
  );
}
