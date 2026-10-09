"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button, Field, FileButton, Modal } from "@adeeb/design-system";
import { File as FileIcon, FilePdf, Globe, ImageSquare, LinkSimple, QrCode, TextAa } from "@phosphor-icons/react";
import { QR_TITLE_MAX, checkTarget, qrFileType, type QrKind } from "@/lib/qrLinks";
import { UPLOAD_RULES, attachHint, fileMeta } from "@/lib/upload";
import { checkQrFile, isPdf } from "@/lib/qrFile";
import { useToast } from "../../_components/ToastProvider";
import { KindPicker } from "./KindPicker";

const PICK_RULE = UPLOAD_RULES.qrFile;
const HINT = attachHint(UPLOAD_RULES.qrFileStored);

/**
 * **نافذةُ تعديل الوجهة — مصدرٌ واحدٌ لبابين.**
 *
 * كانت مكتوبةً حرفًا بحرفٍ في القائمة وفي صفحة الإحصاء: عنوانُها ووصفُها وحقلاها
 * ومساعداهما. ونصٌّ يُنسَخ يفترق: تُصحَّح كلمةٌ في أحدهما وتبقى في أخيه (جُرد ٢٠٢٦-٠٩-٠٥).
 *
 * **وتصدّق قبل أن ترسل** (وهو ما كان يفعله بابُ الإنشاء وحده): الاسمُ يُقصّ عند حدّ
 * القاعدة، والوجهةُ تمرّ بـ`checkTarget` فيُقال العطبُ تحت الحقل ويُقفَل زرُّ الحفظ.
 * فالخادمُ يعيد التصديق على كلّ حال (الفحصُ في المتصفّح تجربةٌ لا حراسة)، لكنّ الرسالةَ
 * تصل قبل السفر لا بعده.
 *
 * **والنوعُ يتحوّل هنا** (م٢٣ وم٢٤): بطاقتا «رابط / ملف» نفسُهما في شاشة الإنشاء، والحقلُ تحتهما
 * يتبع المختار. الملصقُ يحمل ‎/q/<code>‎ في الحالين، فالتحويلُ وجهةٌ كسائر الوجهات. والملفُّ
 * المختارُ لا يُرفع قبل «حفظ»: من اختار ثمّ ألغى لم يترك في الدلو ملفًّا.
 */
export function EditTargetModal({
  open, title, target, pending, onTitle, onTarget, onClose, onSave,
  kind, onKind, current, picked = null, onPick,
}: {
  open: boolean;
  title: string;
  target: string;
  pending: boolean;
  onTitle: (v: string) => void;
  onTarget: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
  /** النوعُ المختارُ في النافذة الآن، وقد يخالف نوعَ الباركود (تحويل). */
  kind: QrKind;
  onKind: (v: QrKind) => void;
  /** الملفُّ الحاليّ إن كان الباركودُ ملفًّا: مسارُه ورابطُه. */
  current: { path: string; url: string } | null;
  /** الملفُّ المختارُ بدله، ولم يُرفع بعد. */
  picked?: File | null;
  onPick: (file: File | null) => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const isFile = kind === "file";

  const trimmed = target.trim();
  const link = !isFile && trimmed ? checkTarget(trimmed) : null;
  const bad = link && !link.ok ? link.message : null;
  const ready = title.trim().length > 0 && (isFile ? !!picked || !!current : !!link?.ok);

  // معاينةُ المختار إن كان صورة: رابطٌ محلّيٌّ يُحرَّر حين يتبدّل الملفّ
  const pickedUrl = useMemo(() => (picked && !isPdf(picked) ? URL.createObjectURL(picked) : null), [picked]);
  useEffect(() => () => { if (pickedUrl) URL.revokeObjectURL(pickedUrl); }, [pickedUrl]);

  const accept = (file: File | undefined) => {
    if (!file) return;
    // الرفضُ إشعارٌ يسمّي الملفّ، والمرفَقُ القائمُ يبقى (قانونُ المرفقات ق١٤)
    const why = checkQrFile(file);
    if (why) { toast.error(`لم يُقبل «${file.name}» : ${why}`); return; }
    onPick(file);
  };

  // ما سيراه الماسح: المختارُ إن اختير، وإلّا الحاليّ. والمعاينةُ للصورة وحدها
  const shownPdf = picked ? isPdf(picked) : current ? qrFileType(current.path) === "pdf" : false;
  const preview = picked ? pickedUrl : current && !shownPdf ? current.url : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      busy={pending}
      title="تعديل وجهة الباركود"
      description={
        isFile
          ? "الملفُّ يتبدّل والباركود المطبوعُ لا يتغيّر، فمن يمسحه بعد الحفظ يرى الملف الجديد."
          : "الوجهةُ تتبدّل والباركود المطبوعُ لا يتغيّر، فمن يمسحه بعد الحفظ يصل إلى الوجهة الجديدة."
      }
      footer={
        <>
          <Button variant="primary" size="md" loading={pending} disabled={!ready} onClick={onSave}>حفظ</Button>
          <Button variant="ghost" size="md" disabled={pending} onClick={onClose}>إلغاء</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field
          className="form-full"
          label="اسم الباركود"
          icon={<TextAa />}
          innerIcon={<QrCode />}
          placeholder="اكتب اسم الباركود"
          value={title}
          onChange={(e) => onTitle(e.target.value.slice(0, QR_TITLE_MAX))}
          helper="تكتبه لك أنت لتعرفه بين باركوداتك، ولا يظهر لمن يمسحه."
          required
        />
        <div className="form-full">
          <KindPicker name="qr-kind-edit" value={kind} onChange={onKind} disabled={pending} />
        </div>
        {isFile ? (
          <div className="form-full">
            <FileButton
              block
              state={picked || current ? "ready" : "attach"}
              icon={shownPdf ? <FilePdf /> : picked || current ? <ImageSquare /> : <FileIcon />}
              label={picked ? picked.name : current ? "الملف الحاليّ" : "اختر صورةً أو ملفّ PDF"}
              hint={
                picked ? fileMeta(picked.type, picked.size)
                  : current ? `اضغط لاختيار ملفٍّ بدله : ${HINT}`
                  : `اضغط لاختيار الملف : ${HINT}`
              }
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              onRemove={picked ? () => onPick(null) : undefined}
              removeLabel="التراجع عن الملف المختار"
            />
            <input
              ref={fileRef}
              type="file"
              accept={PICK_RULE.accept}
              hidden
              onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }}
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- صورةُ المخزن أو ملفٌّ محلّيّ (blob:)، لا أصلٌ ثابت
              <img className="qimg-thumb mt-3" src={preview} alt="الصورة التي يراها من يمسح الباركود" />
            ) : null}
          </div>
        ) : (
          <Field
            className="form-full"
            label="الوجهة"
            icon={<LinkSimple />}
            innerIcon={<Globe />}
            placeholder="https://adeeb.club"
            dir="ltr"
            value={target}
            onChange={(e) => onTarget(e.target.value)}
            helper="حيثما يصل من يمسح الباركود."
            error={bad ?? undefined}
            required
          />
        )}
      </div>
    </Modal>
  );
}
