"use client";

/**
 * **«عضويتي»** على قالب «الحساب» (٢٠٢٦-١١-١٤) — صدرُ بوّابة العضو (قرار المالك ٢٠٢٦-١٠-١٣: يبقى «عضويتي» لا «الرئيسية»). السلوكُ
 * سلوكُ `dashboard/_membership/MembershipView.tsx` حرفًا: **من أنت الآن** (بطاقتُك)، ثمّ **إنذاراتي** لمن عليه إنذارٌ سارٍ بسببه كما كُتب
 * وعاقبتِه مقولةً قبل أن تقع، ثمّ **شهاداتي** تُنزَّل من لقطتها يومَ صدرت، ثمّ **مسيرتي** من الانضمام إلى المنصب القائم.
 *
 * والفرقُ في الشكل: البطاقةُ **كرتُ الشخص المعتمد** في جانب الغرفة (كرتُك في «حسابي»: وجهُك على حدّ الكعب، وعلى الجوّال يقود الغرفة
 * برأسها)، والأقسامُ أقسامُ «حسابي» وسطورُها — كانت بطاقةً بتدرّجٍ ولمعةٍ خاصّة (`.mcard-*`) وكروتًا وتنبيهاتٍ متراصّة وخطًّا زمنيًّا
 * بنقاطه (`.mjr-*`)، كلُّها من الهويّة القديمة.
 */
import { useState, type ReactNode } from "react";
import {
  Briefcase, CalendarBlank, CalendarCheck, Certificate as CertIcon, Compass, FilePdf, Fire, Flag, HourglassMedium, Medal, Megaphone, Path, Repeat, ShieldWarning,
  Signpost, Ticket,
} from "@phosphor-icons/react";
import { DownloadSimple, Prohibit, Star } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { categoryLabel, remainingText, toneOf, warningTitle } from "@/lib/warnings/vocab";
import { downloadCertificatePdf } from "@/lib/certificates/letter";
import { downloadWarningLetter } from "@/lib/warnings/letter";
import { fmtDateOnly } from "@/lib/dates";
import type { Membership } from "@/app/dashboard/_membership/data";
import { AdBadge, AdCard, type AdMeta, type AdTone } from "../primitives";
import { AccountRoom, AdCols, AdLine, AdRoomBand, AdSection } from "../account";

/** الحالُ صفةُ العضويّة لا صاحبِها («عضويّةٌ نشطة»)، فلا تُذكَّر على بطاقة امرأة — ونغمتُها نغمةُ شارتها القديمة */
const STATUS: Record<Membership["status"], { label: string; tone: AdTone }> = {
  active: { label: "عضويّة نشطة", tone: "ok" },
  suspended: { label: "عضويّة موقوفة", tone: "bad" },
  inactive: { label: "عضويّة غير نشطة", tone: "neutral" },
};

/**
 * كم عليك، كلامًا (محمد ٢٠٢٦-١١-١٤: «لماذا تُعرض بهذا الشكل؟ هل هي من الهويّة؟» — لا): كان رأسُ القسم نقاطًا مرسومةً بالحروف «●●○»
 * من الصفحة القديمة، لا قطعةَ لها في الهويّة. فصار يقول العددَ من الحدّ: «إنذاران من 3، بقي إنذارٌ واحد»
 */
const warningsHad = (n: number) => (n === 1 ? "إنذارٌ واحد" : n === 2 ? "إنذاران" : `${n} إنذارات`);

/** رمزُ الوسام باسمه في القاعدة (`badges.icon`) — وما لم يُعرف وسامٌ عامّ */
const BADGE_ICON: Record<string, ReactNode> = {
  CalendarCheck: <CalendarCheck />, Compass: <Compass />, Megaphone: <Megaphone />, Ticket: <Ticket />, Repeat: <Repeat />, Fire: <Fire />,
};
/** **الوسامُ بجنس صاحبته** (قاعدةُ المسمّيات بالجنس): أسماءُ الأوسمة في القاعدة مذكّرة، فتُؤنَّث هنا عرضًا — و«سنةٌ في أدِيب» لا جنسَ له */
const BADGE_FEMININE: Record<string, string> = {
  unit_leader: "قائدةُ وحدة", election_nominee: "مرشَّحة", attendee_first: "حاضرةٌ أولى", attendee_three: "مواظِبة", attendee_five: "ملازِمة",
};

