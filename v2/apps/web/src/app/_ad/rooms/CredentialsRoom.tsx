"use client";

/**
 * **تغيير بيانات الدخول** على قالب «النموذج» (٢٠٢٦-١١-١٣) — السلوكُ سلوكُ `dashboard/members/credentials/CredentialsView.tsx` حرفًا: عضوٌ
 * ساري العضويّة يُختار، ثمّ بريدٌ جديدٌ أو كلمةُ مرورٍ جديدة (أو كلاهما)، والتحقّقُ نفسُه (صيغةُ البريد، ولا يكون بريدَه الحاليّ، وثمانيةُ
 * محارف، والتأكيدُ مطابق)، وتوليدُ كلمةِ مرورٍ قويّةٍ في المتصفّح، والحقولُ تُمحى بعد النجاح وعند تبديل العضو.
 *
 * والشكلُ: ثلاثةُ أقسام (العضو، البريد، كلمة المرور) والفعلُ في الجانب، والتنبيهُ الدائمُ («فوريّ ولا يُتراجع عنه») أوّلَ النموذج.
 * وكان: بطاقةٌ واحدةٌ بعناوين `.cred-*` موسومةٌ بانتظار الهويّة. وبطاقةُ العضو المختار سقطت: الاختيارُ نفسُه يقول اسمَه وبريدَه.
 */
import { useMemo, useState, useTransition } from "react";
import { Field, Select } from "@adeeb/design-system";
import { At, Envelope, FloppyDisk, Key, Lock, Password, User } from "@phosphor-icons/react";
import { EMAIL_HINT, isEmail } from "@/lib/fieldFormats";
import { updateCredentials, type CredResult } from "@/app/dashboard/members/credentials/actions";
/** العضوُ كما تحتاجه الشاشة — بلا حالة: لا تُطعَم إلّا الساري. (كان في `CredentialsView` القديم، ونُقل قبل حذفه.) */
export type CredMember = { id: string; name: string; email: string; avatar: string | null; gender: "male" | "female" | null };
import { AdButton, AdCard, AdNote } from "../primitives";
import { FormRoom, FormSection } from "../form";

