"use client";

import { useId } from "react";
import { X } from "@phosphor-icons/react";
import { Dialog } from "./Dialog";

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
              <X aria-hidden />
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
            <X aria-hidden />
          </button>
        </div>
      )}
      <div className="mdl-body">{children}</div>
      {footer ? <div className="mdl-foot">{footer}</div> : null}
    </Dialog>
  );
}
