"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardBody, Select } from "@adeeb/design-system";
import { UsersThree } from "@phosphor-icons/react";
import { CheckCircle } from "@/app/_components/glyphs";
import { createClient } from "@/lib/supabase/client";
import { VOLUNTEERS_GROUP_URL } from "@/lib/volunteersGroup";
import { MyDataStep } from "./MyDataStep";
import type { CommitteeOption } from "./data";

const RPC_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "انتهت جلستك. سجّل دخولك من جديد.",
  NO_PROFILE: "أكمِل بياناتك أوّلًا من صفحة حسابك.",
  ALREADY_MEMBER: "أنت عضوٌ في أديب سلفًا.",
  ALREADY_VOLUNTEER: "أنت من المتطوّعين سلفًا.",
  NOT_VOLUNTEER: "لستَ من المتطوّعين. قدّم أوّلًا.",
  PREFS_COUNT: "رتّب رغباتك الثلاث.",
  PREFS_DUPLICATE: "لا تُكرّر اللجنة في رغبتين.",
  PREFS_INVALID: "إحدى اللجان لم تعد متاحة. أعِد تحميل الصفحة.",
};
const rpcError = (raw: string | null | undefined): string => {
  const code = Object.keys(RPC_ERRORS).find((c) => (raw ?? "").includes(c));
  return code ? RPC_ERRORS[code] : "تعذّر حفظ طلبك. حاول مجدّدًا.";
};

const RANK_LABEL = ["الرغبة الأولى", "الرغبة الثانية", "الرغبة الثالثة"];

/**
 * **ترتيبُ الرغبات** — الشيءُ الوحيد الذي يُطلب ممّن يريد العضويّة.
 *
 * ولمَ قوائمُ منسدلةٌ لا سحبٌ وإفلات؟ لأنّ اللوحةَ عندنا منتَجُ جوّالٍ بالقياس (٧٩٪ من الأعضاء
 * لم يفتحوها من حاسوبٍ قطّ)، وترتيبُ عشر بطاقاتٍ بالسحب على ٣٧٥px عذاب. فثلاثُ قوائمَ يسقط
 * من كلٍّ منها ما اختير في أختها.
 *
 * **والتعريفاتُ فوق القوائم لا خلف علامةِ استفهام**: هي أساسُ الترتيب، فمن رتّب بلا تعريفٍ
 * رتّب أسماءً. ولذلك اشترطت القاعدةُ التعريفَ لعرض اللجنة أصلًا.
 */
export function JoinForm({
  options, initialPrefs, isVolunteer, hasProfile,
}: {
  options: CommitteeOption[];
  initialPrefs: number[];
  isVolunteer: boolean;
  /** له صفٌّ في `profiles`؟ من لا صفَّ له تُسأل بياناتُه أوّلًا (خطوةٌ لا شاشة). */
  hasProfile: boolean;
}) {
  const router = useRouter();
  const [sb] = useState(() => createClient());
  const need = Math.min(3, options.length);

  const [picks, setPicks] = useState<string[]>(() =>
    Array.from({ length: need }, (_, i) => (initialPrefs[i] ? String(initialPrefs[i]) : "")),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const optionsFor = useMemo(
    () => (slot: number) =>
      options
        .filter((o) => !picks.some((p, i) => i !== slot && p === String(o.id)))
        .map((o) => ({ value: String(o.id), label: o.name })),
    [options, picks],
  );

  const setPick = (slot: number, value: string) => {
    setPicks((prev) => prev.map((p, i) => (i === slot ? value : p)));
    setOk(null);
  };

  const complete = picks.every((p) => p !== "");

  const submit = async () => {
    setErr(null); setOk(null);
    if (!complete) { setErr(`رتّب رغباتك ${need === 3 ? "الثلاث" : ""}.`); return; }
    setBusy(true);
    const prefs = picks.map((p) => Number(p));
    const { error } = await sb.rpc(
      isVolunteer ? "set_my_volunteer_preferences" : "apply_for_volunteering",
      { p_prefs: prefs },
    );
    setBusy(false);
    if (error) { setErr(rpcError(error.message)); return; }
    setOk(isVolunteer ? "حُدّثت رغباتك." : "صرتَ من متطوّعي أدِيب.");
    router.refresh();
  };

  // خطوةُ البيانات أوّلًا لمن لا صفَّ له: لا تُعرَض عليه اللجانُ قبل أن نعرف من هو
  if (!hasProfile) return <MyDataStep onSaved={() => router.refresh()} />;

  return (
    <div className="flex flex-col gap-8">
      {/* تعريفاتُ اللجان — أساسُ الترتيب */}
      <div className="grid gap-4 md:grid-cols-2">
        {options.map((o) => (
          <Card key={o.id}>
            <CardBody className="flex flex-col gap-2 p-5">
              <span className="flex items-center gap-2 font-bold">
                <UsersThree size={20} aria-hidden />
                {o.name}
              </span>
              <p className="text-content-muted text-sm leading-relaxed">{o.description}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4 p-6">
          {err ? <Alert tone="danger" onClose={() => setErr(null)}>{err}</Alert> : null}
          {ok ? (
            <Alert tone="success" icon={<CheckCircle />} onClose={() => setOk(null)}>{ok}</Alert>
          ) : null}

          {picks.map((value, slot) => (
            <Select
              key={slot}
              label={RANK_LABEL[slot]}
              icon={<UsersThree />}
              options={optionsFor(slot)}
              value={value}
              onValueChange={(v) => setPick(slot, v)}
              required
            />
          ))}

          <div className="btn-row">
            <Button variant="primary" size="lg" loading={busy} onClick={submit} disabled={!complete}>
              {isVolunteer ? "حفظ الرغبات" : "تقديم الطلب"}
            </Button>
          </div>

          {!isVolunteer ? (
            <p className="text-content-muted text-sm">
              بتقديمك تصير من متطوّعي أدِيب، وتُعرض عليك الفرصُ التطوّعيّة في حسابك. والعضويّةُ
              تُهدى لمن رأينا عملَه فيها.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {isVolunteer ? (
        <Alert tone="info" title="قروب متطوّعي أدِيب">
          الفرصُ تُعلَن في القروب وتظهر في{" "}
          <Link className="font-bold underline" href="/me">حسابك</Link>.{" "}
          <a className="font-bold underline" href={VOLUNTEERS_GROUP_URL} target="_blank" rel="noreferrer">
            ادخل القروب
          </a>
        </Alert>
      ) : null}
    </div>
  );
}
