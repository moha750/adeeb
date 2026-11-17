"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Select } from "@adeeb/design-system";
import { FloppyDisk, Image as ImageIcon, LinkSimple, Sparkle, Tag, TextT } from "@phosphor-icons/react";
import { PencilSimple, Plus } from "@/app/_components/glyphs";
import { useToast } from "../../_components/ToastProvider";
import type { WorkEditData } from "./data";
import { createWork, updateWork, uploadWorkImage, type WorkInput } from "./actions";
import { WORK_CATEGORY_OPTIONS } from "./vocab";
import { AdBadge, AdCard } from "@/app/_ad/primitives";
import { AdImageField, FormRoom, FormSection } from "@/app/_ad/form";
import { UPLOAD_RULES, attachHint, checkFile, shrinkImage } from "@/lib/upload";

// وصفةُ الصورة من قانون المرفقات (`lib/upload`) — الحدُّ والصيغُ وجملُ الرفض هناك
const IMAGE_RULE = UPLOAD_RULES.siteImage;

export function WorkForm({ work }: { work?: WorkEditData | null }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState(work?.title ?? "");
  const [category, setCategory] = useState(work?.category ?? "");
  const [linkUrl, setLinkUrl] = useState(work?.linkUrl ?? "");
  const [image, setImage] = useState<string | null>(work?.imageUrl ?? null);

  const editing = work != null;

  const onFile = async (file: File) => {
    // بوّابةُ قانون المرفقات قبل الشبكة: لا يُرفع ما سيُردّ، ولا ينتظر صاحبُه ليُقال له
    const why = checkFile(file, IMAGE_RULE);
    if (why) { toast.error(why); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      // تُصغَّر إلى مقاس عرضها قبل الرفع (`shrinkImage`): أخفُّ على الزائر، وأبعدُ عن حدّ جسم فعل الخادم
      fd.append("file", await shrinkImage(file, IMAGE_RULE));
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
      const r = editing ? await updateWork(work.id, input) : await createWork(input);
      if (r.ok) {
        toast.success(r.message);
        router.push("/dashboard/website/works");
        router.refresh();
      } else toast.error(r.message);
    });
  };

  /* التذكرةُ كما ستظهر في غرفة الأعمال (`_ad/rooms/WorksRoom`): الصورةُ غلافُ كعبها، والتصنيفُ شارتُها، ونطاقُ الرابط سطرُها (أو العارضُ الداخليّ) */
  const host = (u: string) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return u; } };
  const preview = (
    <div className="ad-form-preview-card" data-untitled={title.trim() ? undefined : ""}>
      <AdCard seed={work?.id ?? "new-work"} cover={image} chips={category.trim() ? <AdBadge>{category.trim()}</AdBadge> : undefined} title={title.trim() || "عنوان العمل"}
        meta={[linkUrl.trim() ? { icon: <LinkSimple />, text: host(linkUrl.trim()) } : { icon: <LinkSimple />, text: "عارض داخليّ", tone: "muted" }]} />
    </div>
  );

  return (
    <FormRoom
      title={editing ? `تحرير: ${work.title}` : "عمل جديد"}
      preview={preview}
      commit={{
        primary: editing
          ? { label: "حفظ التغييرات", icon: <FloppyDisk />, onClick: save, busy: saving, held: !dirty || uploading }
          : { label: "إضافة العمل", icon: <Plus />, onClick: save, busy: saving, held: uploading },
        cancelHref: "/dashboard/website/works",
        dirty,
      }}
    >
      <FormSection id="details" icon={<Sparkle />} title="تفاصيل العمل">
        <div className="form-grid">
          <Field className="form-full" label="عنوان العمل" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="مثال: قصيدة «حيثُ تُولَد الكلمة»" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Select label="التصنيف" icon={<Tag />} options={WORK_CATEGORY_OPTIONS} value={category} onValueChange={setCategory} optional />
          <Field label="رابط العمل" icon={<LinkSimple />} innerIcon={<LinkSimple />} placeholder="https://…" charset="latin" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} helper="إن تُرك فارغًا فُتِح العمل في عارضٍ داخليّ (صورته)." optional />
        </div>
      </FormSection>

      <FormSection id="image" icon={<ImageIcon />} title="صورة العمل" mark="required">
        <AdImageField bare label="صورة العمل" icon={<ImageIcon />} required value={image} onFile={onFile} onClear={() => setImage(null)} busy={uploading}
          accept={IMAGE_RULE.accept} help={`${attachHint(IMAGE_RULE)}. الصورة هي وجه العمل في المعرض.`} alt="صورة العمل" />
      </FormSection>
    </FormRoom>
  );
}
