"use client";

/**
 * غرفةُ «تطوّعي» على قالب «الحساب» (اعتمدها محمد ٢٠٢٦-١١-٠٤/٠٥) — السلوكُ سلوكُ `dashboard/_portal/VolunteerRoom.tsx` المعتمد حرفًا:
 * مشاركاتُه الجارية (سحبُ الطلب قبل مراجعته بـ`withdraw_my_application`، والاعتذارُ بعد قبوله بسببٍ مطلوب بـ`excuse_my_application`)، والفرصُ
 * المفتوحة وما يناسب رغباته أوّلًا، ورغباتُه و«تعديلها» إلى `/join`، و«رحلتك» (الساعاتُ، ومشاركاتُه وتميّزُه وشهاداتُه)، و«سجلّك».
 *
 * والفرقُ في الشكل، على قاعدة «حجوزاتي» المعتمدة: **مشاركاتُك والفرصُ وسجلُّك مواضعُ في المبدّل، وكلُّ واحدةٍ تذكرة** — كعبُها يومُ
 * موعدها (والمرنةُ لانهاية)، وشارتُها حالُها، وفعلُها «افتح الفرصة» (وفي سجلّك «شهادتك» لمن صدرت شهادتُه). و**كلٌّ في موضع معناه**:
 * «رحلتك» كروتُ الرقم (`AdStats`) رأسَ «سجلّك» لأنّها مجموعُه، و«رغباتك» تنبيهٌ رأسَ «فرصٌ مفتوحة» لأنّها تخصّ الفرص — فلا عمودَ ضيّقًا.
 * (رُدّ قبله: «رحلتك» لوحًا كاملًا، وورقةً، وبالكلمة الخلفيّة، وسطرَ محطّات، وأعمدةَ أشهر — الأشهرُ لا تتّسع لمتطوّعٍ منذ سنتين —
 * وقسمًا بسطور «حسابي»، وتذكرةً في العمود الضيّق: على الجوّال نزلت تحت المشاركات «فلا تُفهم، لأنّها تشابهها».)
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Modal, Textarea } from "@adeeb/design-system";
import {
  Buildings, CalendarBlank, CalendarCheck, Certificate, ChatText, Clock, ClockCounterClockwise, HandHeart, Heart, Hourglass, Infinity as Endless,
  MapPin, Path, UsersThree,
} from "@phosphor-icons/react";
import { CheckCircle, PencilSimple, Prohibit, Question, Star, XCircle } from "@/app/_components/glyphs";
import { arCounted, type ArForms } from "@/lib/arabicCount";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { rpcError } from "@/app/dashboard/_portal/volunteerRpc";
import type { HistIcon, UpIcon, VolunteerView } from "@/app/dashboard/_portal/volunteer";
import { AdActs, AdBadge, AdButton, AdCard, AdNote, AdSwitch, type AdMeta, type AdStub, type AdTone } from "../primitives";
import { AccountRoom, AdCols, AdSection, AdStats } from "../account";
import { dayParts, fmtNum } from "../format";

/** المعدودُ تحت رقمه في كروت الرقم (`arCounted`) */
const AR_HOURS: ArForms = ["ساعة تطوّع", "ساعتا تطوّع", "ساعات تطوّع", "ساعة تطوّع"];
const AR_JOINED: ArForms = ["مشاركة", "مشاركتان", "مشاركات", "مشاركةً"];
const AR_CERTS: ArForms = ["شهادة", "شهادتان", "شهادات", "شهادةً"];

type Up = VolunteerView["upcoming"][number];
type Hist = VolunteerView["history"][number];
type Opp = VolunteerView["opps"][number];

