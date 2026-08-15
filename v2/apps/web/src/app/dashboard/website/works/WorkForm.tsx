"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, SectionCard, Field } from "@adeeb/design-system";
import {
  Image as ImageIcon, LinkSimple, Sparkle, Tag, TextT } from "@phosphor-icons/react";
import { PencilSimple, Trash, UploadSimple } from "@/app/_components/glyphs";
import { useToast } from "../../_components/ToastProvider";
import type { WorkEditData } from "./data";
import { createWork, updateWork, uploadWorkImage, type WorkInput } from "./actions";
import { Breadcrumb } from "../../_shell/Breadcrumb";
import { UPLOAD_RULES, attachHint, checkFile } from "@/lib/upload";

// وصفةُ الصورة من قانون المرفقات (`lib/upload`) — الحدُّ والصيغُ وجملُ الرفض هناك
const IMAGE_RULE = UPLOAD_RULES.siteImage;

export function WorkForm({ work }: { work?: WorkEditData | null }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState(work?.title ?? "");
  const [category, setCategory] = useState(work?.category ?? "");
  const [linkUrl, setLinkUrl] = useState(work?.linkUrl ?? "");
  const [image, setImage] = useState<string | null>(work?.imageUrl ?? null);

  const editing = work != null;
  const crumbLeaf = editing ? "تحرير" : "عمل جديد";

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
      const r = await uploadWorkImage(fd);
      if (r.ok && r.url) { setImage(r.url); toast.success("رُفعت صورة العمل."); }
      else toast.error(r.message ?? "تعذّر رفع الصورة.");
    } finally {
      setUploading(false);
    }
  };

  const toInput = (): WorkInput => ({
    title,
    category,
    imageUrl: image ?? "",
    linkUrl: linkUrl || null,
  });

  const save = () => {
    startSave(async () => {
      const input = toInput();
      const r = editing ? await updateWork(work.id, input) : await createWork(input);
      if (r.ok) {
        toast.success(r.message);
        router.push("/dashboard/website/works");
        router.refresh();
      } else toast.error(r.message);
    });
  };

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb leaf={crumbLeaf} />
          <h1>{editing ? `تحرير: ${work.title}` : "عمل جديد"}</h1>
        </div>
        <div className="form-head-actions">
          <Button variant="ghost" size="md" onClick={() => router.push("/dashboard/website/works")} disabled={saving}>إلغاء</Button>
          <Button variant="primary" size="md" loading={saving} onClick={save}>{editing ? "حفظ التغييرات" : "إضافة العمل"}</Button>
        </div>
      </div>

      <div className="form-build">
        <SectionCard headerVariant="chip" icon={<Sparkle />} title="تفاصيل العمل">
          <div className="form-grid">
            <Field className="form-full" label="عنوان العمل" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="مثال: قصيدة «حيثُ تُولَد الكلمة»" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Field label="التصنيف" icon={<Tag />} innerIcon={<PencilSimple />} placeholder="مثال: شعر، تصميم، قصّة" value={category} onChange={(e) => setCategory(e.target.value)} optional />
            <Field label="رابط العمل" icon={<LinkSimple />} innerIcon={<LinkSimple />} placeholder="https://…" charset="latin" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} helper="إن تُرك فارغًا فُتِح العمل في عارضٍ داخليّ (صورته)." optional />
          </div>
        </SectionCard>

        <SectionCard headerVariant="chip" icon={<ImageIcon />} title="صورة العمل (مطلوبة)">
          <div className="flex flex-col gap-3 items-start">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="صورة العمل" className="w-full max-h-56 object-cover rounded" />
            ) : (
              <div className="text-sm text-content-muted">{`لا صورة بعد. ارفع صورةً (${attachHint(IMAGE_RULE)}). الصورة هي وجه العمل في المعرض.`}</div>
            )}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="md" onClick={pickFile} loading={uploading}>
                <UploadSimple size={18} />{image ? "تغيير الصورة" : "رفع صورة العمل"}
              </Button>
              {image ? (
                <Button variant="ghost-danger" size="md" onClick={() => setImage(null)} disabled={uploading}>
                  <Trash size={18} />إزالة
                </Button>
              ) : null}
            </div>
            <input ref={fileRef} type="file" accept={IMAGE_RULE.accept} hidden onChange={onPickFile} />
          </div>
        </SectionCard>
      </div>
    </>
  );
}
