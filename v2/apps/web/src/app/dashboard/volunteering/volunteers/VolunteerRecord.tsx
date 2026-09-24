"use client";

import {
  AddressBook, Broadcast, CalendarBlank, CalendarCheck, CalendarX, Certificate, ChatCircleText,
  ClockCounterClockwise, DeviceMobile, Envelope, EnvelopeOpen, HandHeart, Hash, IdentificationCard,
  Link as LinkIcon, ListNumbers, MapPin, Medal, NotePencil, Phone, SealCheck, ShieldCheck, SignIn,
  Ticket, User, UsersThree,
} from "@phosphor-icons/react";
// أيقوناتٌ يُفسِدها الوزنُ المزدوج، ومصدرُها الواحد قائمةُ الاستثناءات لا Phosphor
import { CheckCircle, Eye, Prohibit, WarningCircle, XCircle } from "@/app/_components/glyphs";
import { Badge } from "@adeeb/design-system";
import { Avatar } from "../../_components/Avatar";
import { Cell } from "../../_components/Cell";
import { Section } from "../../_components/Section";
import type { VolunteerApp, VolunteerRow } from "../data";

const APP_STATUS: Record<VolunteerApp["status"], { label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
  pending: { label: "معلَّق", tone: "warning" },
  accepted: { label: "مقبول", tone: "success" },
  rejected: { label: "مردود", tone: "danger" },
  withdrawn: { label: "منسحِب", tone: "neutral" },
};

const ACCOUNT_STATUS: Record<string, string> = {
  active: "سارٍ",
  inactive: "خامل",
  suspended: "موقوف",
};

const ORDER = ["الرغبةُ الأولى", "الرغبةُ الثانية", "الرغبةُ الثالثة", "الرغبةُ الرابعة", "الرغبةُ الخامسة", "الرغبةُ السادسة"];

const PROVIDER: Record<string, string> = {
  email: "بريدٌ وكلمةُ مرور",
  google: "قوقل",
  apple: "أبل",
};

/** واقعةٌ لها فاعلٌ وتاريخ: تُجمَع بفاصلةٍ عربيّة (لا نقطةَ فاصلةً ولا شرطةً طويلة). */
function by(actor: string | null, when: string | null): string | null {
  if (!actor && !when) return null;
  if (!actor) return when;
  if (!when) return actor;
  return `${actor}، ${when}`;
}

const yesNo = (v: boolean | null | undefined): string | null =>
  v == null ? null : v ? "نعم" : "لا";

/**
 * **السجلُّ الكاملُ لمتطوّعٍ واحد** — كلُّ ما سجّلته القاعدةُ عنه في موضعٍ واحد (أمرُ المالك
 * ٢٠٢٦-٠٩-٢٤): هويّتُه وحسابُه وتطوّعُه ورغباتُه، وكلُّ طلبِ فرصةٍ بأسبابه وملاحظاته وتقييمه،
 * وشهاداتُه ولو مسحوبة، ثمّ أثرُه خارج التطوّع.
 *
 * وهيئتُه هيئةُ `ProfileBody` في تبويب الأعضاء لا شكلًا جديدًا: `Section` + `Cell` (ق٨)، فالخليّةُ
 * تنسخ وتعزل اللاتينيّ وتقول «غير متوفّر» وحدَها. والكرتُ الضيّقُ لا تُزاد عليه هذه الصفوف
 * (قرارٌ مكتوبٌ في `MemberCard`): يبقى ملخّصًا، ويُفتَح السجلُّ من زرّه.
 */
