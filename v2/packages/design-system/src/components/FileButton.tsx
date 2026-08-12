import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { IconButton } from "./IconButton";

/**
 * حالُ المرفق — **ستٌّ متنافيةٌ لا تجتمع**، فالزرّ يحكي قصّةً واحدة في اللحظة:
 * `attach` دعوةٌ للإرفاق · `ready` مرفقٌ حاضر · `uploading` يُرفع الآن ·
 * `success` تمّ الرفع · `error` تعذّر · `empty` لا ملفَّ مرفوق.
 */
export type FileButtonState = "attach" | "ready" | "uploading" | "success" | "error" | "empty";

export interface FileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** أيقونةُ القرص المتدرّج (مشبك/ملفّ). وفي `uploading` تحلّ محلَّها دائرةٌ تدور. */
  icon: ReactNode;
  /** العنوان: اسمُ الملفّ أو «إرفاق ملفّ». */
  label: ReactNode;
  /** سطرٌ صغيرٌ تحته (اختياريّ): «اضغط للتنزيل» · «PDF أو صورة · اختياريّ». */
  hint?: ReactNode;
  /** أيقونةُ الفعل في الطرف (تنزيل/إضافة). يُهمَل إن طُلبت الإزالة: طرفٌ واحدٌ لا طرفان. */
  trailing?: ReactNode;
  /** يملأ عرض حاويته. */
  block?: boolean;
  /** حالُ المرفق. الافتراضيّ `attach` (دعوةُ الإرفاق). */
  state?: FileButtonState;
  /** ملفٌّ مسحوبٌ فوق الزرّ الآن (يملكها المستدعي مع مستمعات السحب). */
  dragging?: boolean;
  /** إزالةُ المرفق — يظهر زرٌّ مستقلٌّ في الطرف حين تُمرَّر. */
  onRemove?: () => void;
  /** اسمُ زرّ الإزالة للقارئ الآليّ. */
  removeLabel?: string;
}

/**
 * زرُّ المرفق — **هويّةٌ خاصّةٌ بالمرفقات لا شبحٌ بحدّ**: قرصٌ مصمَتٌ بتدرّج الهوية يحمل الأيقونة،
 * وجسمٌ بتينت العلامة، وعنوانٌ (يُقصَّر إن طال) وتلميحٌ، وأيقونةُ فعلٍ في الطرف.
 *
 * **والحالةُ تُقال بثلاث لا بالنصّ وحده:** شكلُ الحدّ (متقطّعٌ لمكانٍ فارغٍ ينتظر، مصمتٌ لشيءٍ
 * وُجد)، ونغمةُ القرص والإطار، والتلميحُ نصًّا. والأيقونةُ تبقى من المستدعي إلّا في الرفع.
 *
 * **و«لا ملفّ» خبرٌ لا زرّ:** في `empty` يُرسَم عنصرًا ساكنًا (`div`) لا زرًّا معطّلًا — التعطيلُ
 * رسالتُه «الفعل غير متاح» وهي غيرُ «لا شيء هنا» (القاعدة ٧). الأنماط `.afile-*` في components.css.
 */
export function FileButton({
  icon,
  label,
  hint,
  trailing,
  block,
  state = "attach",
  dragging,
  onRemove,
  removeLabel = "إزالة المرفق",
  className,
  disabled,
  type,
  ...props
}: FileButtonProps) {
  const busy = state === "uploading";
  const inert = state === "empty";
  const cls = cn(
    "afile",
    `afile-${state}`,
    block && "afile-block",
    dragging && "afile-dragging",
    onRemove && !inert && "afile-hasrm",
    className,
  );

  const inner = (
    <>
      {/* إطارُ الحدّ — بلا viewBox كي تبقى الشرطةُ بطولها المكتوب مهما اتّسع الزرّ */}
      <svg className="afile-frame" aria-hidden focusable="false">
        <rect x="0" y="0" width="100%" height="100%" rx="15" />
      </svg>
      <span className="afile-ic" aria-hidden>{busy ? <span className="abtn-spin" /> : icon}</span>
      <span className="afile-body">
        <span className="afile-label">{label}</span>
        {hint ? <span className="afile-hint">{hint}</span> : null}
      </span>
      {/* طرفٌ واحدٌ لا طرفان: زرُّ الإزالة يأخذ مكان أيقونة الفعل متى طُلب (القاعدة ٨) */}
      {trailing && !onRemove ? <span className="afile-go" aria-hidden>{trailing}</span> : null}
    </>
  );

  if (inert) {
    // ساكنٌ لا يُضغط: تُسقَط معالجاتُ الزرّ، والباقي (id/style/title) يمرّ كما هو
    const { onClick: _onClick, ...rest } = props;
    return (
      <div className={cls} {...(rest as HTMLAttributes<HTMLDivElement>)}>
        {inner}
      </div>
    );
  }

  const button = (
    <button
      type={type ?? "button"}
      className={cls}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {inner}
    </button>
  );

  if (!onRemove) return button;

  // زرٌّ داخل زرٍّ لا يجوز في HTML، فالإزالةُ شقيقةٌ فوق الجسم لا ابنةٌ له
  return (
    <span className={cn("afile-wrap", block && "afile-wrap-block")}>
      {button}
      <IconButton
        className="afile-rm"
        tone="danger"
        size="md"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={onRemove}
        disabled={busy}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
        </svg>
      </IconButton>
    </span>
  );
}
