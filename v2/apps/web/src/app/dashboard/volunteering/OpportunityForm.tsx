"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Select, Textarea } from "@adeeb/design-system";
import { Buildings, CalendarBlank, ChatText, Clock, FloppyDisk, Flag, GenderIntersex, Handshake, Hash, HourglassMedium, Infinity as Endless, MapPin, Megaphone, TextT, UsersThree } from "@phosphor-icons/react";
import { PencilSimple, Plus } from "@/app/_components/glyphs";
import { clubNow, periodStarted, sortPeriods, type ClubNow } from "@/lib/volunteerPeriods";
import { useToast } from "../_components/ToastProvider";
import { saveOpportunity, type OppInput } from "./actions";
import type { OppRow } from "./data";
import { AdBadge, AdButton, AdCard, type AdMeta } from "@/app/_ad/primitives";
import { dayParts, fmtDayFull } from "@/app/_ad/format";
import { arCount } from "@/lib/arabicCount";
import { FormChoice, FormRepeatItem, FormRoom, FormSection } from "@/app/_ad/form";

const GENDER_OPTS = [
  { value: "", label: "الجميع" },
  { value: "male", label: "الرجال" },
  { value: "female", label: "النساء" },
];

/**
 * **فترةٌ في النموذج**: يومٌ وساعتان وعدد، والعددُ نصُّ الحقل كما كُتب (فارغٌ = بلا سقف).
 * و`key` هويّتُها في القائمة وإن لم تُحفظ بعد، و`id` للمحفوظة.
 */
type PeriodDraft = { key: number; id?: string; day: string; from: string; to: string; seats: string };

/**
 * **هويّةُ الفترة الجديدة من القائمة نفسِها** (أكبرُ هويّةٍ فيها + ١) لا من عدّادٍ في الوحدة: العدّادُ يُصفَّر
 * كلّما أُعيد تحميلُ الوحدة والقائمةُ باقية، فولدت فترتان بهويّةٍ واحدة (رُصد ٢٠٢٦-١٠-٠٢: `p1` مكرّرة).
 */
const nextKey = (ps: PeriodDraft[]) => ps.reduce((m, p) => Math.max(m, p.key), 0) + 1;
const draftPeriod = (key: number, day = "", seats = ""): PeriodDraft => ({ key, day, from: "", to: "", seats });
/**
 * **حقلُ العدد** (عينُ المالك ٢٠٢٦-١٠-٠٢: «لماذا الحقلُ يقبل صفرًا؟ … أضف جملة: اتركه لجعل العدد مفتوحًا»):
 * نصٌّ بلوحة أرقامٍ لا `number`، فلا أسهمَ تنزل به إلى الصفر وما دونه، والصفرُ في أوّله يُمحى حين يُكتب
 * (فلا يُكتب ٠ ولا ٠٥). والفارغُ عددٌ مفتوح، تقوله جملةٌ تحت الحقل لا الكلمةُ الباهتة وحدَها: كانت تُقرأ قيمةً
 * أو حالَ التقديم. والفعلُ يردّ ما دون الواحد أيضًا (`periodSchema`) فلا يُعتمد على الحقل وحدَه.
 */
const SEATS_INPUT = {
  type: "text", inputMode: "numeric", charset: "digits", maxLength: 4,
  placeholder: "مفتوح", helper: "اتركه لجعل العدد مفتوحًا",
} as const;
const seatsText = (v: string) => v.replace(/^0+/, "");

/** فترةٌ لم يُكتب فيها شيءٌ لا تُرسل: المسوّدةُ تُحفظ بلا موعد، والنشرُ يطلب فترةً مكتوبة. */
const isBlank = (p: PeriodDraft) => !p.day && !p.from && !p.to && !p.seats.trim();

