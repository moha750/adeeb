"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, ColorField, Field, Select } from "@adeeb/design-system";
import {
  At, BookOpen, Books, Buildings, Cake, CalendarBlank, Certificate, GenderFemale, GenderMale, GraduationCap, Hash, IdentificationCard,
  InstagramLogo, LinkedinLogo, Palette, Phone, ShareNetwork, TiktokLogo, User, UserList, XLogo,
} from "@phosphor-icons/react";
import { color } from "@adeeb/design-system/tokens";
import {
  DEGREES, DEGREE_VALUES, PHONE_HINT, PHONE_PREFIX, PHONE_RE, RECORD_NO_MAX, SOCIAL_KEYS, hasAcademicFields, socialHandle, socialLabelOf,
  type SocialKey,
} from "@/lib/membershipFields";
import { updateMyProfile, type MyProfileInput } from "@/app/dashboard/profile/actions";
import type { MyProfile } from "@/app/dashboard/profile/data";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { AdEditLine, AdLine, AdSection } from "../account";
import { AdNote } from "../primitives";

/**
 * **أقسامُ العضو في «حسابي»** على قالب «الحساب» (٢٠٢٦-١١-٠٥) — سلوكُ `dashboard/_portal/MemberSections.tsx` المعتمد حرفًا: **هويّتُك**
 * سطورُ عرضٍ تثبتها الموارد البشريّة، و**بياناتُك** (الجوّالُ والميلادُ والدراسةُ واللونُ) و**حساباتُك** سطورٌ تنفتح للتعديل في نافذة.
 * والحفظُ بـ`updateMyProfile` نفسِه، وهو يكتب الحقولَ كلَّها معًا: فكلُّ نافذةٍ تُرسل ما عدّلته فوق المحفوظ، ولا يُمسّ ما لم تُعدّله.
 * والحكَمُ في الخادم (`can_edit_member_data`). والفرقُ في الشكل: أقسامُ القالب وسطورُه، والتنبيهُ المعتمد مكانَ `Alert`.
 */

const SOCIAL: Record<SocialKey, typeof XLogo> = { twitter: XLogo, instagram: InstagramLogo, tiktok: TiktokLogo, linkedin: LinkedinLogo };
const degreeLabel = (v: string) => DEGREES.find((d) => d.value === v)?.label ?? "";
/** تاريخُ ميلادٍ فارغٌ أو في المستقبل مرفوض. خارجَ المكوّن لأنّ الساعةَ تُقرأ عند الحفظ لا عند الرسم. */
const badBirthDate = (v: string) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isNaN(t) || t > Date.now() ? "تاريخ ميلاد غير صالح." : null;
};

/** القيمُ المحفوظة بصيغة الفعل — أساسُ كلّ حفظ. */
const saved = (p: MyProfile): Required<MyProfileInput> => ({
  phone: p.phone, degree: p.degree, college: p.college, major: p.major, recordNo: p.recordNo,
  twitter: p.socials.twitter, instagram: p.socials.instagram, tiktok: p.socials.tiktok, linkedin: p.socials.linkedin,
  favoriteColor: p.favoriteColor ?? "",
  birthDate: p.birthDateRaw,
});

/** أقسامُ العضو في فهرس الغرفة (حساباتُه لا تظهر بلا سجلّ تفاصيل) */
export const MEMBER_INDEX = [
  { id: "acc-id", label: "هويّتك", icon: <IdentificationCard /> },
  { id: "acc-data", label: "بياناتك", icon: <UserList /> },
  { id: "acc-social", label: "حساباتك", icon: <ShareNetwork /> },
];

