"use client";

import { useRef, useState } from "react";
import { Button, Field, FileButton, SectionCard } from "@adeeb/design-system";
import { KindPicker } from "@/app/dashboard/tools/qr/KindPicker";
import { Globe, ImageSquare, LinkSimple, QrCode, TextAa } from "@phosphor-icons/react";
import { ArrowLeft } from "@/app/_components/glyphs";
import { UPLOAD_RULES, attachHint, fileMeta } from "@/lib/upload";
import type { QrKind } from "@/lib/qrLinks";

/**
 * **شاشةُ الإنشاء بخيارِ النوع** — «رابطٌ أم ملف؟» ببطاقتي اختيار (`KindPicker`) بأيقونتين،
 * اختارها المالك (٢٠٢٦-١٠-٠٨) على شريطٍ مقطعيٍّ أُعدم. نسخةُ معرضٍ من `NewQrView` بلا خادم.
 *
 * الاسمُ أوّلًا، ثمّ الوجهةُ بحسب النوع، والصورةُ تُرفَق بـ`FileButton` (قانونُ المرفقات ق١٤)
 * وتُعايَن تحته بمقاسها.
 */

const RULE = UPLOAD_RULES.qrFile;
const HINT = attachHint(UPLOAD_RULES.qrFileStored);

/** صورةٌ مختارةٌ سلفًا كي تُرى الحالُ الممتلئة بلا اختيار. */
const SAMPLE = { name: "darbak-khadar.jpg", url: "/games/cabinets/darbak-khadar.jpg", size: 46992, type: "image/jpeg" };

type Pick = { name: string; url: string; size: number; type: string } | null;

export function CreateLab() {
  const [title, setTitle] = useState("ملصق دربك خضر");
  const [kind, setKind] = useState<QrKind>("file");
  const [target, setTarget] = useState("");
  const [pick, setPick] = useState<Pick>(SAMPLE);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    setPick({ name: f.name, url: URL.createObjectURL(f), size: f.size, type: f.type });
  };

  const picker = <KindPicker name="kind-lab" value={kind} onChange={setKind} />;

  return (
    <SectionCard headerVariant="soft" icon={<QrCode />} title="اسمُ الباركود ووجهتُه">
      <Field
        label="اسم الباركود"
        icon={<TextAa />}
        innerIcon={<QrCode />}
        placeholder="اكتب اسم الباركود"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        helper="تكتبه لك أنت لتعرفه بين باركوداتك، ولا يظهر لمن يمسحه."
        required
      />

      <div className="mt-4">{picker}</div>

      {kind === "link" ? (
        <div className="mt-4">
          <Field
            label="وجهة الباركود"
            icon={<LinkSimple />}
            innerIcon={<Globe />}
            placeholder="https://adeeb.club"
            dir="ltr"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            helper="انسخ الرابط وألصقه هنا كاملًا."
            required
          />
        </div>
      ) : (
        <div className="mt-4">
          <FileButton
            block
            state={pick ? "ready" : "attach"}
            icon={<ImageSquare />}
            label={pick ? pick.name : "اختر صورةً أو ملفّ PDF"}
            hint={pick ? fileMeta(pick.type, pick.size) : `اضغط أو اسحب الملف إلى هنا : ${HINT}`}
            onClick={() => fileRef.current?.click()}
            onRemove={pick ? () => setPick(null) : undefined}
            removeLabel="إزالة الصورة"
          />
          <input
            ref={fileRef}
            type="file"
            accept={RULE.accept}
            hidden
            onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }}
          />
          {pick ? (
            // eslint-disable-next-line @next/next/no-img-element -- معاينةُ ملفٍّ محلّيّ (blob:) لا أصلٌ ثابت
            <img className="qimg-thumb mt-3" src={pick.url} alt="معاينة الصورة" />
          ) : null}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" size="md" disabled={!title.trim() || (kind === "file" ? !pick : !target.trim())}>
          ابدأ بتصميم الباركود <ArrowLeft size={18} />
        </Button>
      </div>
    </SectionCard>
  );
}
