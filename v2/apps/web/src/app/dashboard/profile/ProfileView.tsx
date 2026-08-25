"use client";

// عميليّ — نموذجٌ وتفاعل (وأيقونات Phosphor تُنشئ `createContext`، وذلك ممنوعٌ في مكوّنٍ خادميّ).

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Button, Card, CardBody, CardHeader, ColorField, Field, SaveBar, Select } from "@adeeb/design-system";
import {
  AddressBook, At, BookOpen, Books, Buildings, CalendarBlank, Certificate, Envelope, FloppyDiskBack, GenderIntersex, GraduationCap, Hash, IdentificationCard, Palette, Phone, ShareNetwork, User, UserCircle } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { Cell } from "../_components/Cell";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { Section } from "../_components/Section";
import { SOCIAL_ICON } from "../_components/socialIcons";
import { useToast } from "../_components/ToastProvider";
import { useUnsavedGuard } from "../_components/useUnsavedGuard";
import { color } from "@adeeb/design-system/tokens";
import {
  DEGREES, DEGREE_VALUES, PHONE_HINT, PHONE_LEN, PHONE_PREFIX, PHONE_RE, SOCIAL_KEYS, hasAcademicFields, socialHandle,
  socialLabelOf, RECORD_NO_MAX, genderLabel,
} from "@/lib/membershipFields";
import { AvatarEditor } from "./AvatarEditor";
import { updateMyProfile } from "./actions";
import type { MyProfile } from "./data";

// الحقول الثلاثة التي تلزم صاحب الدرجة الجامعيّة وحده — ويُمنع منها صاحب «ثانوية عامة» و«موظف».
const ACADEMIC_REQUIRED = [
  { key: "college", message: "الكلّية مطلوبة لهذه الدرجة" },
  { key: "major", message: "التخصّص مطلوب لهذه الدرجة" },
  { key: "recordNo", message: "الرقم الأكاديميّ مطلوب لهذه الدرجة" },
] as const;

/**
 * مخطّط التحقّق — قواعد `lib/membershipFields` نفسُها التي يقرؤها الفعل الخادميّ وقيدُ القاعدة.
 * النطاق مقصود: الاسم والبريد ورقم الهويّة وتاريخ الميلاد والجنس **ليست فيه** — هويّةٌ تملكها
 * الإدارة، تُعرَض في الشاشة ولا تُرسَل.
 */
const schema = z.object({
  // إجباريّ — يُعطيه العضو عند الالتحاق، فلا يُفرَّغ بعده (والكاتب الخادميّ يردّ الفارغ كذلك)
  phone: z.string().trim().min(1, "رقم الجوّال مطلوب").regex(PHONE_RE, PHONE_HINT),
  degree: z.string().optional(), // الرمز الخام لا التسمية — القاعدة تحفظ الرمز
  college: z.string().trim().optional(),
  major: z.string().trim().optional(),
  recordNo: z.string().trim().optional(),
  twitter: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
  tiktok: z.string().trim().optional(),
  linkedin: z.string().trim().optional(),
  favoriteColor: z.string().optional(),
  /** هل لصاحب الحساب سجلّ `member_details`؟ (يُشتقّ لا يُدخَل) — تضبط إلزاميّة الدرجة. */
  hasDetails: z.boolean(),
}).superRefine((v, ctx) => {
  // العمود NOT NULL ومحصورٌ بستّة — فتُلزَم الدرجة من يملك سجلًّا يحملها فقط.
  if (v.hasDetails && !DEGREE_VALUES.includes(v.degree ?? "")) {
    ctx.addIssue({ code: "custom", path: ["degree"], message: "الدرجة العلمية مطلوبة" });
  }
  if (v.hasDetails && hasAcademicFields(v.degree)) {
    for (const f of ACADEMIC_REQUIRED) {
      if (!v[f.key]?.trim()) ctx.addIssue({ code: "custom", path: [f.key], message: f.message });
    }
  }
  for (const k of SOCIAL_KEYS) {
    const res = socialHandle(k, v[k]);
    if (!res.ok) ctx.addIssue({ code: "custom", path: [k], message: res.reason });
  }
});
type ProfileForm = z.infer<typeof schema>;

