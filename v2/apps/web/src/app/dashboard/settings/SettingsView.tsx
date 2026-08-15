"use client";

// عميليّ — نوافذُ وأفعال (وأيقونات Phosphor تُنشئ `createContext`، وذلك ممنوعٌ في مكوّنٍ خادميّ).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader, Field, Modal } from "@adeeb/design-system";
import { At, Desktop, Envelope, Key, Lock, ShieldCheck } from "@phosphor-icons/react";
import { SignOut } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { EmptyState } from "../_components/EmptyState";
import { useToast } from "../_components/ToastProvider";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { changeMyEmail, changeMyPassword, signOutEverywhere } from "./actions";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
import type { MySession, MySettings } from "./data";

/** يطابق `PASSWORD_MIN` في الفعل الخادميّ و`password_min_length` في إعداد المصادقة. */
const PASSWORD_MIN = 8;

const sessionColumns: Column<MySession>[] = [
  {
    key: "device", header: "الجهاز", width: "minmax(180px, 1.6fr)",
    render: (s) => (
      <span className="dt-mm">
        <b>{s.device}</b>
        {s.current ? <Badge tone="success" variant="soft" dot live>جلستك الحاليّة</Badge> : <span>{s.ip ?? "بلا عنوان"}</span>}
      </span>
    ),
  },
  { key: "lastSeen", header: "آخر نشاط", width: "1.2fr", render: (s) => <span className="txt">{s.lastSeen}</span> },
  { key: "started", header: "بدأت في", width: "1.2fr", render: (s) => <span className="txt">{s.started}</span> },
];

/**
 * **الإعدادات** — ما يخصّ **حسابك** لا سجلَّك: مفتاحُ الدخول وعنوانُه، والأجهزةُ التي
 * تحمل جلساتك. وفارقُها عن «الملف الشخصي» فارقُ طبقة: ذاك بياناتٌ عنك، وهذه بابُك أنت.
 *
 * ولا شريطَ حفظٍ هنا خلافًا للملفّ الشخصيّ: هذه **أفعالٌ لا حقول**. لكلٍّ نافذتُها وتأكيدُها،
 * ولا يجوز أن يحملها زرٌّ واحدٌ يحمل معها لونًا مفضّلًا — خلطُ طبقتَي خطرٍ في فعلٍ واحد.
 */
