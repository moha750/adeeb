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
            <div className="grid gap-6 md:grid-cols-3">
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
            <div className="grid gap-6 md:grid-cols-2">
              <Card><CardBody><h3 className="font-display font-bold text-content">افتراضية</h3><p className="mt-1 text-sm text-content-muted">حدّ + ظلّ ناعم.</p></CardBody></Card>
              <Card variant="elevated"><CardBody><h3 className="font-display font-bold text-content">بارزة</h3><p className="mt-1 text-sm text-content-muted">ظلّ أعمق.</p></CardBody></Card>
            </div>
          </section>

          <section>
            <Label>كرت العضو (المستخدَم في لوحة إدارة الأعضاء)</Label>
            <div className="max-w-xs">
              <MemberCard
                member={MEMBER}
                onOpen={() => {}}
                actions={[{ items: [{ label: "تعديل" }, { label: "حذف نهائيّ", danger: true }] }]}
              />
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
