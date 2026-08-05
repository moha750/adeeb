"use client";

import { Select, type SelectOption, Container } from "@adeeb/design-system";
import {
  CalendarBlank, ChatCircle, GraduationCap, MapPin, Microphone, Sparkle, Trophy, UserPlus,
} from "@phosphor-icons/react";

const TYPES: SelectOption[] = [
  { value: "workshop", label: "ورشة", icon: <GraduationCap aria-hidden />, group: "تفاعليّة" },
  { value: "dialogue", label: "حوار", icon: <ChatCircle aria-hidden />, group: "تفاعليّة" },
  { value: "lecture", label: "محاضرة", icon: <Microphone aria-hidden />, group: "إلقائيّة" },
  { value: "competition", label: "مسابقة", icon: <Trophy aria-hidden />, group: "إلقائيّة" },
];

const CITIES: SelectOption[] = [
  { value: "ahsa", label: "الأحساء" },
  { value: "riyadh", label: "الرياض" },
  { value: "jeddah", label: "جدة" },
  { value: "dammam", label: "الدمام" },
  { value: "makkah", label: "مكة المكرمة" },
  { value: "madinah", label: "المدينة المنورة" },
  { value: "abha", label: "أبها" },
  { value: "tabuk", label: "تبوك" },
];

// خيارٌ بتلميح (`hint`): واقعةٌ عن الخيار تحت اسمه — كموضع العضو حين يُسنَد إليه منصب.
// التلميح يدخل البحث مع الاسم، فيُطلب الخيار بموضعه («التصميم») كما يُطلب باسمه.
const PEOPLE: SelectOption[] = [
  { value: "p1", label: "عبدالله القحطاني", hint: "عضو — لجنة التصميم" },
  { value: "p2", label: "سارة المطيري", hint: "نائب — لجنة الرواة" },
  { value: "p3", label: "محمّد العتيبي", hint: "قائد — لجنة التسويق" },
  { value: "p4", label: "نورة الدوسري" },
];

// قائمة قصيرة جدًّا (٣) تنسدل كاملة حتى عند سقف 20vh
const SHORT: SelectOption[] = [
  { value: "beginner", label: "مبتدئ" },
  { value: "intermediate", label: "متوسّط" },
  { value: "advanced", label: "متقدّم" },
];

// قائمة طويلة (٣٠ خيارًا) لعرض حالة الـscroll
const YEARS: SelectOption[] = Array.from({ length: 30 }, (_, i) => ({
  value: `${2025 - i}`,
  label: `${2025 - i}`,
}));

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">{children}</p>
  );
}

/** صفحة مرجعية حيّة للقوائم المنسدلة — بمكوّن Select الحقيقي. */
export default function SelectsPage() {
  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Selects
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض القوائم</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          سهم في دائرة · لوحة بحدّ · مُختار كحليّ + صحّ · بحث + تجميع + أيقونات.
        </p>

        <div className="mt-12 space-y-14">
          <section>
            <Label>بحث + تجميع + أيقونات (المعتمد)</Label>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select label="نوع النشاط" icon={<Sparkle />} options={TYPES} defaultValue="workshop" searchable />
              <Select label="المدينة" icon={<MapPin />} options={CITIES} searchable />
            </div>
          </section>

          <section>
            <Label>تلميحٌ تحت الخيار (سطرُ حالٍ لا وصف)</Label>
            <p className="-mt-2 mb-4 text-sm text-content-muted">
              سطرٌ باهتٌ يقول واقعةً عن الخيار — ومن لا واقعة له يبقى اسمًا مجرّدًا. يبقى التلميح
              ظاهرًا بعد الاختيار في الحقل المغلق، ويُطابِقه البحث كما يُطابِق الاسم.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select label="العضو" icon={<UserPlus />} options={PEOPLE} searchable />
              <Select label="العضو (مُختار)" icon={<UserPlus />} options={PEOPLE} defaultValue="p2" searchable />
            </div>
          </section>

          <section>
            <Label>بسيطة (بلا بحث)</Label>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select label="نوع النشاط" icon={<Sparkle />} options={TYPES} />
              <Select label="المدينة" icon={<MapPin />} options={CITIES} defaultValue="ahsa" />
            </div>
          </section>

          <section>
            <Label>الحالات</Label>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select label="نوع النشاط" icon={<Sparkle />} options={TYPES} error="هذا الحقل مطلوب." />
              <Select label="غير متاح" icon={<Sparkle />} options={TYPES} defaultValue="lecture" disabled />
            </div>
          </section>

          <section>
            <Label>طول القائمة — قصيرة (بلا scroll) · طويلة (scroll عند اللزوم)</Label>
            <p className="-mt-2 mb-4 text-sm text-content-muted">
              القصيرة تنسدل كاملة بلا شريط. الأطول تتوقّف عند ٣٠٪ من الشاشة فيظهر شريط التمرير الطافي — افتح كلًّا وقارِن.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select label="قصيرة — تنسدل كاملة" icon={<GraduationCap />} options={SHORT} />
              <Select label="طويلة — scroll عند اللزوم" icon={<CalendarBlank />} options={YEARS} searchable />
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
