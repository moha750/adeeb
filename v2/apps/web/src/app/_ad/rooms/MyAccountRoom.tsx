"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Modal, overBy } from "@adeeb/design-system";
import {
  At, Bell, BellRinging, ChartLineUp, Copy, Desktop, DeviceMobile, DeviceTablet, Envelope, GenderFemale, GenderMale, Globe, Hash, IdentificationCard, Key,
  Link as LinkIcon, LinkBreak, ListBullets, Lock, MapPin, PaperPlaneTilt, Phone, Quotes, ShieldCheck, User, UserCircle,
} from "@phosphor-icons/react";
import { AppleLogo, CaretDown, CaretUp, DownloadSimple, GoogleLogo, Info, PencilSimple, SignOut, Trash, WarningCircle, X } from "@/app/_components/glyphs";
import { TurnstileWidget } from "@/app/_components/Turnstile";
import { DeleteAccount } from "@/app/_components/DeleteAccount";
import { AccountExit } from "@/app/_components/AccountExit";
import type { MyExit } from "@/lib/membershipExit";
import type { MyProfile } from "@/app/dashboard/profile/data";
import { PwaContent } from "@/app/_pwa/PwaContent";
import { usePwa } from "@/app/_pwa/usePwa";
import { createClient } from "@/lib/supabase/client";
import { copyText } from "@/lib/clipboard";
import { visitsLine } from "@/lib/profileVisits";
import { toArabicAuthError } from "@/lib/authErrors";
import { PHONE_PREFIX } from "@/lib/fieldFormats";
import { saveMyData } from "@/app/me/actions";
import type { MyAccount } from "@/app/me/data";
import {
  changeMyEmail, changeMyPassword, revokeMySession, setMyMarketing, signOutEverywhere, unlinkMyIdentity, updateMyBio,
} from "@/app/dashboard/settings/actions";
import type { LoginMethod, MySession, MySettings } from "@/app/dashboard/settings/data";
import { BIO_MAX, PROVIDER_LABEL } from "@/app/dashboard/settings/vocab";
import { AvatarEditor } from "@/app/dashboard/profile/AvatarEditor";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { counted } from "@/app/dashboard/_portal/time";
import { AccountRoom, AdCols, AdEditLine, AdIndex, AdLine, AdRoomBand, AdSection, AdToggleLine, useSectionIndex } from "../account";
import { AdBadge, AdCard, AdConfirm, AdNote } from "../primitives";
import { MEMBER_INDEX, MyMemberSections } from "./MyMemberSections";

/**
 * غرفةُ «حسابي» على قالب «الحساب» (٢٠٢٦-١١-٠٥) — **قدوةُ الغرف كلِّها** («جدًّا راضٍ ومعجب»، المالك ٢٠٢٦-١٠-١٣، ومن الشاشات الخمس
 * المرجعيّة للهويّة). السلوكُ سلوكُ `dashboard/_portal/AccountRoom.tsx` حرفًا: الأقسامُ الستّة، والتعديلُ في نافذة، والأفعالُ أفعالُ
 * «الإعدادات» نفسُها (بجلسة صاحبها، والقاعدةُ تحصر المدى)، والبياناتُ بـ`saveMyData` الذي يمنع العضوَ ويقبل غيرَه. وللعضو مكانَ «بياناتك»
 * هويّتُه وبياناتُه وحساباتُه (`MyMemberSections`)، وبابُ خروجه `AccountExit` لا الحذف.
 *
 * والفرقُ في الشكل وحده: لوحُ الغرفة رأسُها، والأقسامُ والسطورُ قطعُ القالب (`AdSection`، `AdLine`، `AdEditLine`، `AdToggleLine`)،
 * **وكرتُك كرتُ الشخص المعتمد** (`AdCard` بوجهه: التذكرةُ واقفة) ووجهُه محرّرُ صورتك بكاميرته، والتنبيهُ المعتمد مكانَ `Alert`،
 * ونافذةُ التأكيد المعتمدة (`AdConfirm`) مكانَ القديمة. والفهرسُ بجانب الأقسام في المكتب، وفي الجوّال الكرتُ فوقها ولا فهرس.
 */