export function MyMemberSections({ profile }: { profile: MyProfile }) {
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
      <AdSection id="acc-id" icon={<IdentificationCard />} title="هويّتك في أدِيب" sub="تثبتها إدارة الموارد البشريّة، ولتصحيح شيءٍ منها راجِعها">
        <AdLine icon={<User />} k="الاسم المعروض" v={profile.name} />
        {profile.tripleName && profile.tripleName !== profile.name ? <AdLine icon={<User />} k="الاسم الثلاثيّ" v={profile.tripleName} /> : null}
        {profile.nationalId ? <AdLine icon={<IdentificationCard />} k="رقم الهويّة" v={profile.nationalId} ltr /> : null}
        <AdLine icon={female ? <GenderFemale /> : <GenderMale />} k="الجنس" v={profile.gender ? (female ? "أنثى" : "ذكر") : "لم يُحدَّد"} />
        {profile.joined ? <AdLine icon={<CalendarBlank />} k="عضوٌ منذ" v={profile.joined} /> : null}
      </AdSection>

      <AdSection id="acc-data" icon={<UserList />} title="بياناتك"
        media={profile.hasDetails ? undefined : (
          <AdNote tone="warn" title="لا سجلّ تفاصيل لحسابك.">الدراسةُ والحساباتُ واللونُ تُحفظ في سجلّك، فراجِع الموارد البشريّة لإنشائه.</AdNote>
        )}>
        <AdEditLine icon={<Phone />} k="رقم الجوّال" v={profile.phone} ltr empty="لم تُضِفه بعد" onOpen={open} busy={busy} error={err}
          onSave={save(() => (PHONE_RE.test(draft.phone.trim()) ? null : `${PHONE_HINT}.`))}
          field={<Field label="رقم الجوّال" type="tel" charset="digits" prefix={PHONE_PREFIX} icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx"
            value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} required />} />
        {profile.hasDetails ? (
          <>
            <AdEditLine icon={<Cake />} k="تاريخ الميلاد" v={profile.birthDate ?? ""} empty="لم تُضِفه بعد" onOpen={open} busy={busy} error={err}
              onSave={save(() => badBirthDate(draft.birthDate))}
              field={<Field label="تاريخ الميلاد" type="date" placeholder="" icon={<Cake />} innerIcon={<CalendarBlank />} required
                value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} />} />
            <AdEditLine icon={<GraduationCap />} k="دراستك" v={study} empty="لم تُحدَّد بعد" onOpen={open} busy={busy} error={err}
              onSave={save(() => {
                if (!DEGREE_VALUES.includes(draft.degree)) return "الدرجة العلميّة مطلوبة.";
                if (academic && (!draft.college.trim() || !draft.major.trim() || !draft.recordNo.trim())) return "الكلّية والتخصّص والرقم الأكاديميّ مطلوبةٌ لهذه الدرجة.";
                return null;
              })}
              field={<>
                <Select label="الدرجة العلميّة" icon={<Certificate />} options={DEGREES} value={draft.degree} required
                  onValueChange={(v) => setDraft({ ...draft, degree: v })} />
                {hasAcademicFields(profile.degree) && !academic ? (
                  // في نافذة التعديل: بتنبيهها القديم حتى نبلغ قالبَ النوافذ (محمد ٢٠٢٦-١١-٠٥)
                  <Alert tone="danger" title="ستُمحى بياناتك الأكاديميّة عند الحفظ.">كلّيتُك وتخصّصُك ورقمُك الأكاديميّ تُحذف نهائيًّا.</Alert>
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
            {/* **اللونُ قيمتُه نفسُه** (٢٠٢٦-١١-٠٥): كان السطرُ يقول «به تُلوَّن تهنئة ميلادك» ولا يُريك لونَك. فرمزُ السطر يصير قرصًا بلونك
                بحلقةٍ خافتة تُظهر الفاتحَ على أرضه؛ وبلا لونٍ يبقى رمزَ اللوح بنغمة الناقص */}
            <AdEditLine icon={profile.favoriteColor ? (
              <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" fill={profile.favoriteColor} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1.5} /></svg>
            ) : <Palette />} k="لونك المفضّل" v={profile.favoriteColor ? "به تُلوَّن تهنئة ميلادك" : ""} empty="لم تختره بعد" onOpen={open} busy={busy} error={err}
              onSave={save(() => null)}
              field={<ColorField label="اللون المفضّل" icon={<Palette />} value={draft.favoriteColor || color.steel[500]} optional
                onValueChange={(v) => setDraft({ ...draft, favoriteColor: v })} />} />
          </>
        ) : null}
      </AdSection>

      {profile.hasDetails ? (
        <AdSection id="acc-social" icon={<ShareNetwork />} title="حساباتك" sub="تُعرَض في ملفّك عند الإدارة">
          {SOCIAL_KEYS.map((k) => {
            const I = SOCIAL[k];
            return (
              <AdEditLine key={k} icon={<I />} k={socialLabelOf(k)} v={profile.socials[k] ? `@${profile.socials[k]}` : ""} ltr empty="لم تُضِفه" onOpen={open} busy={busy} error={err}
                onSave={save(() => {
                  // الخادمُ يطبّع الرابطَ معرّفًا (`lib/memberData`)، وههنا الفحصُ وحده
                  const res = socialHandle(k, draft[k]);
                  return res.ok ? null : res.reason;
                })}
                field={<Field label={socialLabelOf(k)} charset="latin" icon={<I />} innerIcon={<At />} placeholder="المعرّف أو رابط الحساب" optional
                  value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />} />
            );
          })}
        </AdSection>
      ) : null}
    </>
  );
}
