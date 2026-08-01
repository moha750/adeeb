import type { Metadata } from "next";
import { Header, Footer, Container, SectionHeading, Alert, Card, CardBody } from "@adeeb/design-system";
import { createAdeebServiceClient } from "@adeeb/core";
import { isRegistrationOpen, nextOpenAt, type RegistrationSettings } from "@/lib/registration";
import { JoinForm } from "./JoinForm";
import { RegistrationClosed } from "./RegistrationClosed";

export const metadata: Metadata = {
  title: "التسجيل في العضويّة — نادي أديب",
  description: "قدّم طلب الانضمام إلى نادي أدِيب واختر اللجنة التي تناسب موهبتك.",
};

// الصفحة تعتمد على حالة الإعدادات والدعوة لحظيًّا — لا تُخزَّن ثابتةً
export const dynamic = "force-dynamic";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type CommitteeRow = { id: number; committee_name_ar: string; department_id: number | null; council_id: string };
type AvailRow = { committee_id: number; is_available: boolean | null; max_applicants: number | null; current_applicants: number | null };
type InvitationRow = {
  is_valid: boolean;
  invitation_id: string | null;
  committee_mode: string | null;
  selected_committee_id: number | null;
  selected_committee_ids: number[] | null;
  message: string | null;
};

/** غلاف الصفحة العامّة — رأس وتذييل الموقع مع محتوى موسّط. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="py-14 md:py-20">
        <Container className="max-w-3xl">{children}</Container>
      </main>
      <Footer />
    </>
  );
}

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  const sb = service();

  if (!sb) {
    return (
      <Shell>
        <Card>
          <CardBody className="p-6">
            <Alert tone="danger" title="تعذّر تحميل صفحة التسجيل">إعداد الخادم ناقص — أبلغ الإدارة.</Alert>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  // 1) الإعدادات + الدعوة (إن وُجدت) بالتوازي
  const inviteCode = invite?.trim() || null;
  const [{ data: settings }, inviteRes] = await Promise.all([
    sb.from("membership_settings").select("*").eq("id", "default").single(),
    inviteCode
      ? sb.rpc("validate_invitation", { p_code: inviteCode })
      : Promise.resolve({ data: null as InvitationRow[] | null }),
  ]);

  const inv: InvitationRow | null = Array.isArray(inviteRes.data) ? (inviteRes.data[0] as InvitationRow) : null;
  const inviteValid = !!inv?.is_valid;

  // 2) البوّابة: دعوةٌ صالحة تتجاوز الإغلاق؛ دعوةٌ فاسدة تُظهر سببها؛ وإلّا حالة الفتح العامّة
  const now = new Date();
  const openGeneral = settings ? isRegistrationOpen(settings as RegistrationSettings, now) : false;

  if (inviteCode && !inviteValid) {
    return (
      <Shell>
        <RegistrationClosed
          title="رابط الدعوة غير صالح"
          message={inv?.message || "هذا الرابط غير صالح أو انتهت صلاحيته. تواصل مع من أرسله إليك."}
          buttonText="العودة للرئيسيّة"
          openAtLabel={null}
        />
      </Shell>
    );
  }

  if (!inviteValid && !openGeneral) {
    const s = settings as RegistrationSettings | null;
    const openAt = s ? nextOpenAt(s, now) : null;
    return (
      <Shell>
        <RegistrationClosed
          title={s?.join_closed_title || "التسجيل مغلق حاليًّا"}
          message={s?.join_closed_message || "نعتذر، التسجيل في العضويّة مغلقٌ حاليًّا. تابعنا لمعرفة موعد الفتح."}
          buttonText={s?.join_closed_button_text || "تابعنا"}
          openAtLabel={openAt ? fmtDate(openAt.toISOString()) : null}
        />
      </Shell>
    );
  }

  // 3) اللجان: نبني قائمة الخيارات المسموحة مجمّعةً بالقسم/المجلس
  const [{ data: committees }, { data: departments }, { data: councils }, { data: available }] = await Promise.all([
    sb.from("committees").select("id, committee_name_ar, department_id, council_id"),
    sb.from("departments").select("id, name_ar"),
    sb.from("councils").select("id, name_ar"),
    sb.from("membership_available_committees").select("committee_id, is_available, max_applicants, current_applicants"),
  ]);

  const deptName = new Map<number, string>((departments ?? []).map((d: { id: number; name_ar: string }) => [d.id, d.name_ar]));
  const councilName = new Map<string, string>((councils ?? []).map((c: { id: string; name_ar: string }) => [c.id, c.name_ar]));
  const availByCommittee = new Map<number, AvailRow>((available ?? []).map((a: AvailRow) => [a.committee_id, a]));
  const committeeById = new Map<number, CommitteeRow>((committees ?? []).map((c: CommitteeRow) => [c.id, c]));

  const isOpenAvailable = (id: number): boolean => {
    const a = availByCommittee.get(id);
    return !!a && !!a.is_available && (a.max_applicants == null || (a.current_applicants ?? 0) < a.max_applicants);
  };

  // مجموعة المسموح: الدعوة تثبّت أو تحصر (وتتجاوز حالة الإتاحة)؛ القناة العامّة = المتاح غير الممتلئ
  let allowedIds: number[];
  let lockedCommittee: string | null = null;
  if (inviteValid && inv?.committee_mode === "single" && inv.selected_committee_id) {
    allowedIds = [inv.selected_committee_id];
    lockedCommittee = committeeById.get(inv.selected_committee_id)?.committee_name_ar ?? null;
  } else if (inviteValid && inv?.committee_mode === "multiple" && inv.selected_committee_ids?.length) {
    allowedIds = inv.selected_committee_ids;
  } else {
    allowedIds = (committees ?? []).map((c: CommitteeRow) => c.id).filter(isOpenAvailable);
  }

  const committeeOptions = allowedIds
    .map((id) => committeeById.get(id))
    .filter((c): c is CommitteeRow => !!c)
    .map((c) => ({
      value: c.committee_name_ar,
      label: c.committee_name_ar,
      group: c.department_id != null ? deptName.get(c.department_id) : councilName.get(c.council_id),
    }));

  const cycleTitle = (settings as RegistrationSettings | null)?.cycle_title;

  return (
    <Shell>
      <SectionHeading
        eyebrow={cycleTitle || "انضمّ إلينا"}
        title="التسجيل في عضويّة أدِيب"
      />
      <p className="mb-8 max-w-xl text-content-muted">
        عبّئ بياناتك واختر اللجنة التي تناسب موهبتك. سنراجع طلبك ونتواصل معك لتحديد موعد المقابلة.
      </p>
      {committeeOptions.length === 0 && !lockedCommittee ? (
        <Card>
          <CardBody className="p-6">
            <Alert tone="warning" title="لا لجان متاحة للتقديم حاليًّا">
              اكتملت مقاعد اللجان المتاحة. تابعنا لمعرفة موعد فتح لجانٍ جديدة.
            </Alert>
          </CardBody>
        </Card>
      ) : (
        <JoinForm committeeOptions={committeeOptions} lockedCommittee={lockedCommittee} inviteCode={inviteCode} />
      )}
    </Shell>
  );
}
