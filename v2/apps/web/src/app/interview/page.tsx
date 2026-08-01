import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header, Footer, Container, Card, CardBody, Alert } from "@adeeb/design-system";
import { createAdeebServiceClient } from "@adeeb/core";
import { InterviewBooking, type ExistingBooking, type SessionGroup } from "./InterviewBooking";

export const metadata: Metadata = { title: "حجز موعد المقابلة — نادي أديب" };
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

// المقابلات بتوقيت الرياض (UTC+3) بالتقويم الميلاديّ — الوقت حرِجٌ فلا يُترك لتوقيت الخادم
const fmtDate = (iso: string): string =>
  new Intl.DateTimeFormat("ar-u-ca-gregory", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh" }).format(new Date(iso));
const fmtTime = (iso: string): string =>
  new Intl.DateTimeFormat("ar-u-ca-gregory", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }).format(new Date(iso));

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="py-14 md:py-20">
        <Container className="max-w-2xl">{children}</Container>
      </main>
      <Footer />
    </>
  );
}

function StateScreen({ title, tone, children }: { title: string; tone: "info" | "warning" | "success" | "danger"; children: ReactNode }) {
  return (
    <Card>
      <CardBody className="p-6">
        <Alert tone={tone} title={title}>{children}</Alert>
      </CardBody>
    </Card>
  );
}

type SessionRow = { id: string; session_name: string; interview_type: string | null; location: string | null; meeting_link: string | null };
type SlotRow = { id: string; session_id: string; slot_time: string };

export default async function InterviewPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app } = await searchParams;
  const sb = service();
  if (!sb) {
    return <Shell><StateScreen title="تعذّر تحميل الصفحة" tone="danger">إعداد الخادم ناقص — أبلغ الإدارة.</StateScreen></Shell>;
  }

  const appId = app?.trim();
  if (!appId || !UUID_RE.test(appId)) {
    return <Shell><StateScreen title="رابط غير صالح" tone="warning">الرابط ناقصٌ أو غير صحيح. استخدم الرابط الذي وصلك في البريد.</StateScreen></Shell>;
  }

  const { data: application } = await sb.from("membership_applications").select("id, full_name, status").eq("id", appId).single();
  if (!application) {
    return <Shell><StateScreen title="لم نجد طلبك" tone="warning">تحقّق من الرابط أو تواصل مع إدارة الموارد البشريّة.</StateScreen></Shell>;
  }

  // بوّابة الحالة — الحجز لمن اعتُمد للمقابلة فقط
  if (application.status === "new") {
    return <Shell><StateScreen title="طلبك قيد المراجعة" tone="info">لم يُعتمد طلبك للمقابلة بعد. سنتواصل معك فور جدولتها.</StateScreen></Shell>;
  }
  if (application.status === "accepted") {
    return <Shell><StateScreen title="تم قبول عضويّتك 🎉" tone="success">تحقّق من بريدك لإكمال بياناتك وتفعيل حسابك.</StateScreen></Shell>;
  }
  if (application.status !== "approved_for_interview") {
    return <Shell><StateScreen title="لا يمكن الحجز حاليًّا" tone="info">تواصل مع إدارة الموارد البشريّة لأيّ استفسار.</StateScreen></Shell>;
  }

  // حجزٌ قائم؟ (فترةٌ محجوزةٌ غير ملغاة لهذا الطلب)
  const { data: booked } = await sb
    .from("interview_slots")
    .select("id, slot_time, session_id")
    .eq("booked_by", appId)
    .eq("is_booked", true)
    .is("cancelled_at", null)
    .order("slot_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  let existing: ExistingBooking | null = null;
  if (booked) {
    const { data: sess } = await sb
      .from("interview_sessions")
      .select("session_name, interview_type, location, meeting_link, allow_cancellation")
      .eq("id", booked.session_id)
      .single();
    existing = {
      slotId: booked.id,
      dateLabel: fmtDate(booked.slot_time),
      timeLabel: fmtTime(booked.slot_time),
      sessionName: sess?.session_name ?? null,
      type: sess?.interview_type ?? null,
      location: sess?.location ?? null,
      meetingLink: sess?.meeting_link || null,
      allowCancellation: !!sess?.allow_cancellation,
    };
  }

  // الفترات المتاحة المستقبليّة مجمّعةً بالجلسة (تُجلب فقط إن لا حجز قائم)
  let sessions: SessionGroup[] = [];
  if (!existing) {
    const { data: activeSessions } = await sb
      .from("interview_sessions")
      .select("id, session_name, interview_type, location, meeting_link")
      .eq("is_active", true);
    const sessionIds = (activeSessions ?? []).map((s: SessionRow) => s.id);

    if (sessionIds.length) {
      const { data: slots } = await sb
        .from("interview_slots")
        .select("id, session_id, slot_time")
        .in("session_id", sessionIds)
        .eq("is_booked", false)
        .is("cancelled_at", null)
        .gt("slot_time", new Date().toISOString())
        .order("slot_time", { ascending: true });

      const bySession = new Map<string, SlotRow[]>();
      for (const sl of (slots ?? []) as SlotRow[]) {
        const list = bySession.get(sl.session_id) ?? [];
        list.push(sl);
        bySession.set(sl.session_id, list);
      }

      sessions = (activeSessions ?? [])
        .map((s: SessionRow) => {
          const list = bySession.get(s.id) ?? [];
          return {
            id: s.id,
            name: s.session_name,
            type: s.interview_type,
            location: s.location,
            meetingLink: s.meeting_link || null,
            dateLabel: list.length ? fmtDate(list[0].slot_time) : "",
            slots: list.map((sl) => ({ id: sl.id, timeLabel: fmtTime(sl.slot_time), sort: sl.slot_time })),
          };
        })
        .filter((g) => g.slots.length > 0)
        .sort((a, b) => a.slots[0].sort.localeCompare(b.slots[0].sort));
    }
  }

  return (
    <Shell>
      <InterviewBooking applicationId={appId} fullName={application.full_name} existing={existing} sessions={sessions} />
    </Shell>
  );
}
