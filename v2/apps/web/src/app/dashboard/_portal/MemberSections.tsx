"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Card, CardHeader, ColorField, Field, Select } from "@adeeb/design-system";
import {
  At, BookOpen, Books, Buildings, CalendarBlank, Certificate, GenderFemale, GenderMale, GraduationCap, Hash, IdentificationCard,
  InstagramLogo, LinkedinLogo, Palette, Phone, ShareNetwork, TiktokLogo, User, UserList, XLogo,
} from "@phosphor-icons/react";
import { color } from "@adeeb/design-system/tokens";
import {
  DEGREES, DEGREE_VALUES, PHONE_HINT, PHONE_PREFIX, PHONE_RE, RECORD_NO_MAX, SOCIAL_KEYS, hasAcademicFields, socialHandle, socialLabelOf,
  type SocialKey,
} from "@/lib/membershipFields";
import { updateMyProfile, type MyProfileInput } from "../profile/actions";
import type { MyProfile } from "../profile/data";
import { useToast } from "../_components/ToastProvider";
import { EditRow, Row, type Ico } from "./Row";

/**
 * **أقسامُ العضو في «حسابي»** — ما كان «الملف الشخصي» (قرار المالك ٢٠٢٦-١٠-١٣: «تُدمج الإعدادات
 * والملف الشخصي في حسابي»). بلغة الغرف: **هويّتُك** سطورُ عرضٍ تثبتها الموارد البشريّة، و**بياناتُك**
 * (الجوّالُ والدراسةُ واللونُ) و**حساباتُك** سطورٌ تنفتح للتعديل في نافذة.
 *
 * والحفظُ بـ`updateMyProfile` نفسِه، وهو يكتب الحقولَ كلَّها معًا: فكلُّ نافذةٍ تُرسل ما عدّلته
 * فوق القيم المحفوظة، ولا يُمسّ ما لم تُعدّله. والحكَمُ في الخادم (`can_edit_member_data`).
 */

const SOCIAL: Record<SocialKey, Ico> = { twitter: XLogo, instagram: InstagramLogo, tiktok: TiktokLogo, linkedin: LinkedinLogo };
const degreeLabel = (v: string) => DEGREES.find((d) => d.value === v)?.label ?? "";

/** القيمُ المحفوظة بصيغة الفعل — أساسُ كلّ حفظ. */
const saved = (p: MyProfile): Required<MyProfileInput> => ({
  phone: p.phone, degree: p.degree, college: p.college, major: p.major, recordNo: p.recordNo,
  twitter: p.socials.twitter, instagram: p.socials.instagram, tiktok: p.socials.tiktok, linkedin: p.socials.linkedin,
  favoriteColor: p.favoriteColor ?? "",
});

export const MEMBER_SECTIONS = [
  { id: "acc-id", label: "هويّتك", Icon: IdentificationCard as Ico },
  { id: "acc-data", label: "بياناتك", Icon: UserList as Ico },
  { id: "acc-social", label: "حساباتك", Icon: ShareNetwork as Ico },
];

