"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Select, Textarea } from "@adeeb/design-system";
import {
  Armchair, CalendarBlank, CalendarDots, ChatText, Clock, FloppyDisk, Flag, GenderFemale, GenderMale, Hash, HourglassMedium, Image as ImageIcon,
  Certificate, GenderIntersex, IdentificationBadge, LinkSimple, MapPin, MapPinLine, Microphone, Sparkle, TextT, UsersThree } from "@phosphor-icons/react";
import { PencilSimple, Plus } from "@/app/_components/glyphs";
import { useToast } from "../_components/ToastProvider";
import type { EventEditData, EventGuest, OrganizerOption } from "./data";
import type { CreditPerson } from "@/lib/people";
import { AdPeoplePicker, type AdPerson } from "@/app/_ad/people";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { AUDIENCE_OPTIONS, TYPE_OPTIONS, type ActivityType } from "./vocab";
import { createEvent, updateEvent, uploadEventCover, type EventInput } from "./actions";
import { UPLOAD_RULES, attachHint, checkFile, shrinkImage } from "@/lib/upload";
import { fmtClockSpan } from "@adeeb/core/dates";
import { AdImageField, FormHint, FormRepeatItem, FormRoom, FormSection, FormToggle } from "@/app/_ad/form";
import { AdButton } from "@/app/_ad/primitives";
import { EventAbout, EventGuests, EventTags, EventTicket } from "@/app/_ad/rooms/ActivityReadRoom";
import { daysUntil } from "@/app/dashboard/_portal/time";
import { PubRead } from "@/app/_ad/read";
import type { PublicActivity } from "@/app/activities/data";
import { fmtDateOnly, fmtStamp, fromClubInput } from "@/lib/dates";
import { GENDER_OPTIONS, GUEST_ROLES, GUEST_ROLE_VALUES, HONORIFICS, type GuestRole } from "@/lib/activities";
import { arabicNameError } from "@/lib/personName";

// وصفةُ الصورة من قانون المرفقات (`lib/upload`) — الحدُّ والصيغُ وجملُ الرفض هناك
const IMAGE_RULE = UPLOAD_RULES.siteImage;