export function VolunteerRecord({ v }: { v: VolunteerRow }) {
  const providers = v.providers.length
    ? v.providers.map((p) => PROVIDER[p] ?? p).join("، ")
    : null;
  const trace = v.trace;
  const hasTrace = trace.reservations > 0 || trace.badges.length > 0 || trace.pageviews > 0;

  return (
    <>
      <div className="pvb-head">
        <div className="pvb-name">{v.name}</div>
        <div className="pvb-role">{v.status === "active" ? `تطوّع منذ ${v.appliedAt}` : "تطوّعٌ منتهٍ"}</div>
        <div className="pvb-badges">
          <Badge tone={v.status === "active" ? "success" : "neutral"} variant="soft" dot live={v.status === "active"}>
            {v.status === "active" ? "متطوّع" : "متطوّعٌ سابق"}
          </Badge>
        </div>
      </div>

      <div className="pva-sections">
        <Section icon={<IdentificationCard />} title="الهويّة">
          <Cell noCopy label="الجنس" icon={<User />} value={v.gender === "female" ? "أنثى" : v.gender === "male" ? "ذكر" : null} />
          <Cell label="المدينة" icon={<MapPin />} value={v.city} />
          {v.bio ? <Cell full wrap label="النبذة" icon={<ChatCircleText />} value={v.bio} /> : null}
          {v.publicSlug ? (
            <Cell full lat label="الملفّ العلنيّ" icon={<LinkIcon />} value={`/m/${v.publicSlug}`} href={`/m/${encodeURIComponent(v.publicSlug)}`} />
          ) : null}
        </Section>

        <Section icon={<AddressBook />} title="بيانات التواصل">
          <Cell full wrap lat label="البريد الإلكترونيّ" icon={<Envelope />} value={v.email} />
          <Cell full lat label="رقم الجوّال" icon={<Phone />} value={v.phone} />
        </Section>

        <Section icon={<ShieldCheck />} title="الحساب">
          <Cell noCopy label="حالةُ الحساب" icon={<ShieldCheck />} value={ACCOUNT_STATUS[v.accountStatus] ?? v.accountStatus} />
          <Cell full noCopy label="أُنشئ الحساب" icon={<CalendarBlank />} value={v.accountCreatedAt} />
          <Cell full noCopy label="آخرُ دخول" icon={<SignIn />} value={v.lastSignInAt ?? null} />
          <Cell noCopy label="بوّابةُ الدخول" icon={<Hash />} value={providers} />
          <Cell noCopy label="تأكيدُ البريد" icon={<EnvelopeOpen />} value={v.emailConfirmed ? "مؤكَّد" : "غيرُ مؤكَّد"} />
          <Cell noCopy label="رسائلُ النادي" icon={<Broadcast />} value={v.acceptsMarketing ? "يقبلها" : "لا يقبلها"} />
          {v.deletionRequestedAt ? (
            <>
              <Cell full noCopy label="طلبُ حذفِ الحساب" icon={<WarningCircle />} value={v.deletionRequestedAt} />
              <Cell full wrap label="سببُ الطلب" icon={<NotePencil />} value={v.deletionReason} />
            </>
          ) : null}
        </Section>

        <Section icon={<HandHeart />} title="التطوّع">
          <Cell full noCopy label="تطوّع في" icon={<CalendarCheck />} value={v.appliedStamp} />
          <Cell full noCopy label="آخرُ ترتيبٍ للرغبات" icon={<ClockCounterClockwise />} value={v.prefsUpdatedAt} />
          {v.prefs.length === 0 ? (
            <Cell full noCopy label="رغباتُه" icon={<ListNumbers />} value={null} />
          ) : (
            // خليّةٌ لكلّ رغبةٍ باسم رتبتها : سطرٌ واحدٌ يجمعها يُبتر بـ«…» فيخفي آخرَها
            v.prefs.map((pr, i) => (
              <Cell key={pr.id} label={ORDER[i] ?? `الرغبةُ ${i + 1}`} icon={<ListNumbers />} value={pr.name} />
            ))
          )}
        </Section>

        {v.apps.map((a) => (
          <Section key={a.id} icon={<Ticket />} title={`طلبُ فرصة: ${a.opportunity}`}>
            <Cell noCopy label="حالةُ الطلب" icon={<SealCheck />} value={APP_STATUS[a.status].label} />
            <Cell full noCopy label="قُدّم في" icon={<CalendarBlank />} value={a.appliedAt} />
            {a.committee ? <Cell label="لجنةُ الفرصة" icon={<UsersThree />} value={a.committee} /> : null}
            <Cell full noCopy label="القرارُ ومن اتّخذه" icon={<User />} value={by(a.decidedBy, a.decidedAt)} />
            {a.decisionReason ? <Cell full wrap label="سببُ القرار" icon={<NotePencil />} value={a.decisionReason} /> : null}
            <Cell noCopy label="الحضور" icon={a.attendance === "absent" ? <XCircle /> : <CheckCircle />}
              value={a.attendance === "attended" ? "حضر" : a.attendance === "absent" ? "غاب" : null} />
            <Cell full noCopy label="أشّر الحضورَ" icon={<User />} value={by(a.attendanceBy, a.attendanceAt)} />
            <Cell noCopy label="يستحقّ شهادة" icon={<Certificate />} value={yesNo(a.deservesCertificate)} />
            {a.denialReason ? <Cell full wrap label="سببُ منعِ الشهادة" icon={<Prohibit />} value={a.denialReason} /> : null}
            {/* ملاحظةٌ إداريّة : تُقرأ في هذه الغرفة وحدها ولا تخرج إلى `/me` */}
            {a.adminNote ? <Cell full wrap label="ملاحظةٌ إداريّة" icon={<NotePencil />} value={a.adminNote} /> : null}
            <Cell full noCopy label="التقييمُ ومن قيّم" icon={<Medal />} value={by(a.evaluatedBy, a.evaluatedAt)} />
          </Section>
        ))}

        {v.certs.map((c) => (
          <Section key={c.serial} end={c.status === "revoked"} icon={<Certificate />} title={`شهادةُ مشاركة: ${c.opportunity}`}>
            <Cell full lat label="الرقمُ التسلسليّ" icon={<Hash />} value={c.serial} />
            <Cell noCopy label="حالةُ الشهادة" icon={<SealCheck />} value={c.status === "revoked" ? "مسحوبة" : "سارية"} />
            <Cell full noCopy label="الاسمُ المطبوع" icon={<User />} value={c.holderName} />
            {c.committee ? <Cell label="اللجنة" icon={<UsersThree />} value={c.committee} /> : null}
            <Cell full noCopy label="مدّةُ الخدمة" icon={<CalendarBlank />} value={c.served} />
            <Cell full noCopy label="أصدرها" icon={<User />} value={by(c.issuedBy, c.issuedAt)} />
            {c.status === "revoked" ? (
              <>
                <Cell full noCopy label="سحبَها" icon={<Prohibit />} value={by(c.revokedBy, c.revokedAt)} />
                <Cell full wrap label="سببُ السحب" icon={<WarningCircle />} value={c.revokeReason} />
              </>
            ) : null}
          </Section>
        ))}

        {hasTrace ? (
          <Section icon={<Eye />} title="أثرُه في المنصّة">
            <Cell noCopy label="حجوزُ فعاليّات" icon={<Ticket />} value={trace.reservations ? String(trace.reservations) : null} />
            <Cell noCopy label="حضرَ منها" icon={<CheckCircle />} value={trace.reservations ? String(trace.reservedAttended) : null} />
            {trace.activities.length ? (
              <Cell full wrap noCopy label="الفعاليّات" icon={<CalendarCheck />} value={trace.activities.join("، ")} />
            ) : null}
            {trace.badges.length ? (
              <Cell full wrap noCopy label="الأوسمة" icon={<Medal />} value={trace.badges.map((b) => `${b.name} في ${b.earnedAt}`).join("، ")} />
            ) : null}
            <Cell noCopy label="زياراتُ الموقع" icon={<Eye />} value={trace.pageviews ? String(trace.pageviews) : null} />
            <Cell full noCopy label="آخرُ ظهور" icon={<ClockCounterClockwise />} value={trace.lastSeenAt} />
            <Cell full noCopy label="أجهزةٌ عُرف بها" icon={<DeviceMobile />} value={trace.devices ? String(trace.devices) : null} />
          </Section>
        ) : null}

        {v.status === "former" ? (
          <Section end icon={<CalendarX />} title="نهايةُ التطوّع">
            <Cell full noCopy label="انتهى في" icon={<CalendarX />} value={v.endedAt} />
            <Cell full noCopy label="من أنهاه" icon={<User />} value={v.endedBy} />
            <Cell full wrap label="السبب" icon={<WarningCircle />} value={v.endReason} />
          </Section>
        ) : null}
      </div>
    </>
  );
}

/** رأسُ النافذة : صورةٌ تعرف جنسَ صاحبها (أيقونتا الذكر والأنثى قبل الأحرف). */
export function VolunteerHero({ v }: { v: VolunteerRow }) {
  return (
    <Avatar
      name={v.name}
      src={v.avatarUrl ?? undefined}
      gender={v.gender}
      size="2xl"
      status={v.status === "active" ? "online" : "offline"}
      className="pvb-av"
    />
  );
}