export function MembershipRoom({ membership: m }: { membership: Membership }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const st = STATUS[m.status];

  /** الورقةُ تُرسَم من **لقطتها** لا من حال صاحبها اليوم — فما نزّله أوّل مرّةٍ هو ما ينزّله الآن */
  const download = async (c: Membership["certificates"][number]) => {
    if (busy) return;
    setBusy(c.id);
    try {
      await downloadCertificatePdf({ name: c.holderName, position: c.positionTitle, gender: m.gender, from: c.periodFrom, to: c.periodTo, serial: c.serial });
      toast.success("نُزّلت الشهادة.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد الشهادة.");
    } finally {
      setBusy(null);
    }
  };

  /** خطابُ الإنذار كما رسمته الموارد البشريّة: لقطةُ منصبه ولجنته يومَ الإصدار، ورتبتُه وعددُ سواريه اليوم (البوّابةُ هي الحقّ) */
  const letter = async (w: Membership["warnings"][number]) => {
    if (busy) return;
    setBusy(w.id);
    try {
      await downloadWarningLetter({
        name: m.name, gender: m.gender, role: w.roleAr, committee: w.committee, ordinal: w.ordinal, category: w.category, reason: w.reason,
        issuedAt: w.issuedAt, activeCount: m.warnings.length, limit: m.warningLimit,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد الخطاب.");
    } finally {
      setBusy(null);
    }
  };
  const spin = (id: string, icon: ReactNode) => (busy === id ? <span className="ad-spin" aria-hidden /> : icon);

  const meta: AdMeta[] = [
    // الرتبةُ بجنس صاحبها («قائدة لجنة التصميم») — كانت تُقال مذكّرةً على بطاقة المرأة
    { icon: <Briefcase />, text: m.role ?? "لا منصب حاليّ", tone: m.role ? undefined : "muted" },
    { icon: <CalendarBlank />, text: m.joined ? `عضوٌ منذ ${m.joined}` : "تاريخُ الانضمام غير مسجّل", tone: m.joined ? undefined : "muted" },
    ...(m.duration ? [{ icon: <HourglassMedium />, text: `${m.duration} في أدِيب` }] : []),
  ];

  /* ── بطاقتُك: كرتُ الشخص المعتمد (كرتُك في «حسابي») ── */
  const card = (
    <AdCard
      seed={m.name || "me"}
      face={{ name: m.name, src: m.avatar, gender: m.gender }}
      title={m.name || "عضو أدِيب"}
      chips={<AdBadge tone={st.tone}>{st.label}</AdBadge>}
      meta={meta}
      band={<AdRoomBand navPath="/dashboard" title="عضويتي" />}
    />
  );

  const limit = m.warningLimit;
  /* ── مسيرتي: تحت البطاقة (من أنت، وكيف وصلت)، وفي الجوّال آخرَ الغرفة ── */
  const journey = (
    <AdSection icon={<Path />} title="مسيرتي في أدِيب" sub="انضمامك وما تلاه من مناصب">
      {m.journey.length ? m.journey.map((s) => (
        <AdLine key={s.key} icon={s.kind === "join" ? <Flag /> : <Star />} k={s.date} v={s.title}
          sub={s.current ? (s.scope ? `حاليّ، ${s.scope}` : "حاليّ") : s.scope ?? undefined}
          tone={s.current ? "ok" : undefined} toneAt="sub" />
      )) : (
        <AdLine icon={<Signpost />} v="لا محطّات بعد" sub="لم يُسجَّل لك تاريخ انضمامٍ ولا تعيينٌ في منصب." tone="muted" toneAt="sub" />
      )}
    </AdSection>
  );

  return (
    <AccountRoom navPath="/dashboard" title="عضويتي">
      <AdCols top sticky aside={card} asideEnd={journey}>
        {/* إنذاراتي — لا تظهر إلّا لمن عليه إنذارٌ سارٍ. والشفافيّةُ قرارُ المالك: يرى السببَ كما كُتب، فلا يبقى يسأل «كم عليّ؟» —
            والعاقبةُ مقولةٌ صراحةً قبل أن تقع. ونغمةُ كلٍّ من قربه من الحدّ (`toneOf`، المصدرُ الواحد): البالغُ الحدَّ بالخطر */}
        {m.warnings.length || m.cancelled.length ? (
          <AdSection icon={<ShieldWarning />} title="إنذاراتي" sub={m.warnings.length ? `${warningsHad(m.warnings.length)} من ${limit}` : "لا إنذارَ ساريًا عليك"}
            steps={{ now: m.warnings.length, max: limit, tone: toneOf(m.warnings.length, limit) === "danger" ? "bad" : "warn", label: remainingText(m.warnings.length, limit) }}>
            {/* ما يطّلع عليه بنصّ نظام الانضباط (م١٢): مُصدرُه، وتاريخُ الواقعة (م٧)، وخطابُه يُنزَّل كما وصله */}
            {m.warnings.map((w) => (
              <AdLine key={w.id} icon={<ShieldWarning />} k={`${warningTitle(w.ordinal)}، ${w.date}${w.issuer ? `، بإصدار ${w.issuer}` : ""}`}
                v={categoryLabel(w.category)} sub={w.occurred ? `الواقعة ${w.occurred}: ${w.reason}` : w.reason}
                tone={toneOf(w.ordinal, limit) === "danger" ? "bad" : "warn"} toneAt="sub" disabled={busy !== null && busy !== w.id}
                act={{ icon: spin(w.id, <DownloadSimple />), text: "الخطاب", label: "نزّل خطابه" }} onClick={() => void letter(w)} />
            ))}
            {/* والملغى يبقى مشطوبًا في سجلّه ويخرج من العدّ (م١٥)، بمن ألغاه وسببه (م١٢) — خافتًا تحت السارية */}
            {m.cancelled.map((w) => (
              <AdLine key={w.id} icon={<Prohibit />} k={`صدر في ${w.date}، أُلغي في ${w.cancelledOn}${w.canceller ? ` بقرار ${w.canceller}` : ""}، لا يُحسب عليك`}
                v={categoryLabel(w.category)} sub={w.cancelReason ? `${w.reason}. سببُ الإلغاء: ${w.cancelReason}` : w.reason} tone="muted" toneAt="sub" />
            ))}
          </AdSection>
        ) : null}

        {/* شهاداتي — يُنزّلها صاحبُها متى شاء بلا مراجعة أحد، وكلُّ ورقةٍ من لقطتها يومَ صدرت. والصورةُ وفتحُ الورقة ورابطُ التحقّق
            في غرفة «شهاداتي» (تذكرةُ ورقتها)، فهنا الورقةُ الرسميّة وحدها */}
        {m.certificates.length ? (
          <AdSection icon={<CertIcon />} title="شهاداتي" sub="شهادات الخبرة الصادرة لك، نزّلها متى احتجتها"
            more={{ label: "افتحها في «شهاداتي»", href: "/dashboard/certificates" }}>
            {m.certificates.map((c) => (
              <AdLine key={c.id} icon={<CertIcon />} k={c.serial} v={c.positionTitle}
                sub={`من ${fmtDateOnly(c.periodFrom)} إلى ${fmtDateOnly(c.periodTo)}، صدرت في ${c.date}`} disabled={busy !== null && busy !== c.id}
                // «الفعلُ يجري»: يدور زرُّه حتى تنزل الورقة (كان `Button loading`)، ويُمسَك إخوتُه
                act={{ icon: spin(c.id, <FilePdf />), text: "PDF", label: "نزّلها PDF" }} onClick={() => void download(c)} />
            ))}
          </AdSection>
        ) : null}

        {/* أوسمتي — تُحسب حيّةً بقواعدها (`badge_awards()`)، والمقفلُ خافتًا بطريقه وما بلغه منه: شيءٌ يُسعى إليه */}
        {m.badges.length ? (
          <AdSection icon={<Medal />} title="أوسمتي" sub={`${m.badges.filter((b) => b.earnedOn).length} من ${m.badges.length}، تُنال بما تفعل في أدِيب`}>
            {m.badges.map((b) => (
              <AdLine key={b.key} icon={BADGE_ICON[b.icon] ?? <Medal />} v={m.gender === "female" ? BADGE_FEMININE[b.key] ?? b.name : b.name}
                k={b.earnedOn ? `منذ ${b.earnedOn}` : "لم يُنَل بعد"} sub={b.earnedOn ? undefined : b.progress ? `${b.how}، ${b.progress}` : b.how}
                tone={b.earnedOn ? "ok" : "muted"} toneAt="sub" />
            ))}
          </AdSection>
        ) : null}
      </AdCols>
    </AccountRoom>
  );
}