const UP: Record<UpIcon, { tone: AdTone; icon: React.ReactNode }> = {
  accepted: { tone: "ok", icon: <CalendarCheck /> },
  pending: { tone: "warn", icon: <Hourglass /> },
  ended: { tone: "neutral", icon: <ClockCounterClockwise /> },
};
const HIST: Record<HistIcon, { tone: AdTone; icon: React.ReactNode }> = {
  attended: { tone: "ok", icon: <CheckCircle /> },
  star: { tone: "ok", icon: <Star /> },
  absent: { tone: "bad", icon: <XCircle /> },
  off: { tone: "neutral", icon: <Prohibit /> },
};

/** الكعب: يومُ الموعد وشهرُه، والمرنةُ لانهايةٌ لا تقويم (كعبُ الفرصة في غرفة الإدارة)، وما لا يومَ له قماشُه وحده. */
const stubOf = (day: string | null | undefined, flexible?: boolean): AdStub | undefined => {
  if (flexible) return { big: "", icon: <Endless />, small: "مرنة" };
  if (!day) return undefined;
  const d = dayParts(`${day}T12:00:00`);
  return { big: d.day, small: d.month };
};

type Pos = "up" | "opps" | "hist";

export function MyVolunteerRoom({ view }: { view: VolunteerView }) {
  const router = useRouter();
  const toast = useToast();
  const [sb] = useState(() => createClient());
  const [pos, setPos] = useState<Pos>(view.upcoming.length ? "up" : "opps");
  const [target, setTarget] = useState<{ id: string; title: string; act: "withdraw" | "excuse" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const close = () => { if (!busy) { setTarget(null); setReason(""); setErr(null); } };
  const confirm = async () => {
    if (!target) return;
    if (target.act === "excuse" && !reason.trim()) { setErr("اكتب سببَ اعتذارك."); return; }
    setErr(null);
    setBusy(true);
    const { error } = target.act === "withdraw"
      ? await sb.rpc("withdraw_my_application", { p_id: target.id })
      : await sb.rpc("excuse_my_application", { p_id: target.id, p_reason: reason.trim() });
    setBusy(false);
    if (error) { setErr(rpcError(error.message)); return; }
    toast.success(target.act === "withdraw" ? "سُحب طلبك." : "وصل اعتذارُك إلى مسؤول الفرصة.");
    setTarget(null);
    setReason("");
    router.refresh();
  };

  /* ── التذاكر ── */
  const oppHref = (id: string) => `/dashboard/volunteer/${id}`;
  const upTicket = (u: Up) => {
    const st = UP[u.icon];
    return (
      <AdCard
        key={u.id} seed={u.oppId} stub={stubOf(u.day, u.flexible)}
        chips={<AdBadge tone={st.tone} icon={st.icon}>{u.say}</AdBadge>}
        title={u.title} href={oppHref(u.oppId)}
        meta={[{ icon: <CalendarBlank />, text: u.when }]}
        foot={
          <AdActs
            primary={{ label: "افتح الفرصة", icon: <HandHeart />, href: oppHref(u.oppId) }}
            ops={u.act ? [{
              key: u.act, label: u.act === "withdraw" ? "سحب الطلب" : "الاعتذار عن المشاركة", icon: <XCircle />, danger: true,
              onClick: () => setTarget({ id: u.id, title: u.title, act: u.act! }),
            }] : []}
          />
        }
      />
    );
  };
  const oppTicket = (o: Opp) => {
    const meta: AdMeta[] = [
      ...(o.dateLabel ? [{ icon: <CalendarBlank />, text: o.timeLabel ? `${o.dateLabel}، ${o.timeLabel}` : o.dateLabel }] : []),
      ...(o.location ? [{ icon: <MapPin />, text: o.location }] : []),
      ...(o.seatsLabel ? [{ icon: <UsersThree />, text: o.seatsLabel, tone: o.seatsLabel === "اكتمل العدد" ? "warn" as const : undefined }] : []),
    ];
    return (
      <AdCard
        key={o.id} seed={o.id} stub={stubOf(o.startsOn, o.flexible)}
        chips={<>
          {o.committee ? <AdBadge icon={<Buildings />}>{o.committee}</AdBadge> : null}
          {o.fit ? <AdBadge tone="info" icon={<HandHeart />}>من رغباتك</AdBadge> : null}
        </>}
        title={o.title} href={oppHref(o.id)} meta={meta}
        foot={<AdActs primary={{ label: "افتح الفرصة", icon: <HandHeart />, href: oppHref(o.id) }} ops={[]} />}
      />
    );
  };
  const histTicket = (h: Hist) => {
    const st = HIST[h.icon];
    return (
      <AdCard
        key={h.id} seed={h.oppId ?? h.id} stub={stubOf(h.day, h.flexible)}
        chips={<AdBadge tone={st.tone} icon={st.icon}>{h.out.split("، ")[0]}</AdBadge>}
        title={h.title} href={h.oppId ? oppHref(h.oppId) : undefined}
        // ما بعد النتيجة سطورٌ برموزها: الساعاتُ بساعتها، والحجبُ بسببه خافتًا
        meta={h.out.split("، ").slice(1).map((t) => (/ساع/.test(t)
          ? { icon: <Clock />, text: t }
          : { icon: <Prohibit />, text: t, tone: "muted" as const }))}
        foot={
          h.cert
            ? <AdActs primary={{ label: "شهادتك", icon: <Certificate />, href: "/dashboard/certificates" }} ops={h.oppId ? [{ key: "opp", label: "افتح الفرصة", icon: <HandHeart />, href: oppHref(h.oppId) }] : []} />
            : <AdActs primary={{ label: "افتح الفرصة", icon: <HandHeart />, href: oppHref(h.oppId ?? "") }} ops={[]} />
        }
      />
    );
  };

  /* ── رحلتك ورغباتك ── */
  const { trip } = view;
  const prefsText = view.prefs.join("، ");

  const positions = [
    { key: "up", label: "مشاركاتك", count: view.upcoming.length },
    { key: "opps", label: "فرصٌ مفتوحة", count: view.opps.length },
    ...(view.history.length ? [{ key: "hist", label: "سجلّك", count: view.history.length }] : []),
  ];

  // **كلٌّ في موضع معناه** (محمد ٢٠٢٦-١١-٠٤: «هل رحلتك تستحقّ أن تكون في مبدّل؟»): «رحلتك» مجموعُ «سجلّك» فهي رأسُه فوق التذاكر التي
  // تلخّصها، و«رغباتك» تخصّ الفرص فهي رأسُ «فرصٌ مفتوحة» (مكانُها في التصميم المعتمد ٢٠٢٦-١٠-١٣). فلا عمودَ ضيّقًا في الغرفة —
  // كحجوزاتي وشهاداتي — ولا ملخّصَ تحت التذاكر في الجوّال يُحسب مشاركة. وبلا سجلٍّ لا موضعَ له، فلا ملخّصَ فارغ.
  const journey = (
    <AdStats
      icon={<Path />} title="رحلتك"
      hero={{ value: fmtNum(trip.hours), label: arCounted(trip.hours, AR_HOURS), notes: [trip.nowNote, view.since].filter((x): x is string => !!x) }}
      items={[
        { icon: <HandHeart />, value: fmtNum(trip.joined), label: arCounted(trip.joined, AR_JOINED) },
        { icon: <Star />, value: fmtNum(trip.stars), label: "بتميّز" },
        { icon: <Certificate />, value: fmtNum(trip.certs), label: arCounted(trip.certs, AR_CERTS) },
      ]}
    />
  );
  // «رغباتك» **تنبيهُ القائمة** (`AdNote` الإعلاميّ): الحقيقةُ وسببُ وجودها هنا — ما يوافقها يأتي أوّلًا — وفعلُها صندوقًا بختمه.
  // (كانت كرتًا مستحدَثًا بقلمٍ من اللوح، ثمّ تنبيهًا قديمًا «عاديًّا جدًّا»، حتى حُسم التنبيه ٢٠٢٦-١١-٠٥)
  const wishes = view.prefs.length ? (
    <AdNote tone="info" icon={<Heart />} label="رغباتك" title={prefsText} action={<AdButton href="/join/apply" size="sm" icon={<PencilSimple />}>تعديل رغباتك</AdButton>}>
      ما يوافقها من الفرص يأتي أوّلًا.
    </AdNote>
  ) : (
    // بلا ضميرٍ مؤنّثٍ أو مذكّر: الغرفةُ لا تعرف هنا جنسَ صاحبها، و«حدّدْ» تخطئ المتطوّعة
    <AdNote tone="info" icon={<Heart />} label="رغباتك" title="غير محدّدة بعد." action={<AdButton href="/join/apply" size="sm" icon={<PencilSimple />}>تحديد رغباتك</AdButton>}>
      بها نقدّم لك ما يوافقها من الفرص أوّلًا.
    </AdNote>
  );

  let body: React.ReactNode;
  if (pos === "hist" && view.history.length) {
    const grid = <div className="ad-grid">{view.history.map(histTicket)}</div>;
    body = <div className="ad-acc-group">{journey}{grid}</div>;
  } else if (pos === "opps") {
    const list = view.opps.length ? <div className="ad-grid">{view.opps.map(oppTicket)}</div> : (
      <AdSection icon={<HandHeart />} title="لا فرصةَ مفتوحةً الآن" sub="نُعلن الجديدَ في إشعاراتك وفي قروب المتطوّعين" />
    );
    body = <div className="ad-acc-group">{wishes}{list}</div>;
  } else {
    body = view.upcoming.length ? <div className="ad-grid">{view.upcoming.map(upTicket)}</div> : (
      <AdSection icon={<HandHeart />} title="لا مشاركةَ جاريةً لك" sub="اختر من الفرص المفتوحة ما يناسبك" />
    );
  }

  return (
    <AccountRoom
      navPath="/dashboard/volunteer"
      title="تطوّعي"
      head={<AdSwitch positions={positions} position={pos} onPosition={(k) => setPos(k as Pos)} />}
    >
      <AdCols>{body}</AdCols>

      {/* السحبُ والاعتذارُ نافذةُ القديمة حرفًا: الاعتذارُ بسببٍ يقرؤه مسؤول الفرصة */}
      <Modal open={target !== null} onClose={close} busy={busy} size="sm" className="mdl-tone-danger"
        title={target?.act === "withdraw" ? "سحب الطلب" : "الاعتذار عن المشاركة"}
        footer={<>
          <Button variant="danger" size="sm" loading={busy} onClick={confirm}>{target?.act === "withdraw" ? "اسحب الطلب" : "أرسل اعتذاري"}</Button>
          <Button variant="ghost" size="sm" onClick={close} disabled={busy}>تراجع</Button>
        </>}>
        <p>
          {target?.act === "withdraw"
            ? `يُسحب طلبك على «${target?.title}» قبل مراجعته، ولك أن تقدّم ثانيةً ما دامت مفتوحة.`
            : `يصل اعتذارُك عن «${target?.title}» إلى مسؤول الفرصة، ويُخلى مكانُك لغيرك.`}
        </p>
        {/* النافذةُ بتنبيهها القديم حتى نبلغ قالبَ النوافذ: تنبيهُ الهويّة ورقةٌ تُوضع على الصفحة، وفي النافذة ورقةٌ فوق ورقة (محمد ٢٠٢٦-١١-٠٥: «غريب») */}
        {err ? <Alert tone="danger">{err}</Alert> : null}
        {target?.act === "excuse"
          ? <Textarea label="سبب الاعتذار" icon={<ChatText />} innerIcon={<Question />} placeholder="سطرٌ يقرؤه مسؤول الفرصة" rows={2}
              value={reason} onChange={(e) => setReason(e.target.value)} required />
          : null}
      </Modal>
    </AccountRoom>
  );
}
