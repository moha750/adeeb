"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, SaveBar, SectionCard, Field, Select, Textarea } from "@adeeb/design-system";
import {
  Armchair, CalendarBlank, CalendarDots, ChatText, Clock, Flag, GenderFemale, GenderMale, Hash, HourglassMedium, Image as ImageIcon, LinkSimple, MapPin, MapPinLine, Sparkle, TextT, UsersThree } from "@phosphor-icons/react";
import { PencilSimple, Trash, UploadSimple } from "@/app/_components/glyphs";
import { useToast } from "../_components/ToastProvider";
import type { EventEditData, OrganizerOption } from "./data";
import { AUDIENCE_OPTIONS, TYPE_OPTIONS, type ActivityType } from "./vocab";
import { createEvent, updateEvent, uploadEventCover, type EventInput } from "./actions";
import { PageHeader } from "../_components/PageHeader";
import { UPLOAD_RULES, attachHint, checkFile } from "@/lib/upload";

// وصفةُ الصورة من قانون المرفقات (`lib/upload`) — الحدُّ والصيغُ وجملُ الرفض هناك
const IMAGE_RULE = UPLOAD_RULES.siteImage;

export function EventForm({ event, organizers }: { event?: EventEditData | null; organizers: OrganizerOption[] }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
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

  const editing = event != null;

  // حالة المقاعد للتلميح: مخزون مشترك (الجنسان فارغان) · تقسيم (كلاهما وسطُهما = الإجمالي) · ناقص
  const totalN = Number(totalSeats) || 0;
  const totalEmpty = totalSeats.trim() === "";
  const single = audience !== "";   // موجَّهة لجنسٍ واحد ⟵ لا تقسيم بالنوع
  const maleFilled = maleSeats.trim() !== "";
  const femaleFilled = femaleSeats.trim() !== "";
  const seatsHint =
    totalEmpty ? { tone: "muted" as const, text: "تسجيل غير محدود، بلا عدد محدّد." }
      : single ? null
      : !maleFilled && !femaleFilled ? { tone: "muted" as const, text: "المقاعد مشتركة بين الجنسين، لا سقف لكلّ جنس." }
      : !maleFilled || !femaleFilled ? { tone: "warn" as const, text: "حدّد مقاعد الرجال والنساء معًا، أو اتركهما فارغين." }
      : (Number(maleSeats) || 0) + (Number(femaleSeats) || 0) === totalN ? { tone: "muted" as const, text: "تقسيمٌ صحيح بالنوع." }
      : { tone: "warn" as const, text: `مجموع الجنسين ${(Number(maleSeats) || 0) + (Number(femaleSeats) || 0)}، يجب أن يساوي الإجمالي ${totalN}.` };

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

  const pickFile = () => fileRef.current?.click();

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // كي يُقبَل اختيار الملفّ نفسه ثانيةً
    if (!file) return;
    // بوّابةُ قانون المرفقات قبل الشبكة: لا يُرفع ما سيُردّ، ولا ينتظر صاحبُه ليُقال له
    const why = checkFile(file, IMAGE_RULE);
    if (why) { toast.error(why); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
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
  });

  /**
   * **أثمّة ما يُحفَظ؟** — الشريطُ اللاصق لا يظهر حتى يوجد. والمقارنةُ بلَقطةِ `toInput()`
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

  return (
    <>
      {/* «إلغاء» سقط: يكرّر فتاتَ المسار الذي فوقه بسطر. و«حفظ» فعلُ التزامٍ لا فعلُ
          رأسٍ، فنزل إلى الشريط اللاصق أسفلَه (حكمُ `/ui/page-header`). */}
      <PageHeader title={editing ? `تحرير: ${event.name}` : "فعاليّة جديدة"} />

      <div className="form-build">
        <SectionCard headerVariant="chip" icon={<Sparkle />} title="تفاصيل الفعاليّة">
          <div className="form-grid">
            <Field className="form-full" label="اسم الفعاليّة" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="مثال: أمسية شعريّة" value={name} onChange={(e) => setName(e.target.value)} required />
            <Select label="نوع الفعاليّة" icon={<Sparkle />} options={TYPE_OPTIONS} value={type} onValueChange={(v) => setType(v as ActivityType)} required />
            <Select label="الجهة المنظِّمة" icon={<UsersThree />} options={organizers} value={organizer} onValueChange={setOrganizer} searchable optional />
            <Textarea className="form-full" label="الوصف" icon={<TextT />} innerIcon={<ChatText />} placeholder="سطر يظهر في بطاقة الفعاليّة وصفحتها" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} optional />
            <Field label="المكان" icon={<MapPin />} innerIcon={<PencilSimple />} placeholder="مثال: مدرّج معمل كود" value={location} onChange={(e) => setLocation(e.target.value)} required />
            <Field label="رابط الموقع على الخرائط" icon={<LinkSimple />} innerIcon={<MapPinLine />} placeholder="https://maps.app.goo.gl/…" charset="latin" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} required />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<CalendarBlank />} title="الموعد والمقاعد">
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
            {seatsHint ? <div className={"form-full text-sm " + (seatsHint.tone === "warn" ? "text-danger" : "text-content-muted")}>{seatsHint.text}</div> : null}
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<ImageIcon />} title="صورة الغلاف (اختياريّة)">
          <div className="flex flex-col gap-3 items-start">
            {cover ? (
              <img src={cover} alt="غلاف الفعاليّة" className="w-full max-h-56 object-cover rounded" />
            ) : (
              <div className="text-sm text-content-muted">{`لا غلاف بعد. ارفع صورةً (${attachHint(IMAGE_RULE)}).`}</div>
            )}
            <div className="btn-row">
              <Button variant="ghost" size="md" onClick={pickFile} loading={uploading}>
                <UploadSimple size={18} />{cover ? "تغيير الصورة" : "رفع صورة الغلاف"}
              </Button>
              {cover ? (
                <Button variant="ghost-danger" size="md" onClick={() => setCover(null)} disabled={uploading}>
                  <Trash size={18} />إزالة
                </Button>
              ) : null}
            </div>
            <input ref={fileRef} type="file" accept={IMAGE_RULE.accept} hidden onChange={onPickFile} />
          </div>
        </SectionCard>
      </div>

      <SaveBar open={dirty} message={editing ? undefined : "فعاليّةٌ لم تُنشَأ بعد"}>
        <Button variant="primary" size="md" loading={saving} onClick={save}>
          {editing ? "حفظ التغييرات" : "إنشاء الفعاليّة"}
        </Button>
      </SaveBar>
    </>
  );
}