const PASSWORD_MIN = 8;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const DEVICE: Record<MySession["kind"], typeof Desktop> = { phone: DeviceMobile, tablet: DeviceTablet, desktop: Desktop, unknown: Desktop };
const LINKABLE = [
  { key: "google", Icon: GoogleLogo },
  { key: "apple", Icon: AppleLogo },
] as const;

export function MyAccountRoom({ account, avatar, standing, settings, member }: {
  account: MyAccount;
  avatar: string | null;
  /** «صديق أدِيب منذ يوليو 2026» */
  standing: string;
  settings: MySettings;
  /** **العضو** (قرار المالك ٢٠٢٦-١٠-١٣): «الملف الشخصي» و«الإعدادات» هنا — هويّتُه وبياناتُه وحساباتُه، وبابُ خروجه. */
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
    if (overBy(bio, BIO_MAX)) return false;   // الحقلُ يقول «زاد ٥ أحرف»، والحفظُ يتوقّف حتى يُختصر
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
  const noPhone = !account.phone;
  // **المقعدُ المحميّ ليس منطقةَ خطر** (محمد ٢٠٢٦-١١-٠٥: «التفاصيل» أحمرُ الختم و«خروج» صندوقُ خطر، «وكلاهما أحمر؟»): رئيسُ أدِيب
  // لا بابَ له، فلا فعلَ هنا يُهدَم به شيء؛ والأحمرُ يُستحقّ بفعلٍ لا يُردّ، لا بموضع القسم. فيلبس قسمُه حبرَ الأقسام وزرُّه زرَّ الشرح
  const sealed = member?.exit.door === "sealed";
  const INDEX = [
    ...(member
      ? MEMBER_INDEX.filter((x) => x.id !== "acc-social" || member.profile.hasDetails)
      : [{ id: "acc-data", label: "بياناتك", icon: <IdentificationCard /> }]),
    ...(slugUrl ? [{ id: "acc-page", label: "صفحتك العلنيّة", icon: <Globe /> }] : []),
    { id: "acc-login", label: "الدخول والأمان", icon: <ShieldCheck /> },
    { id: "acc-devices", label: "أجهزتك", icon: <DeviceMobile /> },
    { id: "acc-notify", label: "الإشعارات", icon: <Bell /> },
    { id: "acc-exit", label: "حسابك", icon: sealed ? <UserCircle /> : <WarningCircle /> },
  ].map((x) => (noPhone && !member && x.id === "acc-data" ? { ...x, due: "ينقصه رقم الجوّال" } : x));
  const { at, pick } = useSectionIndex(member ? "acc-id" : "acc-data");

  const pushLine = (() => {
    if (pwa.stage === "loading") return <AdLine icon={<Bell />} k="إشعاراتُ الجوّال" v="نفحص جهازك…" />;
    if (pwa.stage === "ready" || pwa.stage === "on") {
      return <AdToggleLine icon={<Bell />} label="إشعاراتُ الجوّال" description="يصلك ما يخصّك إشعارًا على هذا الجهاز"
        checked={pwa.stage === "on"} disabled={pwa.busy !== null} onChange={(on) => (on ? pwa.enable() : pwa.disable())} />;
    }
    const say = {
      "ios-install": { v: "أضِف أدِيب إلى جوّالك أوّلًا", act: "الخطوات" },
      "ios-update": { v: "نظامُ جوّالك أقدمُ من الإشعارات", act: "التفاصيل" },
      unsupported: { v: "متصفّحُك لا يحمل الإشعارات", act: "التفاصيل" },
      denied: { v: "محجوبةٌ على هذا الجهاز", act: "كيف أفتحها؟" },
    }[pwa.stage];
    return <AdLine icon={<Bell />} k="إشعاراتُ الجوّال" v={say.v} tone={pwa.stage === "denied" ? "warn" : undefined}
      act={{ icon: <BellRinging />, text: say.act, label: say.act }} onClick={() => setPwaHelp(true)} />;
  })();

  // «تعديل» باسمه على كلّ سطرٍ يُعدَّل (محمد ٢٠٢٦-١١-٠٥)
  const EDIT = (label: string) => ({ icon: <PencilSimple />, text: "تعديل", label });

  /* ── كرتُك: كرتُ الشخص المعتمد، ووجهُه محرّرُ صورتك ── */
  const meCard = (
    <AdCard
      seed={account.fullName || "me"}
      face={{ name: account.fullName, node: <AvatarEditor look="cam" name={account.fullName} gender={account.gender} avatar={avatar} /> }}
      title={account.fullName || "صاحب الحساب"}
      chips={<AdBadge tone="neutral">{standing}</AdBadge>}
      band={<AdRoomBand navPath="/dashboard/account" title="حسابي" />}
    />
  );

  return (
    <AccountRoom navPath="/dashboard/account" title="حسابي">
      <AdCols top sticky aside={<>
        {meCard}
        {noPhone && !member ? <AdNote tone="warn" label="رقم جوّالك" title="لم يُضف بعد.">لا حجزَ بدونه.</AdNote> : null}
        <AdIndex items={INDEX} at={at} label="أقسام حسابك" onPick={pick} />
      </>}>
        {member ? <MyMemberSections profile={member.profile} /> : (
          <AdSection id="acc-data" icon={<IdentificationCard />} title="بياناتك">
            <AdEditLine icon={<User />} k="الاسم الكامل" v={account.fullName} empty="لم تكتبه بعد" onOpen={openData} onSave={saveData("fullName")} error={dataErr}
              field={<Field label="الاسم الكامل" icon={<User />} innerIcon={<PencilSimple />} placeholder="اسمك كما يُكتب في شهاداتك"
                value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} required />} />
            <AdEditLine icon={<Phone />} k="رقم الجوّال" v={account.phone} ltr empty="لم تُضِفه بعد" onOpen={openData} onSave={saveData("phone")} error={dataErr}
              field={<Field label="رقم الجوّال" type="tel" charset="digits" prefix={PHONE_PREFIX} icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx"
                value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} required />} />
            <AdLine icon={female ? <GenderFemale /> : <GenderMale />} k="الجنس" v={account.gender ? (female ? "أنثى" : "ذكر") : "لم يُحدَّد"} />
            <AdEditLine icon={<MapPin />} k="المدينة" v={account.city} empty="لم تكتبها بعد" onOpen={openData} onSave={saveData("city")} error={dataErr}
              field={<Field label="المدينة" icon={<MapPin />} innerIcon={<PencilSimple />} placeholder="مدينتك" optional
                value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />} />
          </AdSection>
        )}

        {slugUrl ? (
          <AdSection id="acc-page" icon={<Globe />} title="صفحتك العلنيّة">
            <AdLine icon={<Globe />} k="الرابط" v={`adeeb.club/m/${settings.publicSlug}`} ltr act={{ icon: <Copy />, text: "نسخ", label: "نسخ الرابط" }}
              onClick={() => copy(slugUrl, "نُسخ رابطُ صفحتك.")} />
            {/* **زوّارُها** (محمد ٢٠٢٦-١١-١٧): عددٌ بلا أسماء، بجانب رابطها — يقول لصاحبها إنّ نشرَها أثمر */}
            {settings.pageVisits ? <AdLine icon={<ChartLineUp />} k="زوّارُها" {...visitsLine(settings.pageVisits)} /> : null}
            <AdEditLine icon={<Quotes />} k="النبذة" v={settings.bio} empty="لا نبذةَ بعد" onOpen={() => { setBio(settings.bio); setBioErr(null); }} onSave={saveBio} error={bioErr}
              field={<Field label="النبذة" icon={<Quotes />} innerIcon={<PencilSimple />} placeholder="سطرٌ يعرّفك" optional count={{ max: BIO_MAX }}
                value={bio} onChange={(e) => setBio(e.target.value)} />} />
          </AdSection>
        ) : null}

        <AdSection id="acc-login" icon={<ShieldCheck />} title="الدخول والأمان">
          <AdLine icon={<Envelope />} k="بريد الدخول" v={settings.email} ltr act={EDIT("تعديل بريد الدخول")} onClick={() => setMailOpen(true)}
            sub={settings.pendingEmail ? `ينتظر تأكيدَ ${settings.pendingEmail}` : undefined} tone={settings.pendingEmail ? "warn" : undefined} toneAt="sub" />
          {hasPassword ? <AdLine icon={<Key />} k="كلمة المرور" v="مُعيَّنة" sub="يلزمك إدخالُ الحاليّة قبل الجديدة" act={EDIT("تعديل كلمة المرور")} onClick={() => setPassOpen(true)} /> : null}
          {LINKABLE.map(({ key, Icon }) => {
            const m = linked.get(key);
            return m
              ? <AdLine key={key} icon={<Icon />} k={`الدخول بـ${PROVIDER_LABEL[key]}`} v="مربوط" sub={m.account ?? undefined}
                  act={{ icon: <LinkBreak />, text: "فكّ الربط", label: "فكّ الربط", danger: true }} disabled={!canUnlink || busy} onClick={() => setUnlinking(m)} />
              : <AdLine key={key} icon={<Icon />} k={`الدخول بـ${PROVIDER_LABEL[key]}`} v="غير مربوط"
                  act={{ icon: <LinkIcon />, text: "ربط", label: "ربط" }} disabled={busy} onClick={() => link(key)} />;
          })}
        </AdSection>

        <AdSection id="acc-devices" icon={<DeviceMobile />} title="أجهزتك"
          media={settings.sessionsError ? <AdNote tone="bad" title="تعذّر قراءة جلساتك.">{settings.sessionsError}</AdNote> : undefined}>
          {sessions.map((s) => {
            const D = DEVICE[s.kind];
            return s.current
              ? <AdLine key={s.id} icon={<D />} k="هذا الجهاز" v={s.device} sub="جلستُك الآن" tone="ok" toneAt="sub" />
              : <AdLine key={s.id} icon={<D />} k={`آخر نشاط ${s.lastSeen}`} v={s.device} sub={`بدأت في ${s.started}`}
                  act={{ icon: <X />, text: "إنهاء", label: "إنهاء الجلسة", danger: true }} onClick={() => setKilling(s)} />;
          })}
          {settings.sessions.length > SESSIONS_SHOWN ? (
            allSessions
              ? <AdLine icon={<ListBullets />} v="اطوِ القائمة" sub={`ويبقى آخرُ ${SESSIONS_SHOWN} جلسات`}
                  act={{ icon: <CaretUp />, text: "أقلّ", label: "طيّ الجلسات" }} onClick={() => setAllSessions(false)} />
              : <AdLine icon={<ListBullets />} v="كلُّ جلساتك" sub={counted(settings.sessions.length, "جلسةٌ واحدة", "جلستان", "جلسات مفتوحة", "جلسةً مفتوحة")}
                  act={{ icon: <CaretDown />, text: "عرض", label: "عرض كلّ الجلسات" }} onClick={() => setAllSessions(true)} />
          ) : null}
          <AdLine icon={<SignOut />} k="كلّ الأجهزة" v="الخروج منها جميعًا" sub="ومنها هذا، فتعود إلى الدخول"
            act={{ icon: <SignOut />, text: "خروج", label: "الخروج من كلّ الأجهزة", danger: true }} onClick={() => setOutOpen(true)} />
        </AdSection>

        <AdSection id="acc-notify" icon={<Bell />} title="الإشعارات"
          media={pwa.note ? <AdNote tone={pwa.note.ok ? "ok" : "bad"}>{pwa.note.text}</AdNote> : undefined}>
          <AdToggleLine icon={<Envelope />} label="أخبارُ أدِيب ودعواتُه" description="على بريدك" checked={marketing} disabled={busy} onChange={toggleMarketing} />
          {pushLine}
          {pwa.stage === "on"
            ? <AdLine icon={<PaperPlaneTilt />} k="تجربة" v="إشعارٌ تجريبيٌّ إلى هذا الجهاز" act={{ icon: <PaperPlaneTilt />, text: "أرسل", label: "أرسل إشعارًا تجريبيًّا" }}
                disabled={pwa.busy !== null} onClick={pwa.test} />
            : null}
          {pwa.canInstall
            ? <AdLine icon={<DownloadSimple />} k="تطبيقُ أدِيب" v="غير مثبَّت على هذا الجهاز" act={{ icon: <DownloadSimple />, text: "تثبيت", label: "تثبيت" }}
                disabled={pwa.busy !== null} onClick={pwa.install} />
            : null}
        </AdSection>

        <AdSection id="acc-exit" icon={sealed ? <UserCircle /> : <WarningCircle />} title="حسابك" tone={sealed ? undefined : "bad"}>
          {member ? (
            // العضوُ يُنهي عضويّتَه قبل حسابه (قرار المالك ٢٠٢٦-٠٨-٢٠)، والبابُ بحسب مقعده من القاعدة
            <AdLine icon={sealed ? <Lock /> : <WarningCircle />} v="الخروج من أدِيب"
              sub={member.exit.pending ? "طلبُ خروجك ينتظر القرار" : sealed ? "مقعدُك محميّ، ولا بابَ له من هنا" : "عضويّتُك أوّلًا، ثمّ حسابُك إن شئت"}
              tone={member.exit.pending ? "warn" : undefined} toneAt="sub"
              act={{ icon: sealed ? <Info /> : <X />, text: sealed ? "التفاصيل" : "خروج", label: "الخروج من أدِيب" }}
              danger={!sealed} onClick={() => setExitOpen(true)} />
          ) : (
            <DeleteAccount pending={false} dueLabel={null} hasPassword={hasPassword}
              trigger={(open) => <AdLine icon={<Trash />} v="حذف حسابك" sub="لك ثلاثون يومًا تتراجع فيها متى شئت"
                act={{ icon: <Trash />, text: "حذف", label: "حذف حسابي", danger: true }} onClick={open} />} />
          )}
        </AdSection>
      </AdCols>

      <Modal open={mailOpen} onClose={closeMail} busy={busy} size="sm" title="تغيير بريد الدخول"
        description="لا يسري التغيير قبل فتح رابط التأكيد."
        footer={<>
          <Button variant="primary" loading={busy} onClick={submitEmail}>إرسال رابط التأكيد</Button>
          <Button variant="ghost" onClick={closeMail} disabled={busy}>إلغاء</Button>
        </>}>
        {/* النافذةُ بتنبيهها القديم حتى نبلغ قالبَ النوافذ: تنبيهُ الهويّة ورقةٌ تُوضع على الصفحة، وفي النافذة ورقةٌ فوق ورقة (محمد ٢٠٢٦-١١-٠٥: «غريب») */}
        {mailErr ? <Alert tone="danger">{mailErr}</Alert> : null}
        <Field label="البريد الجديد" type="email" charset="latin" icon={<Envelope />} innerIcon={<At />} placeholder="you@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)} helper="يصله رابطُ التأكيد." required />
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
        <Modal open={exitOpen} onClose={() => setExitOpen(false)} size="sm" className={sealed ? undefined : "mdl-tone-danger"} title="الخروج من أدِيب"
          footer={<Button variant="ghost" onClick={() => setExitOpen(false)}>إغلاق</Button>}>
          <AccountExit door={member.exit.door} deciders={member.exit.deciders} fullName={account.fullName} pending={member.exit.pending}
            lastAnswer={member.exit.lastAnswer} deletion={{ pending: false, dueLabel: null, hasPassword }} />
        </Modal>
      ) : null}

      <Modal open={pwaHelp} onClose={() => setPwaHelp(false)} size="sm" title="إشعاراتُ الجوّال"
        footer={<Button variant="ghost" onClick={() => setPwaHelp(false)}>حسنًا</Button>}>
        <PwaContent pwa={pwa} />
      </Modal>

      <AdConfirm open={unlinking !== null} onClose={() => setUnlinking(null)} tone="danger" icon={<LinkBreak />} title="فكّ الربط؟"
        text={unlinking ? `لن تدخل بـ${PROVIDER_LABEL[unlinking.provider]} بعدها، ويبقى دخولُك ببريدك وكلمة مرورك. ولك ربطُه ثانيةً متى شئت.` : undefined}
        confirmLabel="فُكّ الربط" loading={busy} onConfirm={submitUnlink} />
      <AdConfirm open={killing !== null} onClose={() => setKilling(null)} tone="danger" icon={<SignOut />} title="إنهاء هذه الجلسة؟"
        text={killing ? `يخرج حسابُك من «${killing.device}» وحدَه، وتبقى جلستُك هنا كما هي.` : undefined}
        confirmLabel="أنهِ الجلسة" loading={busy} onConfirm={submitRevoke} />
      <AdConfirm open={outOpen} onClose={() => setOutOpen(false)} tone="danger" icon={<SignOut />} title="الخروج من كلّ الأجهزة؟"
        text="تُنهى جلساتُك كلُّها، ومنها هذه، فتعود إلى صفحة الدخول. ولن يتغيّر شيءٌ من بياناتك."
        confirmLabel="أنهِ الجلسات" loading={busy} onConfirm={submitSignOut} />
    </AccountRoom>
  );
}