export function SettingsView({ settings }: { settings: MySettings }) {
  const toast = useToast();
  const router = useRouter();
  const [busy, startAction] = useTransition();

  const [passOpen, setPassOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passErr, setPassErr] = useState<string | null>(null);
  // تبديلُ كلمة المرور يُثبت الحاليّة **بدخولٍ حقيقيّ** — وبابُ الدخول مدروع، فتلزمه ودجةٌ كشاشة الدخول
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);

  const [mailOpen, setMailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [mailErr, setMailErr] = useState<string | null>(null);

  const [outOpen, setOutOpen] = useState(false);

  const closePass = () => { setPassOpen(false); setCurrent(""); setNext(""); setConfirm(""); setPassErr(null); };
  const closeMail = () => { setMailOpen(false); setEmail(""); setMailErr(null); };

  const submitPassword = () => {
    setPassErr(null);
    if (next.length < PASSWORD_MIN) { setPassErr(`كلمة المرور الجديدة ${PASSWORD_MIN} محارف على الأقلّ.`); return; }
    if (next !== confirm) { setPassErr("التأكيد لا يطابق الجديدة."); return; }
    startAction(async () => {
      const r = await changeMyPassword({ current, next, captchaToken: tsToken ?? undefined });
      setTsReset((n) => n + 1); // الرمزُ يُستهلك بالمحاولة — يُجدَّد للتالية
      if (r.ok) { toast.success(r.message); closePass(); } else setPassErr(r.message);
    });
  };

  const submitEmail = () => {
    setMailErr(null);
    startAction(async () => {
      const r = await changeMyEmail({ email });
      if (r.ok) { toast.success(r.message); closeMail(); } else setMailErr(r.message);
    });
  };

  const submitSignOut = () => {
    startAction(async () => {
      const r = await signOutEverywhere();
      if (!r.ok) { toast.error(r.message); return; }
      // الجلسة الحاليّة منها، فلا شاشةَ بعدها — يُساق إلى الدخول لا يُترَك في غرفةٍ بلا مفتاح
      router.replace("/login");
    });
  };

  return (
    <div className="mpage">
      <Card>
        <CardHeader
          variant="soft"
          icon={<ShieldCheck />}
          title="الدخول والأمان"
          subtitle="بريدُ دخولك ومفتاحُه، لا يتغيّران إلّا بإثبات"
        />
        <CardBody>
          <div className="viewbar">
            <span>
              <b className="txt lat"><bdi dir="ltr">{settings.email}</bdi></b>
              <span className="fld-help"> بريدُ دخولك، تغييرُه يحتاج تأكيدًا من العنوان الجديد.</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setMailOpen(true)}>
              <Envelope size={16} aria-hidden /> تغيير البريد
            </Button>
          </div>
          <div className="viewbar">
            <span>
              <b>كلمة المرور</b>
              <span className="fld-help"> يلزمك إدخال الحاليّة قبل الجديدة.</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setPassOpen(true)}>
              <Lock size={16} aria-hidden /> تغيير كلمة المرور
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          variant="soft"
          icon={<Desktop />}
          title="أجهزتك وجلساتك"
          subtitle="كلّ جهازٍ فُتحت منه جلسةٌ لحسابك، راجِعها، وما أنكرتَه فأنهِ الجلسات كلّها"
        />
        {/* الجدولُ ابنُ الكرت مباشرةً لا ابنُ متنه — فيبلغ حافّتيه ويخلع إطارَه (قانونُ «سطحٌ مؤطَّرٌ
            لا يحمل سطحًا مؤطَّرًا»). كان في المتن بإطارٍ كامل: سطحُه المصمت يثقب تدرّجَ Aurora في
            الكرت، وحدُّه يرسم إطارًا ثانيًا داخل الأوّل. والفعلُ نزل إلى تذييل الكرت — موضعُه. */}
        {settings.sessionsError ? (
          <CardBody>
            <Alert tone="danger" title="تعذّر قراءة جلساتك">{settings.sessionsError}</Alert>
          </CardBody>
        ) : (
          <DataTable
            columns={sessionColumns}
            rows={settings.sessions}
            getRowId={(s) => s.id}
            emptyState={
              <EmptyState
                icon={<Desktop />}
                title="لا جلسات"
                description="لا جلسةَ مسجّلة لحسابك الآن."
              />
            }
          />
        )}
        <CardFooter>
          <span className="fld-help">يخرج حسابُك من كلّ الأجهزة، ومنها هذا، فتعود إلى الدخول.</span>
          <Button variant="ghost-danger" size="sm" onClick={() => setOutOpen(true)}>
            <SignOut size={16} aria-hidden /> الخروج من كلّ الأجهزة
          </Button>
        </CardFooter>
      </Card>

      {/* ── تغيير كلمة المرور ── */}
      <Modal
        open={passOpen}
        onClose={closePass}
        busy={busy}
        title="تغيير كلمة المرور"
        description="أدخِل الحاليّة إثباتًا، ثمّ الجديدة مرّتين."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={closePass} disabled={busy}>إلغاء</Button>
            <Button variant="primary" size="md" loading={busy} onClick={submitPassword}>حفظ كلمة المرور</Button>
          </>
        }
      >
        <Field label="كلمة المرور الحاليّة" type="password" icon={<Lock />} innerIcon={<Key />}
          placeholder="كلمتك الآن" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        <Field label="كلمة المرور الجديدة" type="password" icon={<Lock />} innerIcon={<Key />}
          placeholder={`${PASSWORD_MIN} محارف على الأقلّ`} value={next} onChange={(e) => setNext(e.target.value)} required />
        <Field label="تأكيد الجديدة" type="password" icon={<Lock />} innerIcon={<Key />}
          placeholder="أعِد كتابتها" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {TURNSTILE_SITE_KEY ? (
          <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} />
        ) : null}
        {passErr ? <Alert tone="danger">{passErr}</Alert> : null}
      </Modal>

      {/* ── تغيير البريد ── */}
      <Modal
        open={mailOpen}
        onClose={closeMail}
        busy={busy}
        title="تغيير بريد الدخول"
        description="يُرسَل رابط تأكيدٍ إلى العنوان الجديد، ولا يسري التغيير قبل فتحه."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={closeMail} disabled={busy}>إلغاء</Button>
            <Button variant="primary" size="md" loading={busy} onClick={submitEmail}>إرسال رابط التأكيد</Button>
          </>
        }
      >
        <Field label="البريد الجديد" type="email" charset="latin" icon={<Envelope />} innerIcon={<At />}
          placeholder="you@adeeb.club" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Alert tone="info" title="حتى تفتح الرابط">
          يبقى دخولك بالبريد الحاليّ <bdi dir="ltr" className="lat">{settings.email}</bdi>.
        </Alert>
        {mailErr ? <Alert tone="danger">{mailErr}</Alert> : null}
      </Modal>

      <ConfirmDialog
        open={outOpen}
        onClose={() => setOutOpen(false)}
        tone="danger"
        icon={<SignOut />}
        title="الخروج من كلّ الأجهزة؟"
        text="تُنهى جلساتُك كلّها، ومنها هذه، فتعود إلى صفحة الدخول. ولن يتغيّر شيءٌ من بياناتك."
        confirmLabel="أنهِ الجلسات"
        loading={busy}
        onConfirm={submitSignOut}
      />

    </div>
  );
}