export function MemberSections({ profile }: { profile: MyProfile }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState(saved(profile));
  const open = () => { setDraft(saved(profile)); setErr(null); };

  /** يحفظ ما في المسودّة بعد فحصٍ يسبق الخادم (القواعدُ نفسُها في `lib/membershipFields`). */
  const save = (check: () => string | null) => async () => {
    const why = check();
    if (why) { setErr(why); return false; }
    setErr(null);
    setBusy(true);
    const r = await updateMyProfile(draft);
    setBusy(false);
    if (!r.ok) { setErr(r.message); return false; }
    toast.success(r.message);
    router.refresh();
    return true;
  };

  const female = profile.gender === "female";
  const academic = hasAcademicFields(draft.degree);
  const study = [degreeLabel(profile.degree), hasAcademicFields(profile.degree) ? [profile.major, profile.college].filter(Boolean).join("، ") : null]
    .filter(Boolean).join("، ");

  return (
    <>
      <section id="acc-id" className="acc-sec">
        <Card className="acc-group">
          <CardHeader variant="soft" icon={<IdentificationCard aria-hidden />} title="هويّتك في أدِيب" subtitle="تثبتها إدارة الموارد البشريّة، ولتصحيح شيءٍ منها راجِعها" />
          <Row Icon={User} k="الاسم المعروض" v={profile.name} />
          {profile.tripleName && profile.tripleName !== profile.name ? <Row Icon={User} k="الاسم الثلاثيّ" v={profile.tripleName} /> : null}
          {profile.nationalId ? <Row Icon={IdentificationCard} k="رقم الهويّة" v={profile.nationalId} ltr /> : null}
          <Row Icon={female ? GenderFemale : GenderMale} k="الجنس" v={profile.gender ? (female ? "أنثى" : "ذكر") : "لم يُحدَّد"} />
          {profile.birthDate ? <Row Icon={CalendarBlank} k="تاريخ الميلاد" v={profile.birthDate} /> : null}
          {profile.joined ? <Row Icon={CalendarBlank} k="عضوٌ منذ" v={profile.joined} /> : null}
        </Card>
      </section>

      <section id="acc-data" className="acc-sec">
        <Card className="acc-group">
          <CardHeader variant="soft" icon={<UserList aria-hidden />} title="بياناتك" />
          {profile.hasDetails ? null : (
            <Alert tone="warning" title="لا سجلّ تفاصيل لحسابك">الدراسةُ والحساباتُ واللونُ تُحفظ في سجلّك، فراجِع الموارد البشريّة لإنشائه.</Alert>
          )}
          <EditRow Icon={Phone} k="رقم الجوّال" v={profile.phone} ltr empty="لم تُضِفه بعد" onOpen={open} busy={busy} error={err}
            onSave={save(() => (PHONE_RE.test(draft.phone.trim()) ? null : `${PHONE_HINT}.`))}
            field={<Field label="رقم الجوّال" type="tel" charset="digits" prefix={PHONE_PREFIX} icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx"
              value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} required />} />
          {profile.hasDetails ? (
            <>
              <EditRow Icon={GraduationCap} k="دراستك" v={study} empty="لم تُحدَّد بعد" onOpen={open} busy={busy} error={err}
                onSave={save(() => {
                  if (!DEGREE_VALUES.includes(draft.degree)) return "الدرجة العلميّة مطلوبة.";
                  if (academic && (!draft.college.trim() || !draft.major.trim() || !draft.recordNo.trim())) return "الكلّية والتخصّص والرقم الأكاديميّ مطلوبةٌ لهذه الدرجة.";
                  return null;
                })}
                field={<>
                  <Select label="الدرجة العلميّة" icon={<Certificate />} options={DEGREES} value={draft.degree} required
                    onValueChange={(v) => setDraft({ ...draft, degree: v })} />
                  {hasAcademicFields(profile.degree) && !academic ? (
                    <Alert tone="danger" title="ستُمحى بياناتك الأكاديميّة عند الحفظ">كلّيتُك وتخصّصُك ورقمُك الأكاديميّ تُحذف نهائيًّا.</Alert>
                  ) : null}
                  {academic ? (
                    <>
                      <Field label="الكلّية" icon={<GraduationCap />} innerIcon={<Buildings />} placeholder="مثال: كلّية الآداب" required
                        value={draft.college} onChange={(e) => setDraft({ ...draft, college: e.target.value })} />
                      <Field label="التخصّص" icon={<BookOpen />} innerIcon={<Books />} placeholder="مثال: اللغة العربيّة" required
                        value={draft.major} onChange={(e) => setDraft({ ...draft, major: e.target.value })} />
                      <Field label="الرقم الأكاديميّ" charset="digits" maxLength={RECORD_NO_MAX} icon={<IdentificationCard />} innerIcon={<Hash />} placeholder="مثال: 443001234" required
                        value={draft.recordNo} onChange={(e) => setDraft({ ...draft, recordNo: e.target.value })} />
                    </>
                  ) : null}
                </>} />
              <EditRow Icon={Palette} k="لونك المفضّل" v={profile.favoriteColor ? "به تُلوَّن تهنئة ميلادك" : ""} empty="لم تختره بعد" onOpen={open} busy={busy} error={err}
                onSave={save(() => null)}
                field={<ColorField label="اللون المفضّل" icon={<Palette />} value={draft.favoriteColor || color.steel[500]} optional
                  onValueChange={(v) => setDraft({ ...draft, favoriteColor: v })} />} />
            </>
          ) : null}
        </Card>
      </section>

      {profile.hasDetails ? (
        <section id="acc-social" className="acc-sec">
          <Card className="acc-group">
            <CardHeader variant="soft" icon={<ShareNetwork aria-hidden />} title="حساباتك" subtitle="تُعرَض في ملفّك عند الإدارة" />
            {SOCIAL_KEYS.map((k) => (
              <EditRow key={k} Icon={SOCIAL[k]} k={socialLabelOf(k)} v={profile.socials[k] ? `@${profile.socials[k]}` : ""} ltr empty="لم تُضِفه" onOpen={open} busy={busy} error={err}
                onSave={save(() => {
                  // الخادمُ يطبّع الرابطَ معرّفًا (`lib/memberData`)، وههنا الفحصُ وحده
                  const res = socialHandle(k, draft[k]);
                  return res.ok ? null : res.reason;
                })}
                field={<Field label={socialLabelOf(k)} charset="latin" icon={<SocialIcon k={k} />} innerIcon={<At />} placeholder="المعرّف أو رابط الحساب" optional
                  value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />} />
            ))}
          </Card>
        </section>
      ) : null}
    </>
  );
}

function SocialIcon({ k }: { k: SocialKey }) {
  const I = SOCIAL[k];
  return <I />;
}

