"use client";

// معرضُ بطاقة العضويّة ومسيرتها — المكوّنان الحيّان نفسُهما (`dashboard/_membership/`) بعيّناتٍ
// تغطّي حالات العضويّة الأربع، والسلسلة الكاملة والناقصة، والمسيرة القصيرة والطويلة.
import { Card, CardBody, CardHeader, Container } from "@adeeb/design-system";
import { IdentificationCard, Path } from "@phosphor-icons/react";
import { MembershipCard } from "../../dashboard/_membership/MembershipCard";
import { Journey } from "../../dashboard/_membership/Journey";
import type { JourneyStop } from "../../dashboard/_membership/data";

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">{children}</p>;
}

/** محطّةٌ وهميّة مختصَرة — الافتراضات ثمّ ما يُهمّ العرض. */
const S = (o: Partial<JourneyStop> & { key: string; title: string }): JourneyStop => ({
  kind: "role", scope: null, date: "١٦ يناير ٢٠٢٦", at: 0, current: false, ...o,
});

const LONG: JourneyStop[] = [
  S({ key: "j", kind: "join", title: "انضمامك إلى أديب", date: "3 سبتمبر 2024" }),
  S({ key: "r1", title: "عضو", scope: "لجنة الإعلام", date: "3 سبتمبر 2024" }),
  S({ key: "r2", title: "نائب", scope: "لجنة الإعلام", date: "12 فبراير 2025" }),
  S({ key: "r3", title: "قائد", scope: "لجنة الإعلام", date: "20 يناير 2026", current: true }),
];

const SHORT: JourneyStop[] = [S({ key: "j", kind: "join", title: "انضمامك إلى أديب", date: "16 يناير 2026" })];

// المشرف الإداريّ: تسعةُ صفوفٍ في القاعدة تُجمَع محطّةً واحدة نطاقُها وحداتُها كلّها
const WIDE: JourneyStop[] = [
  S({ key: "j", kind: "join", title: "انضمامك إلى أديب", date: "29 يونيو 2026" }),
  S({ key: "r1", title: "عضو", scope: "إدارة الضمان والجودة", date: "29 يونيو 2026" }),
  S({ key: "r2", title: "عضو ضمان وجودة", scope: "لجنة الفعاليات · لجنة الرواة · لجنة التأليف · لجنة السُفراء · لجنة التصوير · لجنة التصميم · لجنة التسويق · لجنة التقارير والأرشفة · لجنة البرمجة", date: "15 يوليو 2026", current: true }),
];

export default function MembershipGalleryPage() {
  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System · Membership</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">بطاقة العضويّة والمسيرة</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          صدرُ اللوحة: عضويّة صاحب الجلسة. البطاقةُ نصفان — نصفٌ غامقٌ للهويّة (تدرّج العلامة ونقشها،
          شرائحُه زجاجيّة) ونصفٌ فاتحٌ للحقائق (شارةُ الحالة تُقرأ فوقه ولا تصير مُلصَقًا فوق التدرّج).
          والمسيرةُ <code className="font-latin">&lt;ol&gt;</code> لا كومةَ صفوف — تسلسلٌ يقرؤه قارئ الشاشة رحلةً.
          أنماطُهما <code className="font-latin">.mcard-*</code> و<code className="font-latin">.mjr-*</code> بالمكتبة.
          مرّر الفأرة على البطاقة: يعبرها تلألؤٌ زجاجيّ مرّةً واحدة (يسكن مع <code className="font-latin">prefers-reduced-motion</code>).
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <Label>نشط · سلسلةٌ كاملة (مجلس ← قسم ← لجنة)</Label>
            <MembershipCard
              name="بشائر فاروق الحداد"
              role="قائد"
              status="active"
              gender="female"
              chain={["المجلس التنفيذي", "قسم الإعلام والتسويق", "لجنة الإعلام"]}
              joined="3 سبتمبر 2024"
              duration="سنة و4 أشهر"
            />
          </section>

          <section>
            <Label>نشط · بلا قسمٍ ولا لجنة (الإدارة العليا — خلوٌّ معنًى لا نقص)</Label>
            <MembershipCard
              name="محمد إسماعيل المطر"
              role="رئيس نادي أدِيب"
              status="active"
              gender="male"
              chain={["المجلس الإداري"]}
              joined="16 يناير 2026"
              duration="6 أشهر و10 أيام"
            />
          </section>

          <section>
            <Label>منصبٌ ممتدٌّ على وحدات (مشرفُ ضمانٍ على تسع لجان) — لا قسمَ مُختلَق، واللجان تُسرَد</Label>
            <MembershipCard
              name="آيات مصطفى ال سنان"
              role="عضو ضمان وجودة"
              status="active"
              gender="female"
              chain={["المجلس الإداري", "لجنة الفعاليات", "لجنة الرواة", "لجنة التأليف", "لجنة السُفراء", "لجنة التصوير", "لجنة التصميم", "لجنة التسويق", "لجنة التقارير والأرشفة", "لجنة البرمجة"]}
              joined="29 يونيو 2026"
              duration="27 يومًا"
            />
          </section>

          <section>
            <Label>قيد الإكمال · لا منصب بعد (السلسلة تسقط كلّها)</Label>
            <MembershipCard name="نورة الدوسري" role={null} status="pending" joined="21 يوليو 2026" duration="5 أيام" />
          </section>

          <section>
            <Label>موقوف · عضويّة منتهية</Label>
            <MembershipCard
              name="خالد العتيبي"
              role="عضو"
              status="suspended"
              gender="male"
              chain={["المجلس التنفيذي", "قسم التطوير", "لجنة البرمجة"]}
              joined="12 مارس 2025"
              duration="سنة و4 أشهر"
            />
          </section>

          <section>
            <Label>المسيرة — محطّاتٌ متعدّدة، والقائمةُ الآن بنغمة النجاح وشارة «حاليّ»</Label>
            <Card>
              <CardHeader variant="soft" icon={<Path weight="fill" />} title="مسيرتي في أديب" subtitle="انضمامك وما تلاه من مناصب — الأقدم أوّلًا" />
              <CardBody><Journey stops={LONG} /></CardBody>
            </Card>
          </section>

          <section>
            <Label>المسيرة — منصبٌ ممتدّ: تسعةُ صفوفٍ تُجمَع محطّةً واحدة، ونطاقُها يلتفّ ولا يُبتَر</Label>
            <Card>
              <CardHeader variant="soft" icon={<Path weight="fill" />} title="مسيرتي في أديب" />
              <CardBody><Journey stops={WIDE} /></CardBody>
            </Card>
          </section>

          <section>
            <Label>المسيرة — محطّةٌ واحدة (لا خيطَ تحتها: المسيرة تنتهي ولا تُعلَّق)</Label>
            <Card>
              <CardHeader variant="soft" icon={<IdentificationCard weight="fill" />} title="مسيرتي في أديب" />
              <CardBody><Journey stops={SHORT} /></CardBody>
            </Card>
          </section>
        </div>
      </Container>
    </main>
  );
}
