"use client";

// عميليّ — نوافذُ وأفعال (وأيقونات Phosphor تُنشئ `createContext`، وذلك ممنوعٌ في مكوّنٍ خادميّ).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader, Field, Modal, Switch, Textarea } from "@adeeb/design-system";
import { At, Desktop, DeviceMobile, DeviceTablet, Envelope, Key, Lock, Megaphone, Quotes, ShieldCheck, UserCircle, UserMinus } from "@phosphor-icons/react";
import { AppleLogo, ArrowSquareOut, GoogleLogo, Plus, SignOut, Trash } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../_components/DataTable";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { EmptyState } from "../_components/EmptyState";
import { useToast } from "../_components/ToastProvider";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { AccountExit } from "@/app/_components/AccountExit";
import type { MyExit } from "@/lib/membershipExit";
import { createClient } from "@/lib/supabase/client";
import { copyText } from "@/lib/clipboard";
import { toArabicAuthError } from "@/lib/authErrors";
import {
  changeMyEmail, changeMyPassword, revokeMySession, setMyMarketing, signOutEverywhere, unlinkMyIdentity, updateMyBio,
} from "./actions";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
import type { LoginMethod, MySession, MySettings } from "./data";
import { BIO_MAX, PROVIDER_LABEL, type ProviderKey } from "./vocab";

/** يطابق `PASSWORD_MIN` في الفعل الخادميّ و`password_min_length` في إعداد المصادقة. */
const PASSWORD_MIN = 8;

/** أيقونةُ الجهاز — نوعُه يُقرأ بلمحةٍ في ٣٧٥px حيث لا يتّسع سطرٌ يصفه. */
const DEVICE_ICON: Record<MySession["kind"], React.ReactNode> = {
  phone: <DeviceMobile aria-hidden />,
  tablet: <DeviceTablet aria-hidden />,
  desktop: <Desktop aria-hidden />,
  unknown: <Desktop aria-hidden />,
};

/** أيقونةُ المزوّد — الشعارُ من `glyphs` لا من Phosphor مباشرةً (الـduotone يُفسد الشعارات). */
const PROVIDER_ICON: Record<ProviderKey, React.ReactNode> = {
  email: <Envelope aria-hidden />,
  google: <GoogleLogo aria-hidden />,
  apple: <AppleLogo aria-hidden />,
};

/** ما يُعرَض للربط حين لا يكون مربوطًا — البريدُ ليس منها: هو أصلُ الحساب لا إضافةٌ عليه.
 *  والنوعُ يمنع ما يمنعه التعليق: `linkIdentity` لا تعرف `email` أصلًا، فالحصرُ في النوع
 *  لا في نيّة الكاتب. */
type LinkableKey = Exclude<ProviderKey, "email">;
const LINKABLE: LinkableKey[] = ["google", "apple"];

const sessionColumns: Column<MySession>[] = [
  {
    key: "device", header: "الجهاز", width: "minmax(180px, 1.6fr)",
    render: (s) => (
      <span className="dt-mm">
        <b className="seg-lbl">{DEVICE_ICON[s.kind]}{s.device}</b>
        {s.current ? <Badge tone="success" variant="soft" dot live>جلستك الحاليّة</Badge> : <span>{s.ip ? <bdi dir="ltr" className="lat">{s.ip}</bdi> : "بلا عنوان"}</span>}
      </span>
    ),
  },
  {
    key: "lastSeen", header: "آخر نشاط", width: "1.2fr",
    // النسبيُّ يُقرأ والطابعُ يُتاح تلميحًا — «منذ ساعتين» جوابُ السؤال، والتاريخُ سندُه
    render: (s) => <span className="txt" title={s.lastSeenStamp}>{s.lastSeen}</span>,
  },
];

