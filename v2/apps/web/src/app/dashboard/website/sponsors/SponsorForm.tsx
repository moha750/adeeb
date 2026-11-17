"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Textarea } from "@adeeb/design-system";
import { Buildings, ChatText, FloppyDisk, Image as ImageIcon, LinkSimple, SealCheck, Sparkle, TextAlignRight, TextT } from "@phosphor-icons/react";
import { PencilSimple, Plus } from "@/app/_components/glyphs";
import { useToast } from "../../_components/ToastProvider";
import type { SponsorEditData } from "./data";
import { createSponsor, updateSponsor, uploadSponsorLogo, type SponsorInput } from "./actions";
import { AdBadge, AdCard, type AdMeta } from "@/app/_ad/primitives";
import { AdImageField, FormRoom, FormSection, FormWith } from "@/app/_ad/form";
import { UPLOAD_RULES, checkFile, limitText, shrinkImage } from "@/lib/upload";

// وصفةُ الصورة من قانون المرفقات (`lib/upload`) — الحدُّ والصيغُ وجملُ الرفض هناك
const IMAGE_RULE = UPLOAD_RULES.siteImage;

export function SponsorForm({ sponsor }: { sponsor?: SponsorEditData | null }) {
  const toast = useToast();
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState(sponsor?.name ?? "");
  const [badge, setBadge] = useState(sponsor?.badge ?? "");
  const [linkUrl, setLinkUrl] = useState(sponsor?.linkUrl ?? "");
  const [description, setDescription] = useState(sponsor?.description ?? "");
  const [logo, setLogo] = useState<string | null>(sponsor?.logoUrl ?? null);

  const editing = sponsor != null;

  const onFile = async (file: File) => {
    // بوّابةُ قانون المرفقات قبل الشبكة: لا يُرفع ما سيُردّ، ولا ينتظر صاحبُه ليُقال له
    const why = checkFile(file, IMAGE_RULE);
    if (why) { toast.error(why); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      // تُصغَّر إلى مقاس عرضها قبل الرفع (`shrinkImage`): أخفُّ على الزائر، وأبعدُ عن حدّ جسم فعل الخادم
      fd.append("file", await shrinkImage(file, IMAGE_RULE));
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
      const r = editing ? await updateSponsor(sponsor.id, input) : await createSponsor(input);
      if (r.ok) {
        toast.success(r.message);
        router.push("/dashboard/website/sponsors");
        router.refresh();
      } else toast.error(r.message);
    });
  };

  /* التذكرةُ كما ستظهر في غرفة الرعاة (`_ad/rooms/SponsorsRoom`): الوسمُ شارتُها، والنبذةُ ونطاقُ الرابط سطراها (والكعبُ ترتيبُه في الغرفة) */
  const host = (u: string) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return u; } };
  const meta: AdMeta[] = [
    ...(description.trim() ? [{ icon: <TextAlignRight />, text: description.trim() }] : []),
    ...(linkUrl.trim() ? [{ icon: <LinkSimple />, text: host(linkUrl.trim()) }] : []),
  ];
  const preview = (
    <div className="ad-form-preview-card" data-untitled={name.trim() ? undefined : ""}>
      <AdCard seed={sponsor?.id ?? "new-sponsor"} chips={badge.trim() ? <AdBadge>{badge.trim()}</AdBadge> : undefined} title={name.trim() || "اسم الراعي"}
        meta={meta.length ? meta : [{ icon: <TextAlignRight />, text: "بلا نبذة", tone: "muted" }]} />
    </div>
  );

  return (
    <FormRoom
      title={editing ? `تحرير: ${sponsor.name}` : "راعٍ جديد"}
      preview={preview}
      commit={{
        primary: editing
          ? { label: "حفظ التغييرات", icon: <FloppyDisk />, onClick: save, busy: saving, held: !dirty || uploading }
          : { label: "إضافة الراعي", icon: <Plus />, onClick: save, busy: saving, held: uploading },
        cancelHref: "/dashboard/website/sponsors",
        dirty,
      }}
    >
      {/* الشعارُ بجانب حقول الراعي لا قسمٌ وحده (محمد ٢٠٢٦-١١-٠٧: «القسمُ المخصّص للشعار فقط في مكان والباقي كلُّه فارغ») */}
      <FormSection id="details" icon={<Sparkle />} title="تفاصيل الراعي">
        <FormWith aside={
          <AdImageField label="الشعار" icon={<ImageIcon />} required shape="square" value={logo} onFile={onFile} onClear={() => setLogo(null)} busy={uploading}
            accept={IMAGE_RULE.accept} help={`مربّعٌ شفّاف الخلفيّة، 512\u00a0بكسل فأكثر، ${limitText(IMAGE_RULE)}`} alt="شعار الراعي" />
        }>
          <div className="form-grid">
            <Field className="form-full" label="اسم الراعي" icon={<Buildings />} innerIcon={<PencilSimple />} placeholder="مثال: مؤسّسة كذا" value={name} onChange={(e) => setName(e.target.value)} required />
            <Field label="الوسم" icon={<SealCheck />} innerIcon={<PencilSimple />} placeholder="مثال: راعٍ ذهبيّ، شريك استراتيجيّ" value={badge} onChange={(e) => setBadge(e.target.value)} optional />
            <Field label="الرابط" icon={<LinkSimple />} innerIcon={<LinkSimple />} placeholder="https://…" charset="latin" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} optional />
            <Textarea className="form-full" label="نبذة" icon={<TextT />} innerIcon={<ChatText />} placeholder="سطرٌ يعرّف بالراعي أو بطبيعة الشراكة" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} optional />
          </div>
        </FormWith>
      </FormSection>
    </FormRoom>
  );
}