/**
 * **صفحةُ الفرصة: إنشاءً وتحريرًا** (أمرُ المالك ٢٠٢٦-١٠-٠١: «هل نحن بحاجةٍ أن تكون صفحة؟»).
 *
 * كانت نافذةً فوق الكشف، فلمّا صار الموعدُ فتراتٍ تطول بعددها (أربعةُ حقولٍ لكلّ فترة) صارت النافذةُ
 * عمودًا يُمرَّر، وإغلاقُها خطأً يُضيّع ما كُتب. فصارت صفحةً على سابقة نموذج الفعاليّة (`EventForm`):
 * قسمٌ لتفاصيلها وقسمٌ لفتراتها، على قالب صفحة النموذج (`_ad/form.tsx`، ٢٠٢٦-١١-٠٧). وللإنشاء فعلان: النشرُ أساسٌ
 * والمسوّدةُ جانبًا (أمرُه في اليوم نفسه)، وللتحرير حفظٌ وحدَه.
 *
 * **والفتراتُ صفوف**: على العريض كلُّ فترةٍ سطرٌ واحد (شارتُها · اليوم · من · إلى · العدد · حذف) وأسماءُ
 * الحقول فوق أوّلها وحدَه، وعلى ما دونه تنزل حقولُها صفوفًا (هيئاتُها الثلاث في `.vpd`).
 * وشارتُها «الفترة» ورقمُها معًا في رقعةٍ بلون الهويّة (عينُ المالك ٢٠٢٦-١٠-٠٢: كان الرقمُ وحدَه معلّقًا جنبَ الحقل).
 */
