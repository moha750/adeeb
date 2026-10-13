"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardBanner, CardHeader, Field, Modal, Switch } from "@adeeb/design-system";
import {
  At, Bell, BellRinging, Copy, Desktop, DeviceMobile, DeviceTablet, Envelope, GenderFemale, GenderMale, Globe, Hash, IdentificationCard, Key, Link as LinkIcon, ListBullets, LinkBreak, Lock, MapPin, PaperPlaneTilt, Phone, Quotes, ShieldCheck, User,
} from "@phosphor-icons/react";
import { AppleLogo, CaretDown, CaretUp, DownloadSimple, GoogleLogo, PencilSimple, SignOut, Trash, WarningCircle, X } from "@/app/_components/glyphs";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { DeleteAccount } from "@/app/_components/DeleteAccount";
import { AccountExit } from "@/app/_components/AccountExit";
import type { MyExit } from "@/lib/membershipExit";
import type { MyProfile } from "../profile/data";
import { MEMBER_SECTIONS, MemberSections } from "./MemberSections";
import { PwaContent } from "@/app/_pwa/PwaContent";
import { usePwa } from "@/app/_pwa/usePwa";
import { createClient } from "@/lib/supabase/client";
import { copyText } from "@/lib/clipboard";
import { toArabicAuthError } from "@/lib/authErrors";
import { PHONE_PREFIX } from "@/lib/fieldFormats";
import { saveMyData } from "@/app/me/actions";
import type { MyAccount } from "@/app/me/data";
import {
  changeMyEmail, changeMyPassword, revokeMySession, setMyMarketing, signOutEverywhere, unlinkMyIdentity, updateMyBio,
} from "../settings/actions";
import type { LoginMethod, MySession, MySettings } from "../settings/data";
import { BIO_MAX, PROVIDER_LABEL } from "../settings/vocab";
import { AvatarEditor } from "../profile/AvatarEditor";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useToast } from "../_components/ToastProvider";
import { EDIT, EditRow, Row, type Ico } from "./Row";
import { counted } from "./time";

/**
 * **غرفةُ «حسابي»** — قدوةُ الغرف كلِّها («جدًّا راضٍ ومعجب»، المالك ٢٠٢٦-١٠-١٣). لصديق أدِيب
 * والمتطوّع؛ والعضوُ حسابُه في «الإعدادات» و«الملف الشخصي» (تُحوّله الصفحةُ إليهما).
 *
 * الأقسامُ كروتٌ معنونة، والسطرُ كلُّه زرٌّ بفعلٍ في طرفه، والتعديلُ في نافذةٍ صغيرة. والأفعالُ
 * هي أفعالُ «الإعدادات» نفسُها (بجلسة صاحبها، والقاعدةُ تحصر المدى) لا نسخٌ ثانية، والبياناتُ
 * بـ`saveMyData` الذي يمنع العضوَ ويقبل غيرَه.
 */

const PASSWORD_MIN = 8;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const DEVICE: Record<MySession["kind"], Ico> = { phone: DeviceMobile, tablet: DeviceTablet, desktop: Desktop, unknown: Desktop };
const LINKABLE = [
  { key: "google", Icon: GoogleLogo },
  { key: "apple", Icon: AppleLogo },
] as const;

type Section = { id: string; label: string; Icon: Ico };

