"use client";

import { useId } from "react";
import { Dialog } from "./Dialog";

/**
 * صليبُ الإغلاق — مرسومٌ ههنا لا مُستورَدًا: المكتبة لا تعتمد حزمةَ أيقونات (انظر
 * {@link BurgerIcon})، فلو استوردت واحدةً لجرّت على كلّ مستهلكٍ تبعيّةً لا يلزمه.
 */
function CloseMark() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false">
      <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
    </svg>
  );
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  /**
   * إجراء يعمل الآن — يُبطِل مخارج الإغلاق التي تملكها النافذة (زرّ × وESC).
   * زرّ الإلغاء في التذييل يملكه المستدعي، فيُعطّله بنفسه.
   */
  busy?: boolean;
  /** وضع الغلاف: يستبدل الترويسة بغلاف منقوش (مع زرّ الإغلاق)، ويعرض هذا العنصر (الأفتار) متراكبًا عليه. العنوان يصير مخفيًّا للقارئ الصوتيّ. */
  hero?: React.ReactNode;
};

/**
 * نافذة حواريّة — سلوك يدويّ كامل عبر بدائيّة {@link Dialog} (فخّ تركيز · قفل تمرير الخلفية · ESC ·
 * ARIA · إرجاع التركيز · حركة دخول/خروج) بمظهر Aurora المعتمد (بادئة .mdl). واجهةٌ مُتحكَّم بها كما كانت.
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md", className, busy, hero }: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const hasDesc = !!description;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      contentClassName={"mdl mdl-" + size + (className ? " " + className : "")}
      labelledBy={titleId}
      describedBy={hasDesc ? descId : undefined}
    >
      {hero ? (
        <>
          <div className="pvb-cover">
            <button type="button" className="mdl-x" aria-label="إغلاق" onClick={onClose} disabled={busy}>
              <CloseMark />
            </button>
          </div>
          {hero}
          <h2 id={titleId} className="sr-only">{title ?? "نافذة"}</h2>
          {hasDesc ? <p id={descId} className="sr-only">{description}</p> : null}
        </>
      ) : (
        <div className="mdl-head">
          <div>
            <h2 id={titleId} className={title ? "mdl-title" : "sr-only"}>{title ?? "نافذة"}</h2>
            {hasDesc ? <p id={descId} className="mdl-desc">{description}</p> : null}
          </div>
          <button type="button" className="mdl-x" aria-label="إغلاق" onClick={onClose} disabled={busy}>
            <CloseMark />
          </button>
        </div>
      )}
      <div className="mdl-body">{children}</div>
      {footer ? <div className="mdl-foot">{footer}</div> : null}
    </Dialog>
  );
}