/**
 * لا لونَ محفوظ ⇒ القيمة **فارغة** لا لونٌ مفترَض — فلا يُكتب في القاعدة لونٌ لم يخترْه أحد.
 * والمنتقي يبدأ من فولاذيّ الهوية ريثما يُختار (رمزٌ لا `#hex` محفور، ق١).
 */
const NO_COLOR = "";
const COLOR_START = color.steel[500];

/**
 * **الملفّ الشخصيّ** — غرفةُ العضو في بياناته: يقرأ ما لا يملك تغييره، ويحرّر ما يملكه.
 *
 * والقسمة ليست ذوقًا: ما تكتبه الإدارةُ عنك (اسمُك وبريدُك ورقمُ هويّتك وميلادُك وجنسُك
 * وانضمامُك) يُعرَض هنا **خلايا عرضٍ** كملفّك عندها (ق٨) — تُنسَخ ولا تُكتَب؛ وما هو منك
 * (جوّالُك ودراستُك وحساباتُك ولونُك وصورتُك) حقولٌ تُحرَّر. والقاعدةُ هي التي أذنت بهذا
 * أصلًا: بندُ «لكلٍّ بياناتُ نفسه» في `can_edit_member_data`.
 */
export function ProfileView({ profile }: { profile: MyProfile }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: profile.phone,
      degree: profile.degree,
      college: profile.college,
      major: profile.major,
      recordNo: profile.recordNo,
      twitter: profile.socials.twitter,
      instagram: profile.socials.instagram,
      tiktok: profile.socials.tiktok,
      linkedin: profile.socials.linkedin,
      favoriteColor: profile.favoriteColor ?? NO_COLOR,
      hasDetails: profile.hasDetails,
    },
    mode: "onBlur",
  });
  const { register, control, watch, handleSubmit, formState: { errors, isDirty } } = form;

  const onSubmit = handleSubmit((all) => {
    const { hasDetails: _hasDetails, ...values } = all;
    startSave(async () => {
      const r = await updateMyProfile(values);
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      // القيم المحفوظة تصير هي الأصل — وإلّا بقي النموذج «متغيّرًا» بعد الحفظ فلا يغيب الشريط
      form.reset(all);
      router.refresh();
    });
  });

  const academic = hasAcademicFields(watch("degree"));

  // الشريط يقول «عندك تغييرٌ»، وهذا يمنع ضياعه: من نقر بندًا في الشريط الجانبيّ وفي شاشته
  // تعديلٌ لم يُحفَظ يُسأل قبل أن يمضي. (وحدود الحارس موثّقة عنده — زرّ الرجوع خارجه.)
  const guard = useUnsavedGuard(isDirty);

  return (
    <div className="mpage">
      {/* صفحتُه العلنيّة: البابُ يُعرَض له أوّلًا، فمن لا يرى صفحتَه لا ينشرها ولا يُتمّها. */}
      {profile.publicSlug ? (
        <Alert tone="info" title="لك صفحةٌ علنيّة">
          صورتُك وسيرتُك وأوسمتُك تظهر فيها.{" "}
          <a className="font-bold underline" href={`/m/${encodeURIComponent(profile.publicSlug)}`} target="_blank" rel="noreferrer">
            افتحها وانشرها
          </a>
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          variant="soft"
          icon={<UserCircle />}
          title="صورتك"
          subtitle="وجهُك في اللوحة، تظهر في كشوف الأعضاء وفي كلّ شاشةٍ تذكرك"
        />
        <CardBody>
          <AvatarEditor name={profile.name} gender={profile.gender} avatar={profile.avatar} />
        </CardBody>
      </Card>

      {/* ما تكتبه الإدارة — يُعرَض ولا يُحرَّر. والسببُ مقولٌ في الشاشة لا مسكوتٌ عنه:
          العضو يرى الحقل ويعرف بابَه، فلا يظنّ الشاشةَ ناقصة. */}
      <Card>
        <CardHeader
          variant="soft"
          icon={<IdentificationCard />}
          title="هويّتك في أديب"
          subtitle="بياناتٌ تُثبتها إدارة الموارد البشريّة، لتصحيح شيءٍ منها راجِعها"
        />
        <CardBody>
          <div className="pva-sections">
            <Section icon={<User />} title="الاسم والهويّة">
              <Cell full noCopy label="الاسم المعروض" icon={<User />} value={profile.name} />
              {profile.tripleName ? <Cell full noCopy label="الاسم الثلاثيّ" icon={<PencilSimple />} value={profile.tripleName} /> : null}
              <Cell lat label="رقم الهويّة" icon={<IdentificationCard />} value={profile.nationalId} />
              <Cell noCopy label="الجنس" icon={<GenderIntersex />} value={genderLabel(profile.gender)} />
              {/* لا «تاريخ انضمام» هنا: تلك حقيقةُ **عضويّة** لا هويّة، وبطاقةُ «عضويتي» تقولها
                  ومعها مدّةُ العضوية — فذِكرُها هنا تكرارٌ لِما يملكه تبويبٌ آخر (٢٠٢٦-٠٨-٠٤). */}
              <Cell noCopy label="تاريخ الميلاد" icon={<CalendarBlank />} value={profile.birthDate} />
            </Section>
            <Section icon={<Envelope />} title="بريد الدخول">
              {/* البريد هويّة مصادقة تُزامَن مع auth.users — يُغيَّر من «بيانات الدخول» لا من هنا */}
              <Cell full lat label="البريد الإلكترونيّ" icon={<Envelope />} value={profile.email} />
            </Section>
          </div>
        </CardBody>
      </Card>

      <form onSubmit={onSubmit} noValidate>
        <div className="mpage">
          {!profile.hasDetails ? (
            <Alert tone="warning" title="لا سجلّ تفاصيل لحسابك">
              دراستُك وحساباتُك ولونُك لن تُحفظ: سجلّها يُنشأ عند إكمال بيانات الالتحاق. راجِع إدارة
              الموارد البشريّة، أمّا رقم الجوّال فيُحفظ.
            </Alert>
          ) : null}

          <Card>
            <CardHeader
              variant="soft"
              icon={<AddressBook />}
              title="تواصلك"
              subtitle="رقمُك الذي تصلك عليه إدارتُك"
            />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  className="sm:col-span-2"
                  label="رقم الجوّال"
                  type="tel"
                  charset="digits"
                  maxLength={PHONE_LEN}
                  prefix={PHONE_PREFIX}
                  icon={<Phone />}
                  innerIcon={<Hash />}
                  placeholder="05xxxxxxxx"
                  error={errors.phone?.message}
                  required
                  {...register("phone")}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              variant="soft"
              icon={<Books />}
              title="دراستك"
              subtitle="درجتُك العلميّة وما يتبعها"
            />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="degree"
                  render={({ field }) => (
                    <Select
                      className="sm:col-span-2"
                      label="الدرجة العلميّة"
                      icon={<Certificate />}
                      options={DEGREES}
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      error={errors.degree?.message}
                      disabled={!profile.hasDetails}
                      required
                    />
                  )}
                />
                {/* إنقاصُ الدرجة عن جامعيّة محوٌ لا رجعة فيه — يُقال قبل الحفظ لا بعده */}
                {hasAcademicFields(profile.degree) && !academic ? (
                  <Alert className="sm:col-span-2" tone="danger" title="ستُمحى بياناتك الأكاديميّة عند الحفظ">
                    كلّيتك وتخصّصك ورقمك الأكاديميّ تُحذف نهائيًّا، لا نسخة منها ولا استرجاع. وإن أعدت
                    درجتك جامعيّةً لاحقًا فأدخِلها من جديد.
                  </Alert>
                ) : null}
                {academic ? (
                  <>
                    <Field label="الكلّية" icon={<GraduationCap />} innerIcon={<Buildings />} placeholder="مثال: كلّية الآداب" error={errors.college?.message} required {...register("college")} />
                    <Field label="التخصّص" icon={<BookOpen />} innerIcon={<Books />} placeholder="مثال: اللغة العربيّة" error={errors.major?.message} required {...register("major")} />
                    <Field className="sm:col-span-2" label="الرقم الأكاديميّ" charset="digits" maxLength={RECORD_NO_MAX} icon={<IdentificationCard />} innerIcon={<Hash />} placeholder="مثال: 443001234" error={errors.recordNo?.message} required {...register("recordNo")} />
                  </>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              variant="soft"
              icon={<ShareNetwork />}
              title="حساباتك"
              subtitle="تُعرَض في ملفّك عند الإدارة، اكتب المعرّف أو الصق رابط الحساب"
            />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* الأربعة على نسقٍ واحد فتُبنى من `SOCIAL_KEYS` — لا أربع نسخٍ تفترق يومًا.
                    و`onBlur` يُطبّع ما لُصق فورًا (رابط ⇐ معرّف)، فترى الصيغة المخزَّنة لا ما كتبت. */}
                {SOCIAL_KEYS.map((k) => (
                  <Field
                    key={k}
                    label={socialLabelOf(k)}
                    charset="latin"
                    icon={SOCIAL_ICON[k]}
                    innerIcon={<At />}
                    placeholder="المعرّف أو رابط الحساب"
                    optional
                    disabled={!profile.hasDetails}
                    error={errors[k]?.message}
                    {...register(k, {
                      onBlur: (e) => {
                        const res = socialHandle(k, (e.target as HTMLInputElement).value);
                        if (res.ok) form.setValue(k, res.handle ?? "", { shouldValidate: true });
                      },
                    })}
                  />
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              variant="soft"
              icon={<Palette />}
              title="لونك المفضّل"
              subtitle="به تُلوَّن تهنئة ميلادك"
            />
            <CardBody>
              <Controller
                control={control}
                name="favoriteColor"
                render={({ field }) => (
                  <ColorField
                    label="اللون المفضّل"
                    icon={<Palette />}
                    value={field.value || COLOR_START}
                    onValueChange={field.onChange}
                    disabled={!profile.hasDetails}
                    helper={field.value ? undefined : "لا لونَ محفوظًا بعد، اختر واحدًا ثمّ احفظ."}
                    optional
                  />
                )}
              />
            </CardBody>
          </Card>

          {/* حفظةٌ واحدة لِما فوقها كلّه — لكن **لا في ذيل الصفحة**: من دخل ليغيّر رقمه (البطاقة
              الثالثة) كان يمرّ على الدراسة والحسابات واللون ليبلغ زرًّا لا علاقة له بما فعل،
              ومن خرج قبله فقد تعديله صامتًا. فالشريط اللاصق يلاحقه أينما مرّر، ووجودُه نفسُه
              هو التنبيه (قرار المالك ٢٠٢٦-٠٨-٠٤). */}
          <SaveBar open={isDirty}>
            <Button variant="ghost" size="md" onClick={() => form.reset()} disabled={saving}>تراجع</Button>
            <Button type="submit" variant="primary" size="md" loading={saving}>حفظ التغييرات</Button>
          </SaveBar>
        </div>
      </form>

      {/* «غادِر» أوّلًا لأنّه جوابُ من ضغط الرابط قاصدًا، و«ابقَ» مخرجُ من عدل عنه */}
      <ConfirmDialog
        open={guard.pending !== null}
        onClose={guard.stay}
        tone="warning"
        icon={<FloppyDiskBack />}
        title="تغييراتٌ لم تُحفَظ"
        text="غادرتَ الآن ضاع ما عدّلته. احفظه أوّلًا أو غادِر بلا حفظ."
        confirmLabel="غادِر بلا حفظ"
        cancelLabel="ابقَ هنا"
        onConfirm={guard.leave}
      />
    </div>
  );
}
