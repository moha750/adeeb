"use client";

import {
  Card,
  CardMedia,
  CardBody,
  CardHeader,
  CardFooter,
  Badge,
  Button,
  Container,
} from "@adeeb/design-system";
import { GraduationCap, ArrowLeft } from "@phosphor-icons/react";
import { MemberCard } from "../../dashboard/members/MemberCard";
import type { MemberRow } from "../../dashboard/members/data";

const MEMBER: MemberRow = {
  id: "mock", name: "محمد بن إسماعيل", email: "mohammad@adeeb.club", phone: "٠٥٠١٢٣٤٥٦٧",
  avatar: null, dept: "الإعلام", committee: "لجنة الإعلام", role: "عضو", status: "active",
  joined: "١٢ يناير ٢٠٢٥", joinedRaw: "2025-01-12",
  college: null, major: null, degree: null, degreeRaw: null, recordNo: null,
  twitter: null, instagram: null, tiktok: null, linkedin: null,
  endReason: null, endDate: "", endAgo: "",
};

// ٦ = صفّان تامّان · ٧ = يبقى واحد فيمتدّ · ٨ = يبقى اثنان فيقتسمان
const GRID_CASES = [6, 7, 8] as const;

// نغمة كرت العضو تُشتقّ من حالته (TONE_CLASS في MemberCard)، فالمعروض هنا هو
// المسلك الحقيقيّ لا أصنافًا تُفرَض. أربع حالات ← ثلاث نغمات + خامل:
//   .mc-tone-success معرَّف في الهوية ولا تستدعيه حالةٌ — صنفٌ يتيم.
const MC_STATES: Array<{ status: MemberRow["status"]; label: string }> = [
  { status: "active",    label: "نشط — mc-tone-brand" },
  { status: "pending",   label: "بانتظار الإكمال — mc-tone-warning" },
  { status: "suspended", label: "موقوف — mc-tone-danger" },
  { status: "inactive",  label: "غير نشط — بلا نغمة (الأساس الخامل)" },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">{children}</p>
  );
}

export default function CardsPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">
          Design System · Cards
        </p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">معرض البطاقات</h1>
        <p className="mt-2 max-w-xl text-content-muted">
          حدّ + ظلّ ناعم · مرور (تكبير + حدّ ملوّن) عبر <code className="font-latin">interactive</code> · قابلة للتركيب.
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Label>التركيب (Media · Header · Body · Footer · أفقية)</Label>
            <div className="mc-grid">
              <Card interactive>
                <CardMedia />
                <CardBody>
                  <Badge dot>ورشة</Badge>
                  <h3 className="mt-2 font-display text-lg font-bold text-content">رحلتك في عالم التصميم</h3>
                  <p className="mt-1 text-sm text-content-muted">ورشة تدريبية في التصميم الجرافيكي.</p>
                </CardBody>
              </Card>

              <Card interactive>
                <CardMedia />
                <CardBody>
                  <Badge tone="info" dot>مسابقة</Badge>
                  <h3 className="mt-2 font-display text-lg font-bold text-content">مسابقة القصة القصيرة</h3>
                  <p className="mt-1 text-sm text-content-muted">شارك بقصّتك واربح جوائز.</p>
                </CardBody>
                <CardFooter>
                  <span className="text-sm text-content-muted">٦ مايو</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-primary">سجّل <ArrowLeft size={15} aria-hidden /></span>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader icon={<GraduationCap weight="duotone" aria-hidden />} title="تدريب معتمد" subtitle="شهادة حضور" />
                <CardBody className="pt-3">
                  <p className="text-sm text-content-muted">برامج تدريبية نوعية بإشراف مختصّين وشهادات موثّقة.</p>
                </CardBody>
              </Card>
            </div>

            <div className="mt-6">
              <Card interactive horizontal className="max-w-xl">
                <CardMedia />
                <CardBody>
                  <Badge dot>ورشة</Badge>
                  <h3 className="mt-2 font-display text-lg font-bold text-content">احتراف الفوتوغراف</h3>
                  <p className="mt-1 text-sm text-content-muted">من اختيار العدسة إلى إدارة المشاريع.</p>
                </CardBody>
              </Card>
            </div>
          </section>

          <section>
            <Label>الأنماط (variant)</Label>
            <div className="mc-grid">
              <Card><CardBody><h3 className="font-display font-bold text-content">افتراضية</h3><p className="mt-1 text-sm text-content-muted">حدّ + ظلّ ناعم.</p></CardBody></Card>
              <Card variant="elevated"><CardBody><h3 className="font-display font-bold text-content">بارزة</h3><p className="mt-1 text-sm text-content-muted">ظلّ أعمق.</p></CardBody></Card>
            </div>
          </section>

          <section>
            <Label>كرت العضو — النغمات (النغمة تُشتقّ من الحالة)</Label>
            <p className="mb-6 max-w-2xl text-content-muted">
              السطح والحدّ والظلّ يتنغّمون معًا من رمزٍ واحد
              (<code className="font-latin">--surface-aurora</code> ·
              <code className="font-latin"> --border-aurora</code> ·
              <code className="font-latin"> --shadow-tone</code>) — القاعدتان ٤ و٥.
            </p>
            <div className="mc-grid">
              {MC_STATES.map((s) => (
                <div key={s.status}>
                  <p className="mb-3 font-latin text-xs font-bold text-content-muted">{s.label}</p>
                  <MemberCard
                    member={{ ...MEMBER, id: s.status, status: s.status }}
                    onOpen={() => {}}
                    actions={[{ items: [{ label: "تعديل" }, { label: "حذف نهائيّ", danger: true }] }]}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* القاعدة ٦ — سلوكٌ لا يظهر إلّا عند حالة حافّة (صفّ ناقص)، فيُعرض هنا
              عمدًا بالحالات الثلاث. بـ.mc-grid نفسها لا بشبكة مقلّدة: المعرض
              مرجعٌ يُقلَّد، فإن قلّد Tailwind علّم الخطأ. */}
          <section>
            <Label>القاعدة ٦ — الصفّ الأخير لا يترك فراغًا</Label>
            <p className="mb-6 max-w-2xl text-content-muted">
              أيّ صفّ ناقص يمتلئ بما فيه: كرتٌ واحد يأخذ العرض كلّه، وكرتان يقتسمانه.
              ضيّق النافذة — يتغيّر عدد الأعمدة والقاعدة تصمد، بلا استعلام وسائط:
              <code className="font-latin"> display:flex</code> +
              <code className="font-latin"> flex:1 1 252px</code>.
              (Grid لا يستطيعها: <code className="font-latin">auto-fill</code> يجعل عدد الأعمدة
              متغيّرًا، وحيَل <code className="font-latin">nth-child(3n+1)</code> تفترض عددًا ثابتًا لا وجود له.)
            </p>

            {GRID_CASES.map((n) => (
              <div key={n} className="mb-8">
                <p className="mb-3 font-latin text-xs font-bold text-content-muted">{n} cards</p>
                <div className="mc-grid">
                  {Array.from({ length: n }, (_, i) => (
                    <MemberCard
                      key={i}
                      member={{ ...MEMBER, id: `m${i}`, name: `عضو ${i + 1}` }}
                      onOpen={() => {}}
                      actions={[]}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </Container>
    </main>
  );
}
