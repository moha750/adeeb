"use client";

/**
 * **هويّةُ الإذاعة** — شعارُها واسمُها وجملتُها التعريفيّة ووصفُها. نُقل كما هو (٢٠٢٦-١١-٠٢) من تبويب «هويّة الإذاعة»
 * في `RadioView.tsx` حين انتقلت غرفةُ البرامج إلى قالب «قائمة السجلّات»: القالبُ لا يحمل نموذجًا في موضع، فصار يُفتح من فعل
 * اللوح «هويّة الإذاعة» (`_ad/rooms/RadioRoom.tsx`) — والقديمةُ تستورده من هنا فلا يُكتب النموذجُ مرّتين.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Textarea } from "@adeeb/design-system";
import { Broadcast, TextAlignLeft } from "@phosphor-icons/react";
import { PencilSimple, UploadSimple } from "@/app/_components/glyphs";
import { useToast } from "../_components/ToastProvider";
import type { StationData } from "./data";
import { createStationLogoUploadUrl, saveStation, setStationLogo } from "./actions";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";

// وصفةُ شعار الإذاعة من قانون المرفقات (`lib/upload`)
const LOGO_RULE = UPLOAD_RULES.radioLogo;

type StationFields = { name: string; tagline: string; description: string };

export function StationForm({ station }: { station: StationData | null }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();

  // نسخةُ المحطّة التي تُحرَّر. تبدأ بما جاء من القاعدة لا فارغةً، ساعةَ يُركَّب النموذج: في تبويبه
  // بالغرفة القديمة، وفي نافذته من فعل اللوح «هويّة الإذاعة» في الجديدة.
  const [stForm, setStForm] = useState<StationFields>({
    name: station?.name ?? "",
    tagline: station?.tagline ?? "",
    description: station?.description ?? "",
  });
  const [stErr, setStErr] = useState<Partial<Record<keyof StationFields, string>>>({});
  const stLogoRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  /**
   * رفعُ شعار المحطّة — نفسُ طريق شعار البرنامج: رابطٌ موقّع يرفع إليه المتصفّح
   * مباشرةً، ثمّ يُثبَّت المسارُ في القاعدة. ولا يمرّ الملفُّ بخادمنا.
   */
  const onStationLogo = async (file: File | undefined) => {
    if (!file) return;
    // بوّابةُ قانون المرفقات قبل تذكرة الرفع (`lib/upload`)
    const why = checkFile(file, LOGO_RULE);
    if (why) { toast.error(why); return; }
    setUploadingLogo(true);
    try {
      const ticket = await createStationLogoUploadUrl(file.type, file.size);
      if (!ticket.ok || !ticket.url || !ticket.path) { toast.error(ticket.message ?? "تعذّر الرفع."); return; }
      let failed: string | null = null;
      try {
        const res = await fetch(ticket.url, { method: "PUT", body: file, headers: { "content-type": file.type } });
        if (!res.ok) failed = `ردّ المخزن ${res.status}. أعِد المحاولة.`;
      } catch {
        // فشلُ الشبكة يرمي ولا يردّ `ok: false`، وأشهرُ أسبابه أنّ الدلو لا يأذن لأصلنا.
        failed = "تعذّر الوصول إلى المخزن. غالبًا أنّ الدلو لا يأذن لهذا الأصل: شغّل «pnpm r2:cors» بتوكن R2 إداريّ.";
      }
      if (failed) { toast.error(failed, { duration: 12000 }); return; }
      const r = await setStationLogo(ticket.path);
      if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const submitStation = () => {
    const errs: Partial<Record<keyof StationFields, string>> = {};
    if (!stForm.name.trim()) errs.name = "اسم الإذاعة مطلوب.";
    setStErr(errs);
    if (Object.keys(errs).length) return;

    startPending(async () => {
      const r = await saveStation({
        name: stForm.name,
        tagline: stForm.tagline || null,
        description: stForm.description || null,
      });
      if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
    });
  };

  return !station ? (
    <Alert tone="warning" title="تعذّر جلب إعدادات الإذاعة">
      أعِد تحميل الصفحة، فإن بقيت فالمفتاحُ الخادميّ ناقصٌ في البيئة.
    </Alert>
  ) : (
    <div className="form-grid">
      {/* شعار الإذاعة — نفسُ صندوق شعار البرنامج في تبويب هويّته، فالسطحان يُقرآن بقاعدةٍ واحدة. */}
      <div className="form-full">
        <div
          onDragOver={(ev) => ev.preventDefault()}
          onDrop={(ev) => { ev.preventDefault(); void onStationLogo(ev.dataTransfer.files?.[0]); }}
          className="rounded border-2 border-dashed border-line bg-surface-2 p-8 flex flex-col items-center gap-3 text-center"
        >
          {station.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={station.logoUrl} alt="شعار الإذاعة" className="h-28 w-28 rounded object-cover" />
          ) : (
            <UploadSimple size={30} className="text-content-muted" />
          )}
          <div className="text-content-muted text-sm">
            شعار الإذاعة: مربّعٌ لا يقلّ عن ١٤٠٠×١٤٠٠. اسحبه هنا أو اختره من جهازك.
          </div>
          <Button variant="ghost" size="md" onClick={() => stLogoRef.current?.click()} loading={uploadingLogo}>
            <UploadSimple size={18} />{station.logoUrl ? "استبدال الشعار" : "اختر الشعار"}
          </Button>
          <input ref={stLogoRef} type="file" accept={LOGO_RULE.accept} hidden
            onChange={(ev) => { void onStationLogo(ev.target.files?.[0]); ev.target.value = ""; }} />
        </div>
      </div>

      <Field className="form-full" label="اسم الإذاعة" icon={<Broadcast />} innerIcon={<PencilSimple />}
        placeholder="إذاعة أدِيب" value={stForm.name}
        onChange={(e) => setStForm((f) => ({ ...f, name: e.target.value }))}
        error={stErr.name} required />
      <Field className="form-full" label="الجملة التعريفيّة" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
        placeholder="أصواتُ أدِيب كما تُسمَع" value={stForm.tagline}
        onChange={(e) => setStForm((f) => ({ ...f, tagline: e.target.value }))} optional />
      <Textarea className="form-full" label="الوصف" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
        placeholder="وصفٌ يظهر في صدر صفحة الإذاعة…" rows={3} value={stForm.description}
        onChange={(e) => setStForm((f) => ({ ...f, description: e.target.value }))} optional />

      {/* الحفظُ زرٌّ في ذيل النموذج كنظيره في «الهويّة والمنصّات» بصفحة البرنامج. */}
      <div className="form-full btn-row">
        <Button variant="primary" size="md" onClick={submitStation} loading={pending}>حفظ بيانات الإذاعة</Button>
      </div>
    </div>
  );
}
