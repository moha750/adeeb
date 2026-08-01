"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Textarea, Select, Card, CardBody, Alert } from "@adeeb/design-system";
import {
  User, PencilSimple, Phone, Hash, Envelope, At, Certificate, GraduationCap, Buildings,
  BookOpen, Books, UsersThree, Sparkle, ChatText, LinkSimple, GlobeSimple, XLogo, InstagramLogo, LinkedinLogo,
} from "@phosphor-icons/react";
import { DEGREES, hasAcademicFields } from "@/lib/membershipFields";
import { applicationSchema, emptyApplication, type ApplicationInput } from "./vocab";
import { submitApplication } from "./actions";

/** خيار لجنة للقائمة — الشكل الذي يقبله Select (value = اسم اللجنة العربيّ، group = القسم). */
type CommitteeOption = { value: string; label: string; group?: string };

export type JoinFormProps = {
  /** اللجان المتاحة مجمّعةً بالقسم — تُملأ خادميًّا (قناة عامّة أو دعوة multiple). */
  committeeOptions: CommitteeOption[];
  /** دعوة single: لجنةٌ مثبّتة (عرضٌ فقط، لا تُختار). */
  lockedCommittee: string | null;
  /** رمز الدعوة إن وُجد — يُمرَّر للفعل الخادميّ ليُعيد تصديقه. */
  inviteCode: string | null;
};

export function JoinForm({ committeeOptions, lockedCommittee, inviteCode }: JoinFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [topError, setTopError] = useState<string | null>(null);

  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { ...emptyApplication, preferred_committee: lockedCommittee ?? "" },
    mode: "onBlur",
  });
  const { register, handleSubmit, control, watch, setError, formState: { errors } } = form;

  const academic = hasAcademicFields(watch("degree"));

  const onSubmit = handleSubmit((values) => {
    setTopError(null);
    startTransition(async () => {
      const res = await submitApplication(values, inviteCode ?? undefined);
      if (res.ok) {
        router.push("/join/done");
        return;
      }
      if (res.fieldErrors) {
        for (const [key, message] of Object.entries(res.fieldErrors)) {
          setError(key as keyof ApplicationInput, { message });
        }
      }
      setTopError(res.message);
    });
  });

  return (
    <Card>
      <CardBody className="p-6 md:p-8">
        <form onSubmit={onSubmit} className="space-y-8" noValidate>
          {inviteCode ? (
            <Alert tone="info" title="دعوةٌ خاصّة">
              أنت تقدّم عبر رابط دعوة{lockedCommittee ? <> إلى <strong>{lockedCommittee}</strong></> : null}.
            </Alert>
          ) : null}

          {/* البيانات الأساسيّة */}
          <section className="space-y-4">
            <h3 className="font-display text-lg font-bold text-content">بياناتك الأساسيّة</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                label="الاسم الثلاثيّ"
                icon={<User />}
                innerIcon={<PencilSimple />}
                placeholder="اكتب اسمك الثلاثيّ"
                error={errors.full_name?.message}
                {...register("full_name")}
                required
              />
              <Field
                label="رقم الجوّال"
                type="tel"
                charset="digits"
                icon={<Phone />}
                innerIcon={<Hash />}
                placeholder="05xxxxxxxx"
                error={errors.phone?.message}
                {...register("phone")}
                required
              />
              <Field
                label="البريد الإلكترونيّ"
                type="email"
                charset="latin"
                icon={<Envelope />}
                innerIcon={<At />}
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email")}
                required
              />
            </div>
          </section>

          {/* الدراسة */}
          <section className="space-y-4">
            <h3 className="font-display text-lg font-bold text-content">دراستك</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="degree"
                control={control}
                render={({ field }) => (
                  <Select
                    className="sm:col-span-2"
                    label="الدرجة العلميّة"
                    icon={<Certificate />}
                    options={DEGREES}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    error={errors.degree?.message}
                    required
                  />
                )}
              />
              {academic ? (
                <>
                  <Field label="الكلّية" icon={<GraduationCap />} innerIcon={<Buildings />} placeholder="مثال: كلّية الآداب" error={errors.college?.message} {...register("college")} required />
                  <Field label="التخصّص" icon={<BookOpen />} innerIcon={<Books />} placeholder="مثال: اللغة العربيّة" error={errors.major?.message} {...register("major")} required />
                </>
              ) : null}
            </div>
          </section>

          {/* اللجنة */}
          <section className="space-y-4">
            <h3 className="font-display text-lg font-bold text-content">اللجنة التي ترغب الانضمام إليها</h3>
            {lockedCommittee ? (
              <Select
                label="اللجنة"
                icon={<UsersThree />}
                options={[{ value: lockedCommittee, label: lockedCommittee }]}
                value={lockedCommittee}
                disabled
                helper="لجنةٌ محدّدةٌ عبر رابط الدعوة."
                required
              />
            ) : (
              <Controller
                name="preferred_committee"
                control={control}
                render={({ field }) => (
                  <Select
                    label="اختر اللجنة"
                    icon={<UsersThree />}
                    options={committeeOptions}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    searchable
                    error={errors.preferred_committee?.message}
                    required
                  />
                )}
              />
            )}
          </section>

          {/* نبذة ومهارات */}
          <section className="space-y-4">
            <h3 className="font-display text-lg font-bold text-content">عرّفنا بنفسك</h3>
            <div className="space-y-4">
              <Controller
                name="about"
                control={control}
                render={({ field }) => (
                  <Textarea label="نبذةٌ عنك" icon={<ChatText />} innerIcon={<PencilSimple />} placeholder="لماذا تودّ الانضمام إلى أدِيب؟" rows={4} value={field.value ?? ""} onChange={field.onChange} error={errors.about?.message} optional />
                )}
              />
              <Controller
                name="skills"
                control={control}
                render={({ field }) => (
                  <Textarea label="مهاراتك واهتماماتك" icon={<Sparkle />} innerIcon={<PencilSimple />} placeholder="مثال: الكتابة، التصميم، التصوير…" rows={3} value={field.value ?? ""} onChange={field.onChange} error={errors.skills?.message} optional />
                )}
              />
              <Field
                label="رابط أعمالك"
                icon={<LinkSimple />}
                innerIcon={<GlobeSimple />}
                placeholder="https://…"
                charset="latin"
                error={errors.portfolio_url?.message}
                {...register("portfolio_url")}
                optional
              />
            </div>
          </section>

          {/* التواصل الاجتماعيّ */}
          <section className="space-y-4">
            <h3 className="font-display text-lg font-bold text-content">حساباتك (اختياريّة)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="حساب X" icon={<XLogo />} innerIcon={<At />} placeholder="المعرّف أو الرابط" charset="latin" error={errors.social_twitter?.message} {...register("social_twitter")} optional />
              <Field label="إنستغرام" icon={<InstagramLogo />} innerIcon={<At />} placeholder="المعرّف أو الرابط" charset="latin" error={errors.social_instagram?.message} {...register("social_instagram")} optional />
              <Field className="sm:col-span-2" label="لينكدإن" icon={<LinkedinLogo />} innerIcon={<GlobeSimple />} placeholder="رابط الحساب أو المعرّف" charset="latin" error={errors.social_linkedin?.message} {...register("social_linkedin")} optional />
            </div>
          </section>

          {topError ? <Alert tone="danger">{topError}</Alert> : null}

          <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
            إرسال طلب العضويّة
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