export function EventForm({ event, organizers, members = [] }: { event?: EventEditData | null; organizers: OrganizerOption[]; members?: CreditPerson[] }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState(event?.name ?? "");
  const [type, setType] = useState<ActivityType>(event?.type ?? "activity");
  const [organizer, setOrganizer] = useState(event?.organizer ?? "");
  const [audience, setAudience] = useState<string>(event?.targetGender ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [locationUrl, setLocationUrl] = useState(event?.locationUrl ?? "");
  const [date, setDate] = useState(event?.date ?? "");
  const [startTime, setStartTime] = useState(event?.startTime ?? "");
  const [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [totalSeats, setTotalSeats] = useState(event?.totalSeats != null ? String(event.totalSeats) : "");
  const [maleSeats, setMaleSeats] = useState(event?.maleSeats != null ? String(event.maleSeats) : "");
  const [femaleSeats, setFemaleSeats] = useState(event?.femaleSeats != null ? String(event.femaleSeats) : "");
  const [cover, setCover] = useState<string | null>(event?.coverImageUrl ?? null);
  // ٢٠٢٦-١١-١٥: ما تذكره ملصقاتُ أدِيب ولم يكن في النموذج — الشهادة، وآخرُ موعدٍ للتسجيل، والضيوف
  const [certificate, setCertificate] = useState(event?.hasCertificate ?? false);
  const [closesAt, setClosesAt] = useState(event?.bookingClosesAt ?? "");
  const [guests, setGuests] = useState<(EventGuest & { key: number })[]>(() => (event?.guests ?? []).map((g, i) => ({ ...g, key: i + 1 })));
  const setGuest = (key: number, patch: Partial<EventGuest>) => setGuests((gs) => gs.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const addGuest = () => setGuests((gs) => [...gs, { key: Math.max(0, ...gs.map((g) => g.key)) + 1, name: "", honorific: null, role: (gs.length ? "moderator" : "guest") as GuestRole, gender: "male" }]);
  const removeGuest = (key: number) => setGuests((gs) => gs.filter((g) => g.key !== key));
  /* الضيفُ من أدِيب يُختار بمنتقي الأشخاص المعتمد من بِركة أهل أدِيب نفسِها التي ينتقي منها الخبرُ مصوّريه (`getCreditPeople`: الأعضاءُ
     الساريةُ عضويّتُهم والمتطوّعون القائمون، كلٌّ تحت عنوانه)، ومن خارجها يُكتب اسمُه كما هو (`free`). وعضوُ أدِيب جنسُه من ملفّه */
  const pool = useMemo(() => members.filter((m): m is CreditPerson & { id: string } => !!m.id), [members]);
  const people = useMemo<AdPerson[]>(() => pool.map((m) => ({
    id: m.id, name: m.name, group: m.group, hint: m.hint,
    face: <Avatar name={m.name} src={m.avatarUrl ?? undefined} gender={m.gender} size="xs" />,
  })), [pool]);
  const memberById = useMemo(() => new Map(pool.map((m) => [m.id, m])), [pool]);
  const pickGuest = (key: number, ids: string[]) => {
    const v = ids[0] ?? "";
    const m = memberById.get(v);
    setGuest(key, m
      ? { memberId: m.id, name: m.name, gender: m.gender === "female" ? "female" : "male" }
      : { memberId: null, name: v });
  };

  const editing = event != null;

  // حالة المقاعد للتلميح: مخزون مشترك (الجنسان فارغان) · تقسيم (كلاهما وسطُهما = الإجمالي) · ناقص
  const totalN = Number(totalSeats) || 0;
  const totalEmpty = totalSeats.trim() === "";
  const single = audience !== "";   // موجَّهة لجنسٍ واحد ⟵ لا تقسيم بالنوع
  const maleFilled = maleSeats.trim() !== "";
  const femaleFilled = femaleSeats.trim() !== "";
  const seatsHint =
    totalEmpty ? { tone: undefined, text: "تسجيل غير محدود، بلا عدد محدّد." }
      : single ? null
      : !maleFilled && !femaleFilled ? { tone: undefined, text: "المقاعد مشتركة بين الجنسين، لا سقف لكلّ جنس." }
      : !maleFilled || !femaleFilled ? { tone: "bad" as const, text: "حدّد مقاعد الرجال والنساء معًا، أو اتركهما فارغين." }
      : (Number(maleSeats) || 0) + (Number(femaleSeats) || 0) === totalN ? { tone: undefined, text: "تقسيمٌ صحيح بالنوع." }
      : { tone: "bad" as const, text: `مجموع الجنسين ${(Number(maleSeats) || 0) + (Number(femaleSeats) || 0)}، يجب أن يساوي الإجمالي ${totalN}.` };

  // مقاعد الجنسين مقفلة قبل تحديد الإجمالي؛ وإدخال أحدهما يُكمِل الآخر تلقائيًّا (الباقي من الإجمالي)
  const seatsLocked = totalN <= 0;
  const applyTotal = (v: string) => {
    setTotalSeats(v);
    const t = Number(v) || 0;
    if (maleSeats.trim() !== "" && t > 0) setFemaleSeats(String(Math.max(0, t - (Number(maleSeats) || 0))));
  };
  const applyMale = (v: string) => {
    setMaleSeats(v);
    if (v.trim() === "") { setFemaleSeats(""); return; } // إفراغ أحدهما ⟵ مخزون مشترك
    if (totalN > 0) setFemaleSeats(String(Math.max(0, totalN - (Number(v) || 0))));
  };
  const applyFemale = (v: string) => {
    setFemaleSeats(v);
    if (v.trim() === "") { setMaleSeats(""); return; }
    if (totalN > 0) setMaleSeats(String(Math.max(0, totalN - (Number(v) || 0))));
  };
  // التوجيه لجنسٍ واحد يُلغي تقسيم المقاعد بالنوع (لا معنى له)
  const changeAudience = (v: string) => { setAudience(v); if (v !== "") { setMaleSeats(""); setFemaleSeats(""); } };

  const onFile = async (file: File) => {
    // بوّابةُ قانون المرفقات قبل الشبكة: لا يُرفع ما سيُردّ، ولا ينتظر صاحبُه ليُقال له
    const why = checkFile(file, IMAGE_RULE);
    if (why) { toast.error(why); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      // تُصغَّر إلى مقاس عرضها قبل الرفع (`shrinkImage`): أخفُّ على الزائر، وأبعدُ عن حدّ جسم فعل الخادم
      fd.append("file", await shrinkImage(file, IMAGE_RULE));
      const r = await uploadEventCover(fd);
      if (r.ok && r.url) { setCover(r.url); toast.success("رُفعت صورة الغلاف."); }
      else toast.error(r.message ?? "تعذّر رفع الصورة.");
    } finally {
      setUploading(false);
    }
  };

  const toInput = (): EventInput => ({
    name,
    type,
    organizer,
    description,
    location,
    locationUrl,
    date,
    startTime,
    endTime: endTime || null,
    totalSeats: totalEmpty ? null : (Number(totalSeats) || 0),
    maleSeats: maleFilled ? (Number(maleSeats) || 0) : null,
    femaleSeats: femaleFilled ? (Number(femaleSeats) || 0) : null,
    targetGender: audience === "" ? null : (audience as "male" | "female"),
    coverImageUrl: cover,
    hasCertificate: certificate,
    bookingClosesAt: closesAt || null,
    guests: guests.map(({ name: n, honorific, role, gender, memberId }) => ({ name: n.trim(), honorific, role, gender, memberId: memberId ?? null })),
  });

  /**
   * **أثمّة ما يُحفَظ؟** — في التحرير لا يُحفظ قبل أوّل تغيير، وفي الضيّق يلحقك الفعلُ حين يوجد (`FormRoom`). والمقارنةُ بلَقطةِ `toInput()`
   * نفسِها التي تُرسَل، والأصلُ يُجمَّد في حالةٍ تُهيَّأ مرّةً: الشاشةُ تُغادَر بعد الحفظ
   * فلا معنى لتحديثه. **ولا `useRef`** — قراءةُ `ref.current` أثناء الرسم يردّها
   * `react-hooks/refs` خطأً، والحالةُ المهيّأةُ مرّةً تقول المعنى نفسَه وتُقرأ في الرسم.
   */
  const snapshot = JSON.stringify(toInput());
  const [origin] = useState(snapshot);
  const dirty = snapshot !== origin;

  const save = () => {
    startSave(async () => {
      const input = toInput();
      const r = editing ? await updateEvent(event.id, input) : await createEvent(input);
      if (r.ok) {
        toast.success(r.message);
        router.push("/dashboard/events");
        router.refresh();
      } else toast.error(r.message);
    });
  };

  const orgName = organizer ? organizers.find((o) => o.value === organizer)?.label : undefined;
  /* **المعاينةُ تذكرةُ صفحتها العامّة** (٢٠٢٦-١١-١٥) — ما يراه الزائرُ بكلّ ما أُضيف (الشهادة، وآخرُ موعد، والضيوف)، مبنيّةً ممّا يُكتب
     الآن، بقطعة الصفحة نفسِها (`EventTicket`). والعمودُ ضيّقٌ فتُرى بشكلها في الجوّال، وهو شاشةُ أكثر الزوّار. كانت كرتَ غرفة الفعاليّات
     في البوّابة، ثمّ مبدّلًا بين الاثنين؛ وأُسقط الكرتُ (محمد: «من سيعمل الفعاليّة لن يفرق معه») */
  const closesIso = closesAt ? fromClubInput(closesAt) : null;
  const totalNum = totalEmpty ? null : totalN || null;
  const pubGuests = guests.filter((g) => g.name.trim()).map((g) => {
    const m = g.memberId ? memberById.get(g.memberId) : undefined;
    return { name: g.name.trim(), honorific: g.honorific, role: g.role, gender: g.gender, avatar: m?.avatarUrl ?? null, slug: null };
  });
  const asPublic: PublicActivity = {
    id: event?.id ?? "new", name: name.trim() || "اسم الفعاليّة", description: description.trim() || null, type,
    location: location.trim() || null, locationUrl: locationUrl.trim() || null, date, dateLabel: date ? fmtDateOnly(date) : "",
    timeLabel: fmtClockSpan(startTime, endTime), startTime: startTime || null, endTime: endTime || null, cover,
    splitByGender: !single && maleFilled && femaleFilled, unlimited: totalEmpty, targetGender: audience === "" ? null : (audience as "male" | "female"),
    totalSeats: totalNum, totalRemaining: totalNum, maleSeats: maleFilled ? Number(maleSeats) || 0 : null, femaleSeats: femaleFilled ? Number(femaleSeats) || 0 : null,
    maleRemaining: maleFilled ? Number(maleSeats) || 0 : null, femaleRemaining: femaleFilled ? Number(femaleSeats) || 0 : null,
    full: false, past: !!date && daysUntil(date) < 0, cancelled: false, organizer: orgName ?? null, certificate,
    closesLabel: closesIso ? fmtStamp(closesIso) : null, closed: false, booked: 0, attended: null, guests: pubGuests, coverage: null,
  };
  /* **رأسُ الصفحة مصغّرًا** (محمد ٢٠٢٦-١١-١٥: «مقتنعٌ به؟» — كانت التذكرةُ وحدها بلا اسمٍ ولا نوعٍ ولا ملصق): قالبُ «القراءة» نفسُه
     (`PubRead`) بشكله في الجوّال — اللوحُ باسمها وشاراتها، والتذكرةُ تتدلّى منه بقسائمها، و«عن الفعاليّة»، والضيوف، والملصقُ بعدها — فما
     يُرى هنا ما يراه الزائر. وتنبيهُ الحجز وحده ليس هنا: يختلف باختلاف من يزور */
  const sitePreview = (
    <div className="ad-form-preview-site">
      <PubRead tags={<EventTags a={asPublic} />} title={asPublic.name}
        cover={cover ? { src: cover, alt: `ملصق ${asPublic.name}` } : null}>
        {/* بقسائمها كما في الصفحة: التقويمُ صورتُه هنا لا فعلُه، والخريطةُ تفتح الرابطَ المكتوب ليُتحقَّق منه */}
        <EventTicket a={asPublic} onCalendar={() => {}} />
        <EventAbout a={asPublic} />
        <EventGuests a={asPublic} />
      </PubRead>
    </div>
  );


  return (
    <FormRoom
      title={editing ? `تحرير: ${event.name}` : "فعاليّة جديدة"}
      preview={sitePreview}
      commit={{
        primary: editing
          ? { label: "حفظ التغييرات", icon: <FloppyDisk />, onClick: save, busy: saving, held: !dirty || uploading }
          : { label: "إنشاء الفعاليّة", icon: <Plus />, onClick: save, busy: saving, held: uploading },
        cancelHref: "/dashboard/events",
        dirty,
      }}
    >
      <FormSection id="details" icon={<Sparkle />} title="تفاصيل الفعاليّة">
        <div className="form-grid">
          <Field className="form-full" label="اسم الفعاليّة" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="مثال: أمسية شعريّة" value={name} onChange={(e) => setName(e.target.value)} required />
          <Select label="نوع الفعاليّة" icon={<Sparkle />} options={TYPE_OPTIONS} value={type} onValueChange={(v) => setType(v as ActivityType)} required />
          <Select label="الجهة المنظِّمة" icon={<UsersThree />} options={organizers} value={organizer} onValueChange={setOrganizer} searchable optional />
          <Textarea className="form-full" label="الوصف" icon={<TextT />} innerIcon={<ChatText />} placeholder="سطر يظهر في بطاقة الفعاليّة وصفحتها" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} optional />
          <Field label="المكان" icon={<MapPin />} innerIcon={<PencilSimple />} placeholder="مثال: مدرّج معمل كود" value={location} onChange={(e) => setLocation(e.target.value)} required />
          <Field label="رابط الموقع على الخرائط" icon={<LinkSimple />} innerIcon={<MapPinLine />} placeholder="https://maps.app.goo.gl/…" charset="latin" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} required />
        </div>
      </FormSection>

      <FormSection id="when" icon={<CalendarBlank />} title="الموعد والمقاعد">
        <div className="form-grid">
          <Field className="form-full" type="date" label="التاريخ" icon={<CalendarBlank />} innerIcon={<CalendarDots />} placeholder="اختر التاريخ" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Field type="time" label="وقت البداية" icon={<Clock />} innerIcon={<HourglassMedium />} placeholder="—" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          <Field type="time" label="وقت النهاية" icon={<Clock />} innerIcon={<Flag />} placeholder="—" value={endTime} onChange={(e) => setEndTime(e.target.value)} optional />
          <Select className="form-full" label="موجَّهة لـ" icon={<UsersThree />} options={AUDIENCE_OPTIONS} value={audience} onValueChange={changeAudience} helper="جمهور الفعاليّة؛ يُرفَض حجز الجنس المخالف." optional />
          <Field className="form-full" type="number" charset="digits" label="إجمالي المقاعد" icon={<Armchair />} innerIcon={<Hash />} placeholder="اتركه فارغًا لتسجيلٍ غير محدود" value={totalSeats} onChange={(e) => applyTotal(e.target.value)} optional />
          {!single ? (
            <>
              <Field type="number" charset="digits" label="مقاعد الرجال" icon={<GenderMale />} innerIcon={<Hash />} placeholder={seatsLocked ? "حدّد الإجمالي أولًا" : "للمقاعد المشتركة اتركها فارغة"} value={maleSeats} onChange={(e) => applyMale(e.target.value)} disabled={seatsLocked} optional />
              <Field type="number" charset="digits" label="مقاعد النساء" icon={<GenderFemale />} innerIcon={<Hash />} placeholder={seatsLocked ? "حدّد الإجمالي أولًا" : "للمقاعد المشتركة اتركها فارغة"} value={femaleSeats} onChange={(e) => applyFemale(e.target.value)} disabled={seatsLocked} optional />
            </>
          ) : null}
          {seatsHint ? <FormHint tone={seatsHint.tone}>{seatsHint.text}</FormHint> : null}
          <Field className="form-full" type="datetime-local" label="آخر موعد للتسجيل" icon={<HourglassMedium />} innerIcon={<CalendarDots />} placeholder=""
            helper="بعده يُغلق الحجز. اتركه فارغًا ليبقى مفتوحًا حتى يوم الفعاليّة." value={closesAt} onChange={(e) => setClosesAt(e.target.value)} optional />
          <FormToggle className="form-full" icon={<Certificate />} label="تُمنح شهادة حضور" description="تظهر في صفحة الفعاليّة: «تُمنح لمن يحضر»." checked={certificate} onChange={setCertificate} />
        </div>
      </FormSection>

      {/* **الضيوف** بصفاتهم بتأنيثها («الضيفة»، «المحاور») وألقابهم — كما تذكرهم ملصقاتُ أدِيب. والاسمُ عربيٌّ خالص كبقيّة أسماء الأشخاص،
          واللقبُ («أ.»، «د.») حقلُه لأنّ النقطةَ لا تدخل الاسم */}
      {/* «إضافة ضيف» بابُ القسم في طرف رأسه (`act`) لا زرٌّ وحده في جسمٍ فارغ (محمد ٢٠٢٦-١١-١٥: «زرٌّ ومساحةٌ فارغةٌ كبيرة»)، والجسمُ يظهر بأوّل ضيف */}
      <FormSection id="guests" icon={<Microphone />} title="الضيوف" sub="من يحاور أو يقدّم أو يدرّب، من أدِيب أو من خارجها" mark="optional"
        act={<AdButton variant="line" size="sm" icon={<Plus />} onClick={addGuest}>إضافة ضيف</AdButton>}>
        {guests.length ? (
        <div className="ad-freps">
          {guests.map((g, i) => (
            <FormRepeatItem key={g.key} n={i + 1} label={GUEST_ROLES[g.role][g.gender]} onRemove={() => removeGuest(g.key)}>
              <AdPeoplePicker label="الضيف" icon={<TextT />} roleIcon={<Microphone />} people={people} single free
                value={g.memberId ? [g.memberId] : g.name ? [g.name] : []} onChange={(ids) => pickGuest(g.key, ids)}
                placeholder="ابحث في أعضاء أدِيب، أو اكتب اسم ضيفٍ من خارجها"
                helper={!g.memberId && g.name.trim() ? arabicNameError(g.name) ?? undefined : undefined} required />
              <Select label="الصفة" icon={<IdentificationBadge />} options={GUEST_ROLE_VALUES.map((r) => ({ value: r, label: GUEST_ROLES[r][g.gender] }))}
                value={g.role} onValueChange={(v) => setGuest(g.key, { role: v as GuestRole })} required />
              {g.memberId ? null : (
                <Select label="الجنس" icon={<GenderIntersex />} options={GENDER_OPTIONS} value={g.gender} onValueChange={(v) => setGuest(g.key, { gender: v as "male" | "female" })} required />
              )}
              <Select label="اللقب" icon={<Sparkle />} options={HONORIFICS.map((h) => ({ value: h, label: h }))} value={g.honorific ?? ""} onValueChange={(v) => setGuest(g.key, { honorific: v || null })} optional />
            </FormRepeatItem>
          ))}
        </div>
        ) : null}
      </FormSection>

      <FormSection id="cover" icon={<ImageIcon />} title="صورة الغلاف" mark="optional">
        <AdImageField bare label="صورة الغلاف" icon={<ImageIcon />} value={cover} onFile={onFile} onClear={() => setCover(null)} busy={uploading}
          accept={IMAGE_RULE.accept} help={attachHint(IMAGE_RULE)} alt="غلاف الفعاليّة" />
      </FormSection>
    </FormRoom>
  );
}