export function CredentialsRoom({ members, error }: { members: CredMember[]; error?: string | null }) {
  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [res, setRes] = useState<CredResult | null>(null);
  const [pending, start] = useTransition();

  const selected = useMemo(() => members.find((m) => m.id === uid) ?? null, [members, uid]);
  const options = useMemo(() => members.map((m) => ({ value: m.id, label: `${m.name}، ${m.email}` })), [members]);

  // إعادةُ ضبط الحقول والنتيجة عند تبديل العضو — **في الرسم لا في أثر**، فلا تُرسم الشاشةُ مرّةً بحقول العضو السابق
  const [lastUid, setLastUid] = useState(uid);
  if (lastUid !== uid) {
    setLastUid(uid);
    setEmail(""); setPw(""); setPw2(""); setRes(null);
  }

  const emailTrim = email.trim();
  const emailErr = emailTrim && !isEmail(emailTrim) ? EMAIL_HINT : undefined;
  const emailSame = emailTrim && selected && emailTrim.toLowerCase() === selected.email.toLowerCase() ? "هذا هو البريد الحاليّ للعضو" : undefined;
  const pwErr = pw && pw.length < 8 ? "8 محارف على الأقلّ" : undefined;
  const pw2Err = pw && pw2 && pw2 !== pw ? "كلمتا المرور غير متطابقتين" : undefined;
  const nothing = !emailTrim && !pw;
  const canSubmit = !!selected && !nothing && !emailErr && !emailSame && !pwErr && !pw2Err && (!pw || pw2 === pw);

  // توليدُ كلمة مرورٍ قويّة (عشوائيّةٌ آمنةٌ في المتصفّح)
  const genPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*";
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    const s = Array.from(arr, (n) => chars[n % chars.length]).join("");
    setPw(s);
    setPw2(s);
  };

  const submit = () => {
    if (!canSubmit || !selected) return;
    setRes(null);
    start(async () => {
      const r = await updateCredentials({ userId: selected.id, email: emailTrim || undefined, password: pw || undefined });
      setRes(r);
      if (r.ok) { setPw(""); setPw2(""); setEmail(""); }
    });
  };

  // **العضوُ في الجانب** تحت الفعل: صورتُه واسمُه وبريدُه الحاليّ، فيُعرف أنّه الشخصُ المقصود قبل الحفظ (كانت بطاقتُه في الشاشة القديمة،
  // وبلاها في الجوّال يُقطع الاسمُ في الاختيار) — والعمودُ الجانبيُّ لا يبقى زرّين وتحتهما فراغ (محمد ٢٠٢٦-١١-١٤)
  const who = selected ? (
    <AdCard seed={selected.id} face={{ name: selected.name, src: selected.avatar, gender: selected.gender }} title={selected.name}
      meta={[{ icon: <Envelope />, text: selected.email, ltr: true }]} />
  ) : (
    <AdCard seed="cred-none" face={{ name: "", vacant: true }} title="لم تختر عضوًا" meta={[{ icon: <User />, text: "اختره من القائمة", tone: "muted" }]} />
  );

  return (
    <FormRoom
      title="تغيير بيانات الدخول"
      preview={error ? undefined : who}
      previewLabel={{ label: "العضو", icon: <User /> }}
      commit={{
        primary: { label: "حفظ التغييرات", icon: <FloppyDisk />, onClick: submit, busy: pending, held: !canSubmit },
        cancelHref: "/dashboard/members/active",
        dirty: !nothing,
      }}
    >
      {error ? <AdNote tone="bad" title="تعذّر جلب الأعضاء">{error}</AdNote> : null}
      {error ? null : <>
      <AdNote tone="warn" title="التغيير فوريّ ولا يمكن التراجع عنه">لا يُرسَل للعضو أيّ إشعار تلقائيّ، أبلِغه ببياناته الجديدة عبر قناة آمنة.</AdNote>

      <FormSection icon={<User />} title="العضو" mark="required" sub={selected ? `${selected.gender === "female" ? "بريدُها" : "بريدُه"} الحاليّ \u2068${selected.email}\u2069` : "اختر عضوًا لعرض بريده الحاليّ وتعديل بيانات دخوله"}>
        <div className="form-grid">
          <Select className="form-full" label="اختر عضوًا" icon={<User />} options={options} value={uid} onValueChange={setUid} searchable required />
        </div>
      </FormSection>

      {selected ? (
        <>
          <FormSection icon={<Envelope />} title="البريد الإلكترونيّ" mark="optional">
            <div className="form-grid">
              <Field className="form-full" label="بريد إلكترونيّ جديد" icon={<Envelope />} innerIcon={<At />} placeholder="you@adeeb.club" type="email" charset="latin"
                autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} error={emailErr ?? emailSame}
                helper="اتركه فارغًا إن لم ترغب بتغيير البريد." optional />
            </div>
          </FormSection>

          <FormSection icon={<Password />} title="كلمة المرور" mark="optional"
            act={<AdButton variant="line" size="sm" icon={<Key />} onClick={genPassword}>توليد كلمة مرور قوية</AdButton>}>
            <div className="form-grid">
              <Field label="كلمة مرور جديدة" icon={<Lock />} innerIcon={<Key />} placeholder="••••••••" type="password" dir="ltr" autoComplete="new-password"
                value={pw} onChange={(e) => setPw(e.target.value)} error={pwErr} helper="8 محارف على الأقلّ. اتركها فارغة إن لم ترغب بتغييرها." optional />
              <Field label="تأكيد كلمة المرور" icon={<Lock />} innerIcon={<Key />} placeholder="••••••••" type="password" dir="ltr" autoComplete="new-password"
                value={pw2} onChange={(e) => setPw2(e.target.value)} error={pw2Err} optional={!pw} required={!!pw} />
            </div>
          </FormSection>
          {/* النتيجةُ تحت آخر الحقول، قريبًا من الفعل: في الجوّال الفعلُ آخرَ الصفحة، وكانت فوق النموذج فلا يرى صاحبُها إلّا حقولًا فارغة */}
          {res ? <AdNote tone={res.ok ? "ok" : "bad"}>{res.message}</AdNote> : null}
        </>
      ) : null}
      </>}
    </FormRoom>
  );
}