export function OpportunityForm({ opp, committees, now: nowAtLoad }: {
  opp?: OppRow | null;
  committees: { id: number; name: string }[];
  /** «الآن» بساعة النادي من الخادم: لو حُسب هنا لاختلف بين رسم الخادم والمتصفّح عند حدّ الدقيقة. */
  now: ClubNow;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, startSave] = useTransition();
  const editing = opp != null;

  const [title, setTitle] = useState(opp?.title ?? "");
  const [description, setDescription] = useState(opp?.description ?? "");
  const [location, setLocation] = useState(opp?.location ?? "");
  const [committeeId, setCommitteeId] = useState(opp?.committeeId ? String(opp.committeeId) : "");
  const [gender, setGender] = useState<string>(opp?.targetGender ?? "");
  // **الموعدُ بابان** (٢٠٢٦-١٠-٠١): فتراتٌ لها أيّامٌ وساعات، أو مرنةٌ بلا يومٍ ولا ساعة (عددُها وآخرُ يومٍ اختياريّ)
  const [flexible, setFlexible] = useState(opp?.flexible ?? false);
  const [seats, setSeats] = useState(opp?.flexible && opp.seats != null ? String(opp.seats) : "");
  const [deadline, setDeadline] = useState(opp?.flexible ? (opp.endsOn ?? "") : "");
  const [periods, setPeriods] = useState<PeriodDraft[]>(() => {
    if (!opp) return [draftPeriod(1)];
    const saved = sortPeriods(opp.periods).map((p, i) => ({
      key: i + 1, id: p.id, day: p.day, from: p.from, to: p.to, seats: p.seats == null ? "" : String(p.seats),
    }));
    // فرصةٌ قبل الفترات بلا طلبات: تُفتح بفترةٍ فارغةٍ تُملأ فتحلّ محلَّ موعدها القديم
    return saved.length ? saved : opp.legacy ? [] : [draftPeriod(1)];
  });

  // فرصةٌ قبل الفترات: موعدُها القديمُ يُقال فوق الفترات، و`locked` إن كانت عليها طلباتٌ للفرصة كلِّها
  const old = opp && !opp.flexible ? [opp.dateLabel, opp.timeLabel].filter(Boolean).join("، ") : "";
  const legacy = opp && opp.periods.length === 0 && old ? { text: old, locked: opp.legacy } : null;

  /**
   * **لا موعدَ في الماضي** (أمرُ المالك ٢٠٢٦-١٠-٠٢): الفترةُ الجديدةُ أو التي غُيّر يومُها أو ساعةُ بدئها لا تبدأ قبل
   * الآن، فيُمنع ما مضى في المنتقي (`min`) ويُقال تحت حقله إن كُتب. وما بقي على حاله من المحفوظ يُترك ولو مضى
   * (فترةٌ مضت وعليها حضور). والفعلُ يفحص الأمرَ نفسَه بساعة الحفظ (`pastProblem`)، و«الآن» هنا يتجدّد عند الحفظ.
   */
  const [now, setNow] = useState(nowAtLoad);
  const was = new Map((opp?.periods ?? []).map((p) => [p.id, p]));
  const touched = (p: PeriodDraft) => {
    const o = p.id ? was.get(p.id) : undefined;
    return !o || o.day !== p.day || o.from.slice(0, 5) !== p.from.slice(0, 5);
  };
  const dayPast = (p: PeriodDraft, at = now) => touched(p) && !!p.day && p.day < at.day;
  const hourPast = (p: PeriodDraft, at = now) => touched(p) && p.day === at.day && periodStarted(p, at);
  const wasDeadline = opp?.flexible ? (opp.endsOn ?? "") : "";
  const deadlinePast = (at = now) => !!deadline && deadline !== wasDeadline && deadline < at.day;
  /** أوّلُ موعدٍ مضى، برسالة الفعل نفسِها (فلا يُرسَل ما يُعرف ردُّه). */
  const pastNote = (at: ClubNow): string | null => {
    if (flexible) return deadlinePast(at) ? "آخرُ موعدٍ للإنجاز مضى. اختر يومًا قادمًا، أو اتركه فارغًا." : null;
    for (const [i, p] of periods.entries()) {
      if (dayPast(p, at)) return `يومُ الفترة ${i + 1} مضى. اختر يومًا قادمًا.`;
      if (hourPast(p, at)) return `ساعةُ بدء الفترة ${i + 1} مضت. اختر ساعةً قادمة.`;
    }
    return null;
  };

  /** «إلى» قبل «من» فترةٌ تعبر منتصفَ الليل: تُقال تحت حقلها، فمن كتب 9 يريد 21 يرى أنّها صارت ثلاثًا وعشرين ساعة. */
  const overnight = (p: PeriodDraft) => !!p.from && !!p.to && p.to.slice(0, 5) < p.from.slice(0, 5);

  const setPeriod = (key: number, patch: Partial<PeriodDraft>) =>
    setPeriods((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  // الفترةُ الجديدةُ ترث يومَ سابقتها وعددَها: أكثرُ الفترات في اليوم نفسِه بالعدد نفسِه، والساعتان تُكتبان
  const addPeriod = () => setPeriods((ps) => [...ps, draftPeriod(nextKey(ps), ps.at(-1)?.day ?? "", ps.at(-1)?.seats ?? "")]);
  const removePeriod = (key: number) => setPeriods((ps) => ps.filter((p) => p.key !== key));

  const toInput = (): OppInput => ({
    title, description, location,
    committeeId: committeeId ? Number(committeeId) : undefined,
    targetGender: gender === "male" || gender === "female" ? gender : undefined,
    ...(flexible
      ? { flexible: true, periods: [], seats: seats.trim(), endsOn: deadline }
      : {
          flexible: false,
          periods: periods.filter((p) => !isBlank(p))
            .map((p) => ({ id: p.id, day: p.day, from: p.from, to: p.to, seats: p.seats.trim() })),
        }),
  });

  // **أثمّة ما يُحفَظ؟** — لقطةُ ما يُرسَل تُقارَن بأصلها المجمَّد (سابقةُ `EventForm`): التحريرُ لا يُحفظ قبل أوّل تغيير، وفي الضيّق يلحقك الفعلُ
  const snapshot = JSON.stringify(toInput());
  const [origin] = useState(snapshot);
  const dirty = snapshot !== origin;

  const save = (publish = false) => {
    const at = clubNow();
    setNow(at);
    const past = pastNote(at);
    if (past) { toast.error(past); return; }
    startSave(async () => {
      const r = await saveOpportunity(toInput(), opp?.id, publish);
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      router.push(editing ? `/dashboard/volunteering/${opp.id}` : "/dashboard/volunteering");
      router.refresh();
    });
  };

  /* التذكرةُ كما ستظهر في غرفة التطوّع (`_ad/rooms/VolunteeringRoom`): الكعبُ يومُ أوّل فترة (أو «مرنة»)، والسطورُ الأربعة بصيغها */
  const firstDay = [...periods].filter((p) => p.day).sort((a, b) => a.day.localeCompare(b.day))[0]?.day;
  const days = new Set(periods.filter((p) => p.day).map((p) => p.day)).size;
  const committee = committees.find((c) => String(c.id) === committeeId)?.name;
  const schedule = flexible
    ? deadline ? `مرنة، حتى ${fmtDayFull(`${deadline}T12:00:00`)}` : "مرنة، بلا آخر موعد"
    : firstDay ? (days > 1 ? `${fmtDayFull(`${firstDay}T12:00:00`)}، و${arCount(days - 1, ["يومٌ آخر", "يومان آخران", "أيامٍ أخرى", "يومًا آخر"])}` : fmtDayFull(`${firstDay}T12:00:00`)) : "";
  const meta: AdMeta[] = [
    { icon: <Buildings />, text: committee ? `لصالح ${committee}` : "بلا لجنة" },
    location.trim() ? { icon: <MapPin />, text: location.trim() } : { icon: <MapPin />, text: "المكان لم يُحدَّد", tone: "muted" },
    schedule ? { icon: <CalendarBlank />, text: schedule } : { icon: <CalendarBlank />, text: "الموعد لم يُحدَّد", tone: "muted" },
    { icon: <GenderIntersex />, text: gender === "male" ? "للرجال" : gender === "female" ? "للنساء" : "للجميع" },
  ];
  const stub = flexible ? { big: "", icon: <Endless />, small: "مرنة" } : firstDay ? (() => { const d = dayParts(`${firstDay}T12:00:00`); return { big: d.day, small: d.month }; })() : undefined;
  const preview = (
    <div className="ad-form-preview-card" data-untitled={title.trim() ? undefined : ""}>
      <AdCard seed={opp?.id ?? "new-opp"} stub={stub} chips={editing ? undefined : <AdBadge tone="info">مسودّة</AdBadge>} title={title.trim() || "عنوان الفرصة"} meta={meta} />
    </div>
  );

  return (
    <FormRoom
      title={editing ? `تحرير: ${opp.title}` : "فرصة تطوّعيّة جديدة"}
      preview={preview}
      commit={editing ? {
        primary: { label: "حفظ التغييرات", icon: <FloppyDisk />, onClick: () => save(), busy: saving, held: !dirty },
        cancelHref: `/dashboard/volunteering/${opp.id}`,
        dirty,
      } : {
        primary: { label: "إنشاء ونشر", icon: <Megaphone />, onClick: () => save(true), busy: saving },
        secondary: { label: "حفظ كمسوّدة", onClick: () => save(false) },
        cancelHref: "/dashboard/volunteering",
        dirty,
      }}
    >
      <FormSection id="details" icon={<Handshake />} title="تفاصيل الفرصة">
        <div className="form-grid">
          <Field className="form-full" label="عنوان الفرصة" icon={<TextT />} innerIcon={<PencilSimple />}
            placeholder="مصوّر في معرض التطوّع" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea className="form-full" label="الوصف" icon={<TextT />} innerIcon={<ChatText />}
            placeholder="ما المطلوب من المتطوّع؟" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
          <Field className="form-full" label="المكان" icon={<MapPin />} innerIcon={<PencilSimple />} placeholder="مركز الملك سلمان"
            value={location} onChange={(e) => setLocation(e.target.value)} optional />
          <Select label="الجهة المُحتاجة" icon={<Buildings />}
            options={[{ value: "", label: "بلا لجنة" }, ...committees.map((c) => ({ value: String(c.id), label: c.name }))]}
            value={committeeId} onValueChange={setCommitteeId} optional />
          <Select label="الجنس" icon={<GenderIntersex />} options={GENDER_OPTS} value={gender} onValueChange={setGender} optional />
        </div>
      </FormSection>

      {/* مبدّلُ الموعد في رأس قسمه (أمرُ المالك ٢٠٢٦-١٠-٠١: «المبدّلُ مقابلَ الموعد»): هو بابُ القسم كلِّه لا حقلٌ فيه، فيقف حيث يقف
          العنوان، ويتبعه ما تحته (الفتراتُ أو العددُ وآخرُ يوم). وشرحُ الباب سطرُ رأس القسم (كان فقرةً فوق الحقول) */}
      <FormSection
        id="when" icon={<CalendarBlank />} title="الموعد"
        sub={flexible
          ? "بلا يومٍ ولا ساعة: عملٌ يُنجَز في وقته، كتصميمٍ أو كتابة. ويقدّم المتطوّعُ عليها كلِّها، فإن لم تكتب آخرَ موعدٍ للإنجاز أنهيتَها من قائمة كرتها حين يكتمل العمل."
          : legacy
            ? legacy.locked
              ? `موعدُها قبل الفترات: ${legacy.text}. وعليها طلباتٌ للفرصة كلِّها، فلا تُضاف لها فترات.`
              : `موعدُها قبل الفترات: ${legacy.text}. الفتراتُ التي تكتبها تحلّ محلَّه.`
            : "لكلّ فترةٍ يومُها وساعتاها وعددُها، ويختار المتطوّعُ منها فترةً أو أكثر. واترك العددَ فارغًا ليكون مفتوحًا."}
        act={legacy?.locked ? undefined : (
          <FormChoice label="نوع الموعد" items={[{ value: "periods", label: "بفترات" }, { value: "flex", label: "مرنة" }]}
            value={flexible ? "flex" : "periods"} onChange={(v) => setFlexible(v === "flex")} />
        )}
      >
        {flexible ? (
          <div className="form-grid">
            <Field label="العدد" {...SEATS_INPUT} icon={<UsersThree />} innerIcon={<Hash />}
              value={seats} onChange={(e) => setSeats(seatsText(e.target.value))} optional />
            <Field label="آخرُ موعدٍ للإنجاز" type="date" icon={<CalendarBlank />} innerIcon={<Flag />} placeholder="" min={now.day}
              error={deadlinePast() ? "مضى هذا اليوم" : undefined}
              value={deadline} onChange={(e) => setDeadline(e.target.value)} optional />
          </div>
        ) : (
          <div className="ad-freps">
            {periods.map((p, i) => (
              <FormRepeatItem key={p.key} n={i + 1} label="الفترة" onRemove={periods.length > 1 ? () => removePeriod(p.key) : undefined}>
                <Field label="اليوم" type="date" icon={<CalendarBlank />} innerIcon={<CalendarBlank />} placeholder=""
                  min={touched(p) ? now.day : undefined} error={dayPast(p) ? "مضى هذا اليوم" : undefined}
                  value={p.day} onChange={(e) => setPeriod(p.key, { day: e.target.value })} required />
                <Field label="من الساعة" type="time" icon={<Clock />} innerIcon={<HourglassMedium />} placeholder=""
                  min={touched(p) && p.day === now.day ? now.time : undefined} error={hourPast(p) ? "مضت هذه الساعة" : undefined}
                  value={p.from} onChange={(e) => setPeriod(p.key, { from: e.target.value })} required />
                <Field label="إلى الساعة" type="time" icon={<Clock />} innerIcon={<Flag />} placeholder=""
                  helper={overnight(p) ? "تنتهي في اليوم التالي" : undefined}
                  value={p.to} onChange={(e) => setPeriod(p.key, { to: e.target.value })} required />
                {/* وصفُ «اتركه لجعل العدد مفتوحًا» قيل مرّةً في سطر القسم لا تحت كلّ فترة (محمد ٢٠٢٦-١١-٠٧: «كلامٌ محشورٌ في حقلٍ صغير») */}
                <Field label="العدد" {...SEATS_INPUT} helper={undefined} icon={<UsersThree />} innerIcon={<Hash />}
                  value={p.seats} onChange={(e) => setPeriod(p.key, { seats: seatsText(e.target.value) })} optional />
              </FormRepeatItem>
            ))}
            {legacy?.locked ? null : (
              <span className="ad-frep-add"><AdButton variant="line" icon={<Plus />} onClick={addPeriod}>إضافة فترة</AdButton></span>
            )}
          </div>
        )}
      </FormSection>
    </FormRoom>
  );
}
