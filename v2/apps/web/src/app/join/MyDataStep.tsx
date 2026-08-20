"use client";

import { useState } from "react";
import { Alert, Button, Card, CardBody, Field, Select } from "@adeeb/design-system";
import { Hash, IdentificationBadge, MapPin, Phone, User, UsersThree } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { GENDER_OPTIONS } from "@/lib/activities";
import { PHONE_HINT, PHONE_LEN, PHONE_PREFIX, isPhone, phoneError } from "@/lib/fieldFormats";

const RPC_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "انتهت جلستك. سجّل دخولك من جديد.",
  PROFILE_EXISTS: "بياناتك محفوظةٌ سلفًا. أعِد تحميل الصفحة.",
  NAME_REQUIRED: "الاسم مطلوب.",
  GENDER_REQUIRED: "حدّد جنسك.",
  PHONE_INVALID: `${PHONE_HINT}.`,
};
const rpcError = (raw: string | null | undefined): string => {
  const code = Object.keys(RPC_ERRORS).find((c) => (raw ?? "").includes(c));
  return code ? RPC_ERRORS[code] : "تعذّر حفظ بياناتك. حاول مجدّدًا.";
};

/**
 * **بياناتُك قبل رغباتك** — أوّلُ محطّةٍ في باب الانضمام لمن لا صفَّ له في `profiles`.
 *
 * ولمَ ههنا لا في شاشة إنشاء الحساب؟ لأنّ الحسابَ يُفتح بنقرةٍ من قوقل، فلو سألنا البيانات
 * عند الباب لَاستوى الطريقان في الطول واحدًا وقصر الآخر — **فتُسأل عند الحاجة إليها**: وهذه
 * أوّلُ حاجةٍ حقيقيّة، إذ لا يُقبل متطوّعٌ بلا جوّالٍ يُتواصل به ولا جنسٍ تُقاس به فرصُه.
 *
 * والكتابةُ بالدالّة المفوَّضة `create_my_account_profile` — تكتب صفًّا بلا `joined_date`.
 */
export function MyDataStep({ onSaved }: { onSaved: () => void }) {
  const [sb] = useState(() => createClient());

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [city, setCity] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
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
    if (error) { setErr(rpcError(error.message)); return; }
    onSaved();
  };

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 p-6">
        <Alert tone="info">بياناتك أوّلًا، ثمّ ترتيبُ رغباتك في اللجان.</Alert>
        {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}

        <Field
          label="الاسم الكامل" icon={<User />} innerIcon={<IdentificationBadge />}
          placeholder="اسمك الثلاثيّ" autoComplete="name"
          value={name} onChange={(e) => setName(e.target.value)} required
        />
        <Field
          label="رقم الجوّال" type="tel" charset="digits" maxLength={PHONE_LEN} prefix={PHONE_PREFIX}
          icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx" autoComplete="tel"
          value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setPhoneTouched(true)}
          error={phoneError(phone, phoneTouched)} required
        />
        <Select
          label="الجنس" icon={<UsersThree />} options={GENDER_OPTIONS} value={gender}
          onValueChange={(v) => setGender(v as "male" | "female")} required
        />
        <Field
          label="المدينة" icon={<MapPin />} innerIcon={<MapPin />} placeholder="مدينتك"
          value={city} onChange={(e) => setCity(e.target.value)} optional
        />

        <div>
          <Button variant="primary" size="lg" loading={busy} onClick={submit}>حفظ ومتابعة</Button>
        </div>
      </CardBody>
    </Card>
  );
}
