"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, SaveBar, SectionCard, Field, Textarea } from "@adeeb/design-system";
import {
  Buildings, ChatText, Image as ImageIcon, LinkSimple, SealCheck, Sparkle, TextT } from "@phosphor-icons/react";
import { PencilSimple, Trash, UploadSimple } from "@/app/_components/glyphs";
import { useToast } from "../../_components/ToastProvider";
import type { SponsorEditData } from "./data";
import { createSponsor, updateSponsor, uploadSponsorLogo, type SponsorInput } from "./actions";
import { PageHeader } from "../../_components/PageHeader";
import { UPLOAD_RULES, attachHint, checkFile } from "@/lib/upload";

// وصفةُ الصورة من قانون المرفقات (`lib/upload`) — الحدُّ والصيغُ وجملُ الرفض هناك
const IMAGE_RULE = UPLOAD_RULES.siteImage;

export function SponsorForm({ sponsor }: { sponsor?: SponsorEditData | null }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState(sponsor?.name ?? "");
  const [badge, setBadge] = useState(sponsor?.badge ?? "");
  const [linkUrl, setLinkUrl] = useState(sponsor?.linkUrl ?? "");
  const [description, setDescription] = useState(sponsor?.description ?? "");
  const [logo, setLogo] = useState<string | null>(sponsor?.logoUrl ?? null);

  const editing = sponsor != null;

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
      const r = await uploadSponsorLogo(fd);
      if (r.ok && r.url) { setLogo(r.url); toast.success("رُفع الشعار."); }
      else toast.error(r.message ?? "تعذّر رفع الشعار.");
    } finally {
      setUploading(false);
    }
  };

  const toInput = (): SponsorInput => ({
    name,
    badge: badge || null,
    logoUrl: logo ?? "",
    linkUrl: linkUrl || null,
    description: description || null,
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
      const r = editing ? await updateSponsor(sponsor.id, input) : await createSponsor(input);
      if (r.ok) {
        toast.success(r.message);
        router.push("/dashboard/website/sponsors");
        router.refresh();
      } else toast.error(r.message);
    });
  };

  return (
    <>
      {/* «إلغاء» سقط: يكرّر فتاتَ المسار الذي فوقه بسطر. و«حفظ» فعلُ التزامٍ لا فعلُ
          رأسٍ، فنزل إلى الشريط اللاصق أسفلَه (حكمُ `/ui/page-header`). */}
      <PageHeader title={editing ? `تحرير: ${sponsor.name}` : "راعٍ جديد"} />

      <div className="form-build">
        <SectionCard headerVariant="chip" icon={<Sparkle />} title="تفاصيل الراعي">
          <div className="form-grid">
            <Field className="form-full" label="اسم الراعي" icon={<Buildings />} innerIcon={<PencilSimple />} placeholder="مثال: مؤسّسة كذا" value={name} onChange={(e) => setName(e.target.value)} required />
            <Field label="الوسم" icon={<SealCheck />} innerIcon={<PencilSimple />} placeholder="مثال: راعٍ ذهبيّ، شريك استراتيجيّ" value={badge} onChange={(e) => setBadge(e.target.value)} optional />
            <Field label="الرابط" icon={<LinkSimple />} innerIcon={<LinkSimple />} placeholder="https://…" charset="latin" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} optional />
            <Textarea className="form-full" label="نبذة" icon={<TextT />} innerIcon={<ChatText />} placeholder="سطرٌ يعرّف بالراعي أو بطبيعة الشراكة" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} optional />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<ImageIcon />} title="الشعار (مطلوب)">
          <div className="flex flex-col gap-3 items-start">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="شعار الراعي" className="max-h-32 rounded bg-white/60 object-contain p-2 ring-1 ring-navy-950/5" />
            ) : (
              <div className="text-sm text-content-muted">{`لا شعار بعد. ارفع صورةً (${attachHint(IMAGE_RULE)}). يُفضّل شعارٌ بخلفيّة شفّافة.`}</div>
            )}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="md" onClick={pickFile} loading={uploading}>
                <UploadSimple size={18} />{logo ? "تغيير الشعار" : "رفع الشعار"}
              </Button>
              {logo ? (
                <Button variant="ghost-danger" size="md" onClick={() => setLogo(null)} disabled={uploading}>
                  <Trash size={18} />إزالة
                </Button>
              ) : null}
            </div>
            <input ref={fileRef} type="file" accept={IMAGE_RULE.accept} hidden onChange={onPickFile} />
          </div>
        </SectionCard>
      </div>

      <SaveBar open={dirty} message={editing ? undefined : "راعٍ لم يُضَف بعد"}>
        <Button variant="primary" size="md" loading={saving} onClick={save}>
          {editing ? "حفظ التغييرات" : "إضافة الراعي"}
        </Button>
      </SaveBar>
    </>
  );
}