/**
 * **الإعدادات** — ما يخصّ **حسابك** لا سجلَّك: مفتاحُ الدخول وعنوانُه وطرقُه، والأجهزةُ التي
 * تحمل جلساتك، وما يبلغك من رسائل، وما يراه الناسُ منك في صفحتك العلنيّة. وفارقُها عن
 * «الملف الشخصي» فارقُ طبقة: ذاك بياناتٌ عنك، وهذه بابُك أنت وما يخرج منه.
 *
 * **ولا شريطَ حفظٍ هنا** خلافًا للملفّ الشخصيّ: هذه **أفعالٌ لا حقول**. لكلٍّ نافذتُها
 * وتأكيدُها، ولا يجوز أن يحملها زرٌّ واحدٌ يحمل معها لونًا مفضّلًا — خلطُ طبقتَي خطرٍ في
 * فعلٍ واحد. والمفتاحُ (`Switch`) لا ينقض القاعدة: هو فعلٌ يقع بلمسته لا حقلٌ ينتظر حفظًا.
 *
 * وترتيبُ الأقسام ترتيبُ القرب من الحساب: بابُك، ثمّ طرقُ فتحه، ثمّ من دخل منه، ثمّ ما يخرج
 * إليك، ثمّ ما يخرج عنك إلى الناس.
 */
type DeletionState = {
  /** طلبُ حذفٍ قائم؟ */
  pending: boolean;
  /** «١٨ سبتمبر ٢٠٢٦» — يومُ التنفيذ مصوغًا في الخادم. */
  dueLabel: string | null;
};