export function AccountRoom({ account, avatar, standing, settings, member }: {
  account: MyAccount;
  avatar: string | null;
  /** «صديق أدِيب منذ يوليو 2026» */
  standing: string;
  settings: MySettings;
  /**
   * **العضو** (قرار المالك ٢٠٢٦-١٠-١٣): «الملف الشخصي» و«الإعدادات» صارا هنا. فبدل «بياناتك»
   * الصديق تأتي هويّتُه وبياناتُه وحساباتُه (`MemberSections`)، وبابُ خروجه `AccountExit` لا الحذف.
   */
  member?: { profile: MyProfile; exit: MyExit };
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  const pwa = usePwa();
  const female = account.gender === "female";

  /* ── بياناتك: كلُّ حقلٍ يُحفظ وحدَه، والفعلُ يأخذ الثلاثةَ معًا (ما لم يُمسّ يبقى كما هو) ── */
  const [draft, setDraft] = useState({ fullName: account.fullName, phone: account.phone, city: account.city });
  const [dataErr, setDataErr] = useState<string | null>(null);
  const openData = () => { setDraft({ fullName: account.fullName, phone: account.phone, city: account.city }); setDataErr(null); };
  const saveData = (field: "fullName" | "phone" | "city") => async () => {
    setDataErr(null);
    const r = await saveMyData(draft);
    if (!r.ok) { setDataErr(r.fieldErrors?.[field] ?? r.message); return false; }
    toast.success(r.message);
    router.refresh();
    return true;
  };

  /* ── النبذة (لمن له صفحةٌ علنيّة) ── */
  const [bio, setBio] = useState(settings.bio);
  const [bioErr, setBioErr] = useState<string | null>(null);
  const saveBio = async () => {
    setBioErr(null);
    const r = await updateMyBio({ bio });
    if (!r.ok) { setBioErr(r.message); return false; }
    toast.success(r.message);
    router.refresh();
    return true;
  };
  const slugUrl = settings.publicSlug ? `https://adeeb.club/m/${settings.publicSlug}` : null;

  /* ── الدخول والأمان ── */
  const [mailOpen, setMailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [mailErr, setMailErr] = useState<string | null>(null);
  const closeMail = () => { if (!busy) { setMailOpen(false); setEmail(""); setMailErr(null); } };
  const submitEmail = () => {
    setMailErr(null);
    start(async () => {
      const r = await changeMyEmail({ email });
      if (r.ok) { toast.success(r.message); setMailOpen(false); setEmail(""); router.refresh(); } else setMailErr(r.message);
    });
  };

  const [passOpen, setPassOpen] = useState(false);
  const [pass, setPass] = useState({ current: "", next: "", confirm: "" });
  const [passErr, setPassErr] = useState<string | null>(null);
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [tsReset, setTsReset] = useState(0);
  const closePass = () => { if (!busy) { setPassOpen(false); setPass({ current: "", next: "", confirm: "" }); setPassErr(null); } };
  const submitPassword = () => {
    setPassErr(null);
    if (pass.next.length < PASSWORD_MIN) { setPassErr(`كلمة المرور الجديدة ${PASSWORD_MIN} محارف على الأقلّ.`); return; }
    if (pass.next !== pass.confirm) { setPassErr("التأكيد لا يطابق الجديدة."); return; }
    start(async () => {
      const r = await changeMyPassword({ current: pass.current, next: pass.next, captchaToken: tsToken ?? undefined });
      setTsReset((n) => n + 1);
      if (r.ok) { toast.success(r.message); setPassOpen(false); setPass({ current: "", next: "", confirm: "" }); } else setPassErr(r.message);
    });
  };

  const linked = new Map(settings.methods.map((m) => [m.provider, m]));
  const hasPassword = linked.has("email");
  const canUnlink = settings.methods.length > 1 && hasPassword;
  const [unlinking, setUnlinking] = useState<LoginMethod | null>(null);
  const submitUnlink = () => {
    const t = unlinking;
    if (!t) return;
    start(async () => {
      const r = await unlinkMyIdentity(t.id);
      if (r.ok) { toast.success(r.message); setUnlinking(null); router.refresh(); } else toast.error(r.message);
    });
  };
  // الربطُ مغادرةٌ إلى المزوّد وعودةٌ إلى هذه الغرفة نفسِها
  const link = (provider: "google" | "apple") => {
    start(async () => {
      const { error } = await createClient().auth.linkIdentity({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard/account")}` },
      });
      if (error) {
        toast.error(error.message.toLowerCase().includes("manual linking") ? "ربطُ الحسابات غير مفعَّلٍ في إعداد المصادقة بعد." : toArabicAuthError(error.message));
      }
    });
  };

  /* ── أجهزتك ── */
  const [killing, setKilling] = useState<MySession | null>(null);
  /** آخرُ خمسِ جلساتٍ وتنفتح بقيّتُها في مكانها، كـ«سجلّك» في الغرف (لغةٌ واحدة) */
  const [allSessions, setAllSessions] = useState(false);
  const SESSIONS_SHOWN = 5;
  const sessions = allSessions ? settings.sessions : settings.sessions.slice(0, SESSIONS_SHOWN);
  const [outOpen, setOutOpen] = useState(false);
  const submitRevoke = () => {
    const t = killing;
    if (!t) return;
    start(async () => {
      const r = await revokeMySession(t.id);
      if (r.ok) { toast.success(r.message); setKilling(null); router.refresh(); } else toast.error(r.message);
    });
  };
  const submitSignOut = () => {
    start(async () => {
      const r = await signOutEverywhere();
      if (!r.ok) { toast.error(r.message); return; }
      router.replace("/login");
    });
  };

  /* ── الإشعارات ── */
  const [marketing, setMarketing] = useState(settings.marketing);
  const toggleMarketing = (on: boolean) => {
    setMarketing(on);
    start(async () => {
      const r = await setMyMarketing(on);
      if (r.ok) toast.success(r.message);
      else { setMarketing(!on); toast.error(r.message); }
    });
  };
  const [exitOpen, setExitOpen] = useState(false);
  /** ما لا يُفعَّل بلمسة (آيفون قبل التثبيت، أو محجوبٌ، أو متصفّحٌ لا يحملها) يُشرح في نافذة. */
  const [pwaHelp, setPwaHelp] = useState(false);

  const copy = async (text: string, ok: string) => {
    try { await copyText(text); toast.success(ok); } catch { toast.error("تعذّر النسخ"); }
  };

  /* ── الفهرس ── */
  const SECTIONS: Section[] = [
    ...(member
      ? MEMBER_SECTIONS.filter((x) => x.id !== "acc-social" || member.profile.hasDetails)
      : [{ id: "acc-data", label: "بياناتك", Icon: IdentificationCard }]),
    ...(slugUrl ? [{ id: "acc-page", label: "صفحتك العلنيّة", Icon: Globe }] : []),
    { id: "acc-login", label: "الدخول والأمان", Icon: ShieldCheck },
    { id: "acc-devices", label: "أجهزتك", Icon: DeviceMobile },
    { id: "acc-notify", label: "الإشعارات", Icon: Bell },
    { id: "acc-exit", label: "حسابك", Icon: WarningCircle },
  ];
  const [at, setAt] = useState(member ? "acc-id" : "acc-data");
  useEffect(() => {
    const io = new IntersectionObserver((es) => {
      const hit = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setAt(hit.target.id);
    }, { rootMargin: "-10% 0px -70% 0px" });
    document.querySelectorAll(".acc-sec[id]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const noPhone = !account.phone;
  const pushRow = (() => {
    if (pwa.stage === "loading") return <Row Icon={Bell} k="إشعاراتُ الجوّال" v="نفحص جهازك…" />;
    if (pwa.stage === "ready" || pwa.stage === "on") {
      return (
        <div className="acc-row">
          <span className="acc-ic" aria-hidden><Bell /></span>
          <Switch row label="إشعاراتُ الجوّال" description="مواعيدُك وقبولُك وشهاداتُك على شاشة القفل"
            checked={pwa.stage === "on"} disabled={pwa.busy !== null}
            onChange={(e) => (e.target.checked ? pwa.enable() : pwa.disable())} />
        </div>
      );
    }
    const say = {
      "ios-install": { v: "أضِف أَدِيب إلى شاشتك الرئيسيّة أوّلًا", act: "الخطوات" },
      "ios-update": { v: "نظامُ جوّالك أقدمُ من الإشعارات", act: "التفاصيل" },
      unsupported: { v: "متصفّحُك لا يحمل الإشعارات", act: "التفاصيل" },
      denied: { v: "محجوبةٌ على هذا الجهاز", act: "كيف أفتحها؟" },
    }[pwa.stage];
    return <Row Icon={Bell} k="إشعاراتُ الجوّال" v={say.v} tone={pwa.stage === "denied" ? "wait" : undefined}
      act={{ Icon: BellRinging, label: say.act, text: say.act }} onClick={() => setPwaHelp(true)} />;
  })();

  return (
    <div className="acc-cols">
      <div className="acc-main">
        {member ? <MemberSections profile={member.profile} /> : (
        <section id="acc-data" className="acc-sec">
          <Card className="acc-group">
            <CardHeader variant="soft" icon={<IdentificationCard aria-hidden />} title="بياناتك" />
            <EditRow Icon={User} k="الاسم الكامل" v={account.fullName} empty="لم تكتبه بعد" onOpen={openData} onSave={saveData("fullName")} error={dataErr}
              field={<Field label="الاسم الكامل" icon={<User />} innerIcon={<PencilSimple />} placeholder="اسمك كما يُكتب في شهاداتك"
                value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} required />} />
            <EditRow Icon={Phone} k="رقم الجوّال" v={account.phone} ltr empty="لم تُضِفه بعد" onOpen={openData} onSave={saveData("phone")} error={dataErr}
              field={<Field label="رقم الجوّال" type="tel" charset="digits" prefix={PHONE_PREFIX} icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx"
                value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} required />} />
            <Row Icon={female ? GenderFemale : GenderMale} k="الجنس" v={account.gender ? (female ? "أنثى" : "ذكر") : "لم يُحدَّد"} />
            <EditRow Icon={MapPin} k="المدينة" v={account.city} empty="لم تكتبها بعد" onOpen={openData} onSave={saveData("city")} error={dataErr}
              field={<Field label="المدينة" icon={<MapPin />} innerIcon={<PencilSimple />} placeholder="مدينتك" optional
                value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />} />
          </Card>
        </section>
        )}

        {slugUrl ? (
          <section id="acc-page" className="acc-sec">
            <Card className="acc-group">
              <CardHeader variant="soft" icon={<Globe aria-hidden />} title="صفحتك العلنيّة" />
              <Row Icon={Globe} k="الرابط" v={`adeeb.club/m/${settings.publicSlug}`} ltr act={{ Icon: Copy, label: "نسخ الرابط", text: "نسخ" }}
                onClick={() => copy(slugUrl, "نُسخ رابطُ صفحتك.")} />
              <EditRow Icon={Quotes} k="النبذة" v={settings.bio} empty="لا نبذةَ بعد" onOpen={() => { setBio(settings.bio); setBioErr(null); }} onSave={saveBio} error={bioErr}
                field={<Field label="النبذة" icon={<Quotes />} innerIcon={<PencilSimple />} placeholder="سطرٌ يعرّفك" optional maxLength={BIO_MAX}
                  value={bio} onChange={(e) => setBio(e.target.value)} />} />
            </Card>
          </section>
        ) : null}

        <section id="acc-login" className="acc-sec">
          <Card className="acc-group">
            <CardHeader variant="soft" icon={<ShieldCheck aria-hidden />} title="الدخول والأمان" />
            <Row Icon={Envelope} k="بريد الدخول" v={settings.email} ltr act={EDIT} onClick={() => setMailOpen(true)}
              sub={settings.pendingEmail ? `ينتظر تأكيدَ ${settings.pendingEmail}` : undefined} tone={settings.pendingEmail ? "wait" : undefined} toneAt="sub" />
            {hasPassword ? <Row Icon={Key} k="كلمة المرور" v="مُعيَّنة" sub="يلزمك إدخالُ الحاليّة قبل الجديدة" act={EDIT} onClick={() => setPassOpen(true)} /> : null}
            {LINKABLE.map(({ key, Icon }) => {
              const m = linked.get(key);
              return m
                ? <Row key={key} Icon={Icon} k={`الدخول بـ${PROVIDER_LABEL[key]}`} v="مربوط" sub={m.account ?? undefined}
                    act={{ Icon: LinkBreak, label: "فكّ الربط", text: "فكّ الربط" }} disabled={!canUnlink || busy} onClick={() => setUnlinking(m)} />
                : <Row key={key} Icon={Icon} k={`الدخول بـ${PROVIDER_LABEL[key]}`} v="غير مربوط"
                    act={{ Icon: LinkIcon, label: "ربط", text: "ربط" }} disabled={busy} onClick={() => link(key)} />;
            })}
          </Card>
        </section>

        <section id="acc-devices" className="acc-sec">
          <Card className="acc-group">
            <CardHeader variant="soft" icon={<DeviceMobile aria-hidden />} title="أجهزتك" />
            {settings.sessionsError ? <Alert tone="danger" title="تعذّر قراءة جلساتك">{settings.sessionsError}</Alert> : null}
            {sessions.map((s) => s.current
              ? <Row key={s.id} Icon={DEVICE[s.kind]} k="هذا الجهاز" v={s.device} sub="جلستُك الآن" tone="ok" toneAt="sub" />
              : <Row key={s.id} Icon={DEVICE[s.kind]} k={`آخر نشاط ${s.lastSeen}`} v={s.device} sub={`بدأت في ${s.started}`}
                  act={{ Icon: X, label: "إنهاء الجلسة", danger: true, text: "إنهاء" }} onClick={() => setKilling(s)} />)}
            {settings.sessions.length > SESSIONS_SHOWN ? (
              allSessions
                ? <Row Icon={ListBullets} v="اطوِ القائمة" sub={`ويبقى آخرُ ${SESSIONS_SHOWN} جلسات`}
                    act={{ Icon: CaretUp as unknown as Ico, label: "طيّ الجلسات", text: "أقلّ" }} onClick={() => setAllSessions(false)} />
                : <Row Icon={ListBullets} v="كلُّ جلساتك" sub={counted(settings.sessions.length, "جلسةٌ واحدة", "جلستان", "جلسات مفتوحة", "جلسةً مفتوحة")}
                    act={{ Icon: CaretDown as unknown as Ico, label: "عرض كلّ الجلسات", text: "عرض" }} onClick={() => setAllSessions(true)} />
            ) : null}
            <Row Icon={SignOut} k="كلّ الأجهزة" v="الخروج منها جميعًا" sub="ومنها هذا، فتعود إلى الدخول"
              act={{ Icon: SignOut, label: "الخروج من كلّ الأجهزة", danger: true, text: "خروج" }} onClick={() => setOutOpen(true)} />
          </Card>
        </section>

        <section id="acc-notify" className="acc-sec">
          <Card className="acc-group">
            <CardHeader variant="soft" icon={<Bell aria-hidden />} title="الإشعارات" />
            <div className="acc-row">
              <span className="acc-ic" aria-hidden><Envelope /></span>
              <Switch row label="أخبارُ أدِيب ودعواتُه" description="على بريدك" checked={marketing} disabled={busy}
                onChange={(e) => toggleMarketing(e.target.checked)} />
            </div>
            {pushRow}
            {pwa.stage === "on"
              ? <Row Icon={PaperPlaneTilt} k="تجربة" v="إشعارٌ تجريبيٌّ إلى هذا الجهاز" act={{ Icon: PaperPlaneTilt, label: "أرسل إشعارًا تجريبيًّا", text: "أرسل" }}
                  disabled={pwa.busy !== null} onClick={pwa.test} />
              : null}
            {pwa.canInstall
              ? <Row Icon={DownloadSimple} k="تطبيقُ أدِيب" v="غير مثبَّت على هذا الجهاز" act={{ Icon: DownloadSimple, label: "تثبيت", text: "تثبيت" }}
                  disabled={pwa.busy !== null} onClick={pwa.install} />
              : null}
            {pwa.note ? <Alert tone={pwa.note.ok ? "success" : "danger"} compact>{pwa.note.text}</Alert> : null}
          </Card>
        </section>

        <section id="acc-exit" className="acc-sec">
          <Card className="acc-group" tone="danger">
            <CardHeader variant="soft" icon={<WarningCircle aria-hidden />} title="حسابك" />
            {member ? (
              // العضوُ يُنهي عضويّتَه قبل حسابه (قرار المالك ٢٠٢٦-٠٨-٢٠)، والبابُ بحسب مقعده من القاعدة
              <Row Icon={WarningCircle} v="الخروج من أدِيب"
                sub={member.exit.pending ? "طلبُ خروجك ينتظر القرار" : member.exit.door === "sealed" ? "مقعدُك محميّ، ولا بابَ له من هنا" : "عضويّتُك أوّلًا، ثمّ حسابُك إن شئت"}
                tone={member.exit.pending ? "wait" : undefined} toneAt="sub"
                act={{ Icon: member.exit.door === "sealed" ? WarningCircle : X, label: "الخروج من أدِيب", danger: member.exit.door !== "sealed", text: member.exit.door === "sealed" ? "التفاصيل" : "خروج" }}
                danger={member.exit.door !== "sealed"} onClick={() => setExitOpen(true)} />
            ) : (
            <DeleteAccount pending={false} dueLabel={null} hasPassword={hasPassword}
              trigger={(open) => <Row Icon={Trash} v="حذف حسابك" sub="لك ثلاثون يومًا تتراجع فيها متى شئت"
                act={{ Icon: Trash, label: "حذف حسابي", danger: true, text: "حذف" }} onClick={open} />} />
            )}
          </Card>
        </section>
      </div>

      <aside className="acc-aside">
        <Card className="acard-profile acc-me">
          <CardBanner />
          <AvatarEditor look="cam" name={account.fullName} gender={account.gender} avatar={avatar} />
          <h4 className="acard-pname">{account.fullName || "صاحب الحساب"}</h4>
          <div className="acard-role">{standing}</div>
        </Card>
        {noPhone ? <Alert tone="warning" title="أضِف رقم جوّالك">لا حجزَ بدونه.</Alert> : null}
        <nav className="acc-index" aria-label="أقسام حسابك">
          {SECTIONS.map(({ id, label, Icon }) => (
            <a key={id} href={`#${id}`} aria-current={at === id}>
              <span className="acc-index-ic" aria-hidden><Icon /></span>
              {label}
              {noPhone && id === "acc-data" ? <span className="acc-index-due" aria-label="ينقصه رقم الجوّال" /> : null}
            </a>
          ))}
        </nav>
      </aside>

      <Modal open={mailOpen} onClose={closeMail} busy={busy} size="sm" title="تغيير بريد الدخول"
        description="يُرسَل رابطُ تأكيدٍ إلى العنوان الجديد، ولا يسري التغيير قبل فتحه."
        footer={<>
          <Button variant="primary" loading={busy} onClick={submitEmail}>إرسال رابط التأكيد</Button>
          <Button variant="ghost" onClick={closeMail} disabled={busy}>إلغاء</Button>
        </>}>
        {mailErr ? <Alert tone="danger">{mailErr}</Alert> : null}
        <Field label="البريد الجديد" type="email" charset="latin" icon={<Envelope />} innerIcon={<At />} placeholder="you@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Modal>

      <Modal open={passOpen} onClose={closePass} busy={busy} size="sm" title="تغيير كلمة المرور"
        description="أدخِل الحاليّة إثباتًا، ثمّ الجديدة مرّتين."
        footer={<>
          <Button variant="primary" loading={busy} onClick={submitPassword}>حفظ كلمة المرور</Button>
          <Button variant="ghost" onClick={closePass} disabled={busy}>إلغاء</Button>
        </>}>
        {passErr ? <Alert tone="danger">{passErr}</Alert> : null}
        <Field label="كلمة المرور الحاليّة" type="password" icon={<Lock />} innerIcon={<Key />} placeholder="كلمتك الآن"
          value={pass.current} onChange={(e) => setPass({ ...pass, current: e.target.value })} required />
        <Field label="كلمة المرور الجديدة" type="password" icon={<Lock />} innerIcon={<Key />} placeholder={`${PASSWORD_MIN} محارف على الأقلّ`}
          value={pass.next} onChange={(e) => setPass({ ...pass, next: e.target.value })} required />
        <Field label="تأكيد الجديدة" type="password" icon={<Lock />} innerIcon={<Key />} placeholder="أعِد كتابتها"
          value={pass.confirm} onChange={(e) => setPass({ ...pass, confirm: e.target.value })} required />
        {TURNSTILE_SITE_KEY ? <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTsToken} resetSignal={tsReset} /> : null}
      </Modal>

      {member ? (
        <Modal open={exitOpen} onClose={() => setExitOpen(false)} size="sm" className="mdl-tone-danger" title="الخروج من أدِيب"
          footer={<Button variant="ghost" onClick={() => setExitOpen(false)}>إغلاق</Button>}>
          <AccountExit door={member.exit.door} deciders={member.exit.deciders} fullName={account.fullName} pending={member.exit.pending}
            lastAnswer={member.exit.lastAnswer} deletion={{ pending: false, dueLabel: null, hasPassword }} />
        </Modal>
      ) : null}

      <Modal open={pwaHelp} onClose={() => setPwaHelp(false)} size="sm" title="إشعاراتُ الجوّال"
        footer={<Button variant="ghost" onClick={() => setPwaHelp(false)}>حسنًا</Button>}>
        <PwaContent pwa={pwa} />
      </Modal>

      <ConfirmDialog open={unlinking !== null} onClose={() => setUnlinking(null)} tone="danger" icon={<LinkBreak />} title="فكّ الربط؟"
        text={unlinking ? `لن تدخل بـ${PROVIDER_LABEL[unlinking.provider]} بعدها، ويبقى دخولُك ببريدك وكلمة مرورك. ولك ربطُه ثانيةً متى شئت.` : undefined}
        confirmLabel="فُكّ الربط" loading={busy} onConfirm={submitUnlink} />
      <ConfirmDialog open={killing !== null} onClose={() => setKilling(null)} tone="danger" icon={<SignOut />} title="إنهاء هذه الجلسة؟"
        text={killing ? `يخرج حسابُك من «${killing.device}» وحدَه، وتبقى جلستُك هنا كما هي.` : undefined}
        confirmLabel="أنهِ الجلسة" loading={busy} onConfirm={submitRevoke} />
      <ConfirmDialog open={outOpen} onClose={() => setOutOpen(false)} tone="danger" icon={<SignOut />} title="الخروج من كلّ الأجهزة؟"
        text="تُنهى جلساتُك كلّها، ومنها هذه، فتعود إلى صفحة الدخول. ولن يتغيّر شيءٌ من بياناتك."
        confirmLabel="أنهِ الجلسات" loading={busy} onConfirm={submitSignOut} />
    </div>
  );
}
