"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Select, Card, CardBody, Alert } from "@adeeb/design-system";
import {
  User, Phone, Hash, Envelope, At, IdentificationCard, CalendarBlank, Certificate, GraduationCap, Buildings, BookOpen, Books, GenderIntersex, Palette,
  XLogo, InstagramLogo, TiktokLogo, LinkedinLogo } from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { DEGREES, hasAcademicFields, NATIONAL_ID_LEN, PHONE_LEN, PHONE_PREFIX, RECORD_NO_MAX } from "@/lib/membershipFields";
import { completeSchema, emptyComplete, type CompleteInput } from "./vocab";
import { completeMyRecord } from "./actions";

export type Prefill = { fullName: string; phone: string; email: string };

const GENDERS = [
  { value: "male", label: "ذكر" },
  { value: "female", label: "أنثى" },
];

/**
 * نموذج إكمال السجلّ — نسخةٌ مجرّدةٌ من نموذج الالتحاق القديم بلا كلمة مرورٍ ولا تفعيل:
 * صاحبُه داخلٌ بجلسته أصلًا، فليس ههنا مصادقةٌ تُنشأ، إنّما سجلٌّ يُستوفى.
 */
export function CompleteForm({ prefill }: { prefill: Prefill }) {
  const [pending, startTransition] = useTransition();
  const [topError, setTopError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const form = useForm<CompleteInput>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      ...emptyComplete,
      full_name_triple: prefill.fullName,
      phone: prefill.phone,
    },
    mode: "onBlur",
  });
  const { register, handleSubmit, control, watch, setError, formState: { errors } } = form;

  const academic = hasAcademicFields(watch("academic_degree"));

  const onSubmit = handleSubmit((values) => {
    setTopError(null);
    startTransition(async () => {
      const res = await completeMyRecord(values);
      if (res.ok) {
        setDone(true);
        return;
      }
      if (res.fieldErrors) {
        for (const [key, message] of Object.entries(res.fieldErrors)) setError(key as keyof CompleteInput, { message });
      }
      setTopError(res.message);
    });
  });

  if (done) {
    return (
      <Card tone="success" className="text-center">
        <CardBody className="p-8 md:p-10">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-2xl font-black text-success">✓</div>
          <h2 className="font-display text-2xl font-black text-content">اكتمل سجلُّك</h2>
          <p className="mx-auto mt-2 max-w-md text-content-muted">شكرًا لك. صار سجلُّك في أدِيب كاملًا.</p>
          <div className="mt-6 flex justify-center">
            <Link href="/dashboard" className="abtn abtn-primary abtn-lg">إلى بوّابة أَدِيب</Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="p-6 md:p-8">
        <form onSubmit={onSubmit} className="space-y-8" noValidate>
          {/* البيانات الشخصيّة */}
          <section className="space-y-4">
            <h3 className="font-display text-lg font-bold text-content">بياناتك الشخصيّة</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2" label="الاسم الثلاثيّ" icon={<User />} innerIcon={<PencilSimple />} placeholder="الاسم الأوّل واسم الأب واسم العائلة" error={errors.full_name_triple?.message} {...register("full_name_triple")} required />
              <Field label="رقم الهويّة" charset="digits" maxLength={NATIONAL_ID_LEN} icon={<IdentificationCard />} innerIcon={<Hash />} placeholder="١٠ أرقام" error={errors.national_id?.message} {...register("national_id")} required />
              <Field label="رقم الجوّال" type="tel" charset="digits" maxLength={PHONE_LEN} prefix={PHONE_PREFIX} icon={<Phone />} innerIcon={<Hash />} placeholder="05xxxxxxxx" error={errors.phone?.message} {...register("phone")} required />
              <Field label="تاريخ الميلاد" type="date" icon={<CalendarBlank />} innerIcon={<CalendarBlank />} placeholder="سنة/شهر/يوم" error={errors.birth_date?.message} {...register("birth_date")} required />
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select label="الجنس" icon={<GenderIntersex />} options={GENDERS} value={field.value ?? ""} onValueChange={field.onChange} error={errors.gender?.message} required />
                )}
              />
              <Field className="sm:col-span-2" label="البريد الإلكترونيّ (للدخول)" icon={<Envelope />} innerIcon={<At />} placeholder="—" charset="latin" value={prefill.email} readOnly disabled helper="بريد الدخول — لتعديله تواصل مع الإدارة." />
            </div>
          </section>

          {/* الدراسة */}
          <section className="space-y-4">
            <h3 className="font-display text-lg font-bold text-content">دراستك</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="academic_degree"
                control={control}
                render={({ field }) => (
                  <Select className="sm:col-span-2" label="الدرجة العلميّة" icon={<Certificate />} options={DEGREES} value={field.value ?? ""} onValueChange={field.onChange} error={errors.academic_degree?.message} required />
                )}
              />
              {academic ? (
                <>
                  <Field label="الكلّية" icon={<GraduationCap />} innerIcon={<Buildings />} placeholder="مثال: كلّية الآداب" error={errors.college?.message} {...register("college")} required />
                  <Field label="التخصّص" icon={<BookOpen />} innerIcon={<Books />} placeholder="مثال: اللغة العربيّة" error={errors.major?.message} {...register("major")} required />
                  <Field className="sm:col-span-2" label="الرقم الأكاديميّ" charset="digits" maxLength={RECORD_NO_MAX} icon={<IdentificationCard />} innerIcon={<Hash />} placeholder="مثال: 443001234" error={errors.academic_record_number?.message} {...register("academic_record_number")} required />
                </>
              ) : null}
            </div>
          </section>

          {/* لمسة أخيرة */}
          <section className="space-y-4">
            <h3 className="font-display text-lg font-bold text-content">لمسةٌ أخيرة (اختياريّة)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="لونك المفضّل" icon={<Palette />} innerIcon={<Palette />} placeholder="#3d8fd6" charset="latin" helper="يلوّن تهنئة ميلادك." error={errors.favorite_color?.message} {...register("favorite_color")} optional />
              <Field label="حساب X" icon={<XLogo />} innerIcon={<At />} placeholder="المعرّف أو الرابط" charset="latin" error={errors.twitter?.message} {...register("twitter")} optional />
              <Field label="إنستغرام" icon={<InstagramLogo />} innerIcon={<At />} placeholder="المعرّف أو الرابط" charset="latin" error={errors.instagram?.message} {...register("instagram")} optional />
              <Field label="تيك توك" icon={<TiktokLogo />} innerIcon={<At />} placeholder="المعرّف أو الرابط" charset="latin" error={errors.tiktok?.message} {...register("tiktok")} optional />
              <Field className="sm:col-span-2" label="لينكدإن" icon={<LinkedinLogo />} innerIcon={<At />} placeholder="رابط الحساب أو المعرّف" charset="latin" error={errors.linkedin?.message} {...register("linkedin")} optional />
            </div>
          </section>

          {topError ? <Alert tone="danger">{topError}</Alert> : null}

          <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
            حفظ سجلّي
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