export function SettingsView({ settings, deletion, exit, fullName }: { settings: MySettings; deletion: DeletionState; exit: MyExit; fullName: string }) {
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

  const [bioOpen, setBioOpen] = useState(false);
  const [bio, setBio] = useState(settings.bio);
  const [bioErr, setBioErr] = useState<string | null>(null);

  const [outOpen, setOutOpen] = useState(false);
  /** الجلسةُ المرشَّحة للإنهاء — والنافذةُ تُشتقّ من وجودها، فلا عَلَمُ فتحٍ ثانٍ يفارقها. */
  const [killing, setKilling] = useState<MySession | null>(null);
  const [unlinking, setUnlinking] = useState<LoginMethod | null>(null);

  /* المفتاحُ يسبق الخادمَ ثمّ يصدُقه: الضغطةُ تُرى فورًا، فإن ردّ الخادمُ خطأً عاد إلى
     حاله وقيلت العلّة. ولا يُترَك بلا حالةٍ محلّيّة وإلّا انتظر المفتاحُ جولةَ شبكةٍ كاملة. */
  const [marketing, setMarketing] = useState(settings.marketing);

  const closePass = () => { setPassOpen(false); setCurrent(""); setNext(""); setConfirm(""); setPassErr(null); };
  const closeMail = () => { setMailOpen(false); setEmail(""); setMailErr(null); };
  const closeBio = () => { setBioOpen(false); setBio(settings.bio); setBioErr(null); };

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
      if (r.ok) { toast.success(r.message); closeMail(); router.refresh(); } else setMailErr(r.message);
    });
  };

  const submitBio = () => {
    setBioErr(null);
    startAction(async () => {
      const r = await updateMyBio({ bio });
      if (r.ok) { toast.success(r.message); setBioOpen(false); router.refresh(); } else setBioErr(r.message);
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

  const submitRevoke = () => {
    const target = killing;
    if (!target) return;
    startAction(async () => {
      const r = await revokeMySession(target.id);
      if (r.ok) { toast.success(r.message); setKilling(null); router.refresh(); } else toast.error(r.message);
    });
  };

  const submitUnlink = () => {
    const target = unlinking;
    if (!target) return;
    startAction(async () => {
      const r = await unlinkMyIdentity(target.id);
      if (r.ok) { toast.success(r.message); setUnlinking(null); router.refresh(); } else toast.error(r.message);
    });
  };

  /**
   * الربطُ **عميليّ** خلافًا لفكّه: هو مغادرةٌ إلى المزوّد وعودةٌ برمز، ولا يقع في فعلٍ
   * خادميٍّ ينتهي بجواب. والعودةُ إلى هذه الشاشة نفسِها فيرى العضوُ أثرَ ما فعل.
   */
  const link = (provider: LinkableKey) => {
    startAction(async () => {
      const { error } = await createClient().auth.linkIdentity({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard/settings")}` },
      });
      // النجاحُ مغادرةٌ إلى المزوّد، فلا يُقال شيءٌ إلّا عند فشلٍ يبقينا في الصفحة
      if (error) {
        toast.error(
          error.message.toLowerCase().includes("manual linking")
            ? "ربطُ الحسابات غير مفعَّلٍ في إعداد المصادقة بعد."
            : toArabicAuthError(error.message),
        );
      }
    });
  };

  const toggleMarketing = (on: boolean) => {
    setMarketing(on);
    startAction(async () => {
      const r = await setMyMarketing(on);
      if (r.ok) toast.success(r.message);
      else { setMarketing(!on); toast.error(r.message); }
    });
  };

  const copySlug = async (url: string) => {
    try { await copyText(url); toast.success("نُسِخ رابط صفحتك."); }
    catch { toast.error("تعذّر النسخ"); }
  };

  const linked = new Set(settings.methods.map((m) => m.provider));
  const canUnlink = settings.methods.length > 1 && linked.has("email");
  const slugUrl = settings.publicSlug ? `https://adeeb.club/m/${settings.publicSlug}` : null;
  const bioLeft = BIO_MAX - bio.trim().length;

  return (
    <div className="mpage">
      {settings.profileError ? (
        <Alert tone="warning" title="تعذّر جلب تفضيلاتك">{settings.profileError}</Alert>
      ) : null}

      {/* ── ١ · الدخول والأمان ── */}
      <Card>
        <CardHeader
          variant="soft"
          icon={<ShieldCheck />}
          title="الدخول والأمان"
          subtitle="بريدُ دخولك ومفتاحُه، لا يتغيّران إلّا بإثبات"
        />
        <CardBody>
          <div className="setl">
            <div className="viewbar">
              <span>
                <b className="txt lat"><bdi dir="ltr">{settings.email}</bdi></b>
                <span className="fld-help"> بريدُ دخولك، تغييرُه يحتاج تأكيدًا من العنوان الجديد.</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setMailOpen(true)}>
                <Envelope size={16} aria-hidden /> تغيير البريد
              </Button>
            </div>
            {/* طلبٌ معلّق: `new_email` يبقى مملوءًا حتى يُفتح الرابط — والصمتُ عنه يُنسي العضوَ طلبَه */}
            {settings.pendingEmail ? (
              <Alert tone="info" title="طلبُ تغييرٍ لم يكتمل">
                أُرسل رابطُ تأكيدٍ إلى <bdi dir="ltr" className="lat">{settings.pendingEmail}</bdi>، ولا يسري التغيير قبل فتحه. ودخولُك إلى حينه بالبريد الحاليّ.
              </Alert>
            ) : null}
            <div className="viewbar">
              <span>
                <b>كلمة المرور</b>
                <span className="fld-help"> يلزمك إدخال الحاليّة قبل الجديدة.</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPassOpen(true)}>
                <Lock size={16} aria-hidden /> تغيير كلمة المرور
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── ٢ · طرق الدخول ── */}
      <Card>
        <CardHeader
          variant="soft"
          icon={<Key />}
          title="طرق الدخول"
          subtitle="بمَ يُفتح حسابُك، وما الذي يُضاف إليه أو يُنزَع عنه"
        />
        <CardBody>
          <div className="setl">
            {settings.methods.map((m) => (
              <div className="viewbar" key={m.id}>
                <span>
                  <b className="seg-lbl">{PROVIDER_ICON[m.provider]}{PROVIDER_LABEL[m.provider]}</b>
                  <span className="fld-help">
                    {m.provider !== "email" && m.account ? <> <bdi dir="ltr" className="lat">{m.account}</bdi>،</> : null}
                    {m.lastUsed ? ` آخرُ دخولٍ ${m.lastUsed}.` : " لم يُدخَل به بعد."}
                  </span>
                </span>
                {m.provider === "email" ? (
                  // البريدُ لا يُفكّ: هو أصلُ الحساب وبابُ استعادته، وفكُّه يُغلق البابين معًا
                  <Badge tone="neutral" variant="soft">الأساس</Badge>
                ) : (
                  <Button variant="ghost-danger" size="sm" disabled={!canUnlink} onClick={() => setUnlinking(m)}>
                    <Trash size={16} aria-hidden /> فكّ الربط
                  </Button>
                )}
              </div>
            ))}
            {LINKABLE.filter((p) => !linked.has(p)).map((p) => (
              <div className="viewbar" key={p}>
                <span>
                  <b className="seg-lbl">{PROVIDER_ICON[p]}{PROVIDER_LABEL[p]}</b>
                  <span className="fld-help"> غيرُ مربوط، ورَبطُه يجعله بابًا ثانيًا لحسابك نفسِه.</span>
                </span>
                <Button variant="ghost" size="sm" loading={busy} onClick={() => link(p)}>
                  <Plus size={16} aria-hidden /> ربط
                </Button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ── ٣ · جلساتك وأجهزتك ── */}
      <Card>
        <CardHeader
          variant="soft"
          icon={<Desktop />}
          title="أجهزتك وجلساتك"
          subtitle="كلّ جهازٍ فُتحت منه جلسةٌ لحسابك، أنهِ ما أنكرتَه منها وحدَه أو أنهِها كلَّها"
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
            /* ولا فعلَ على جلستك الحاليّة: إنهاؤها خروجٌ من هذه الشاشة نفسِها، وله زرُّه في
               رأس اللوحة. فالقائمةُ الفارغة تُمنَع بإرجاع مجموعةٍ خالية لا ببندٍ معطَّل. */
            rowActions={(s) => (s.current ? [] : [
              { danger: true, items: [{ label: "إنهاء هذه الجلسة", icon: <SignOut />, danger: true, onSelect: () => setKilling(s) }] },
            ])}
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

      {/* ── ٤ · رسائل النادي ── */}
      <Card>
        <CardHeader
          variant="soft"
          icon={<Megaphone />}
          title="رسائل النادي"
          subtitle="ما يصل بريدَك من أديب، عدا رسائل حسابك"
        />
        <CardBody>
          <Switch
            row
            label="أخبارُ أديب ودعواتُه"
            description="ما يُعلَن من فعّاليّاتٍ وأبوابٍ تُفتح. ورسائلُ الحساب (تأكيدُ بريدٍ واستعادةُ كلمة مرور) تصل في كلّ حال."
            checked={marketing}
            disabled={busy}
            onChange={(e) => toggleMarketing(e.target.checked)}
          />
        </CardBody>
      </Card>

      {/* ── ٥ · صفحتك العلنيّة ── */}
      <Card>
        <CardHeader
          variant="soft"
          icon={<UserCircle />}
          title="صفحتك العلنيّة"
          subtitle="ما يراه الناسُ عنك خارج اللوحة"
        />
        <CardBody>
          <div className="setl">
            {slugUrl ? (
              <div className="viewbar">
                <span>
                  <b>{settings.publicSlug}</b>
                  <span className="fld-help"> عنوانُك على <bdi dir="ltr" className="lat">adeeb.club</bdi>، يُشتقّ من اسمك ويتبعه إن تغيّر.</span>
                </span>
                <span className="chip-row">
                  <Button variant="ghost" size="sm" onClick={() => copySlug(slugUrl)}>نسخ الرابط</Button>
                  {/* وسمُه <a> لا <button>: وجهتُه عنوانٌ يُفتح في لسانٍ جديدٍ ويُصاد بالزرّ
                      الأوسط. و`Button` أزرارٌ فقط، وطبقتُه في المكتبة (`abtn`) تخدم الاثنين. */}
                  <a className="abtn abtn-ghost abtn-sm" href={`/m/${settings.publicSlug}`} target="_blank" rel="noreferrer">
                    <ArrowSquareOut size={16} aria-hidden /> فتح
                  </a>
                </span>
              </div>
            ) : (
              // لا صفحةَ لمن لا منصبَ فعّالًا له — تُقال العلّةُ ولا يُعرَض رابطٌ يردّ ٤٠٤
              <Alert tone="info" title="لا صفحةَ علنيّةً لك بعد">
                تُفتح صفحتُك حين يكون لك منصبٌ فعّالٌ في الهيكل. ونبذتُك محفوظةٌ إلى ذلك الحين.
              </Alert>
            )}
            <div className="viewbar">
              <span>
                <b>نبذتك</b>
                <span className="fld-help"> {settings.bio || "لا نبذةَ بعد، وسطرٌ عنك خيرٌ من فراغ."}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => { setBio(settings.bio); setBioOpen(true); }}>
                <Quotes size={16} aria-hidden /> {settings.bio ? "تحرير النبذة" : "كتابة نبذة"}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── ٦ · حذف الحساب ──
          آخرُ بطاقةٍ عن قصد: ترتيبُ هذه الغرفة من الأقرب إلى الحساب فالأبعد، وهذا آخرُ ما
          يفعله المرءُ بحسابه. ونغمتُها خطرٌ بلا تهويل: البابُ يُفتح ولا يُخفى. */}
      <Card>
        <CardHeader
          variant="soft"
          icon={<UserMinus />}
          title={exit.door === "delete" ? "حذف الحساب" : "الخروج من أديب"}
          subtitle={exit.door === "delete" ? "بابُك إلى الخروج، ومهلتُه ثلاثون يومًا" : "عضويّتُك أوّلًا، ثمّ حسابُك إن شئت"}
        />
        <CardBody>
          <AccountExit
            door={exit.door}
            deciders={exit.deciders}
            fullName={fullName}
            pending={exit.pending}
            lastAnswer={exit.lastAnswer}
            deletion={{
              pending: deletion.pending,
              dueLabel: deletion.dueLabel,
              hasPassword: settings.methods.some((m) => m.provider === "email"),
            }}
          />
        </CardBody>
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

      {/* ── النبذة العلنيّة ── */}
      <Modal
        open={bioOpen}
        onClose={closeBio}
        busy={busy}
        title="نبذتك العلنيّة"
        description="سطرٌ يُقرأ في صفحتك وفي وصفِ مشاركتها. اتركه فارغًا لتُزيله."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={closeBio} disabled={busy}>إلغاء</Button>
            <Button variant="primary" size="md" loading={busy} onClick={submitBio}>حفظ النبذة</Button>
          </>
        }
      >
        <Textarea
          label="النبذة"
          icon={<UserCircle />}
          innerIcon={<Quotes />}
          placeholder="كاتبٌ ومحرّرٌ في نادي أديب."
          rows={3}
          optional
          value={bio}
          maxLength={BIO_MAX}
          onChange={(e) => setBio(e.target.value)}
          error={bioLeft < 0 ? `تجاوزتَ الحدّ بـ${-bioLeft} محرفًا.` : undefined}
          helper={`بقي ${bioLeft} محرفًا من ${BIO_MAX}.`}
        />
        {bioErr ? <Alert tone="danger">{bioErr}</Alert> : null}
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

      <ConfirmDialog
        open={killing !== null}
        onClose={() => setKilling(null)}
        tone="danger"
        icon={<SignOut />}
        title="إنهاء هذه الجلسة؟"
        text={killing ? `يخرج حسابُك من «${killing.device}» وحدَه (جلسةٌ بدأت في ${killing.started})، وتبقى جلستُك هنا كما هي. ومن أراد العودةَ منه دخل من جديد.` : undefined}
        confirmLabel="أنهِ الجلسة"
        loading={busy}
        onConfirm={submitRevoke}
      />

      <ConfirmDialog
        open={unlinking !== null}
        onClose={() => setUnlinking(null)}
        tone="danger"
        icon={<Trash />}
        title="فكّ الربط؟"
        text={unlinking ? `لن تدخل بـ${PROVIDER_LABEL[unlinking.provider]} بعدها، ويبقى دخولُك ببريدك وكلمة مرورك. ولك ربطُه ثانيةً متى شئت.` : undefined}
        confirmLabel="افكُك الربط"
        loading={busy}
        onConfirm={submitUnlink}
      />
    </div>
  );
}
