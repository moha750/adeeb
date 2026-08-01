"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert, Badge, Button, Field, Select } from "@adeeb/design-system";
import { At, Envelope, Key, Lock, User } from "@phosphor-icons/react";
import { Avatar } from "../../_components/Avatar";
import { updateCredentials, type CredResult } from "./actions";
import { MEMBER_STATUS, type MemberStatus } from "@/lib/memberStatus";

export type CredMember = { id: string; name: string; email: string; avatar: string | null; gender: "male" | "female" | null; status: MemberStatus };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CredentialsView({ members }: { members: CredMember[] }) {
  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [res, setRes] = useState<CredResult | null>(null);
  const [pending, start] = useTransition();

  const selected = useMemo(() => members.find((m) => m.id === uid) ?? null, [members, uid]);
  const options = useMemo(() => members.map((m) => ({ value: m.id, label: `${m.name} — ${m.email}` })), [members]);

  // إعادة ضبط الحقول والنتيجة عند تبديل العضو
  useEffect(() => { setEmail(""); setPw(""); setPw2(""); setShow(false); setRes(null); }, [uid]);

  const emailTrim = email.trim();
  const emailErr = emailTrim && !EMAIL_RE.test(emailTrim) ? "بريد إلكترونيّ غير صالح" : undefined;
  const emailSame =
    emailTrim && selected && emailTrim.toLowerCase() === selected.email.toLowerCase()
      ? "هذا هو البريد الحاليّ للعضو"
      : undefined;
  const pwErr = pw && pw.length < 8 ? "٨ محارف على الأقلّ" : undefined;
  const pw2Err = pw && pw2 && pw2 !== pw ? "كلمتا المرور غير متطابقتين" : undefined;
  const nothing = !emailTrim && !pw;
  const canSubmit =
    !!selected && !nothing && !emailErr && !emailSame && !pwErr && !pw2Err && (!pw || pw2 === pw);

  // توليد كلمة مرور قوية (عشوائيّة آمنة في المتصفّح)
  const genPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*";
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    const s = Array.from(arr, (n) => chars[n % chars.length]).join("");
    setPw(s);
    setPw2(s);
    setShow(true);
  };

  const submit = () => {
    if (!canSubmit || !selected) return;
    setRes(null);
    start(async () => {
      const r = await updateCredentials({
        userId: selected.id,
        email: emailTrim || undefined,
        password: pw || undefined,
      });
      setRes(r);
      if (r.ok) { setPw(""); setPw2(""); setEmail(""); setShow(false); }
    });
  };

  return (
    <div className="cred-wrap">
      <div className="cred-card">
        {/* اختيار العضو */}
        <div className="cred-sec">
          <h4 className="cred-h">العضو</h4>
          <Select label="اختر عضوًا" icon={<User />} options={options} value={uid} onValueChange={setUid} searchable required />
          {selected ? (
            <div className="cred-cur">
              <Avatar name={selected.name} src={selected.avatar ?? undefined} gender={selected.gender} size="md" />
              <div className="cred-cur-tx">
                <b>{selected.name}</b>
                <span className="lat">{selected.email}</span>
              </div>
              <Badge tone={MEMBER_STATUS[selected.status].tone} variant="soft" dot>{MEMBER_STATUS[selected.status].label}</Badge>
            </div>
          ) : (
            <p className="cred-hint">اختر عضوًا لعرض بريده الحاليّ وتعديل بيانات دخوله.</p>
          )}
        </div>

        {selected ? (
          <>
            {/* البريد الإلكترونيّ */}
            <div className="cred-sec">
              <h4 className="cred-h">البريد الإلكترونيّ</h4>
              <Field
                label="بريد إلكترونيّ جديد"
                icon={<Envelope />}
                innerIcon={<At />}
                placeholder="you@adeeb.club"
                type="email"
                charset="latin"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={emailErr ?? emailSame}
                helper="اتركه فارغًا إن لم ترغب بتغيير البريد."
                optional
              />
            </div>

            {/* كلمة المرور */}
            <div className="cred-sec">
              <h4 className="cred-h">كلمة المرور</h4>
              <div className="cred-grid">
                <Field
                  label="كلمة مرور جديدة"
                  icon={<Lock />}
                  innerIcon={<Key />}
                  placeholder="••••••••"
                  type={show ? "text" : "password"}
                  dir="ltr"
                  autoComplete="new-password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  error={pwErr}
                  helper="٨ محارف على الأقلّ. اتركها فارغة إن لم ترغب بتغييرها."
                  optional
                />
                <Field
                  label="تأكيد كلمة المرور"
                  icon={<Lock />}
                  innerIcon={<Key />}
                  placeholder="••••••••"
                  type={show ? "text" : "password"}
                  dir="ltr"
                  autoComplete="new-password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  error={pw2Err}
                  optional
                />
              </div>
              <div className="cred-pw-tools">
                <button type="button" className="cred-link" onClick={() => setShow((s) => !s)}>
                  {show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                </button>
                <button type="button" className="cred-link" onClick={genPassword}>
                  توليد كلمة مرور قوية
                </button>
              </div>
            </div>

            {res ? (
              <Alert tone={res.ok ? "success" : "danger"} onClose={() => setRes(null)}>
                {res.message}
              </Alert>
            ) : null}

            <div className="cred-actions">
              <Button variant="primary" size="md" loading={pending} disabled={!canSubmit} onClick={submit}>
                حفظ التغييرات
              </Button>
            </div>
          </>
        ) : null}
      </div>

      <Alert tone="warning" compact className="cred-note">
        التغيير فوريّ ولا يمكن التراجع عنه. لا يُرسَل للعضو أيّ إشعار تلقائيّ — أبلِغه ببياناته الجديدة عبر قناة آمنة.
      </Alert>
    </div>
  );
}
