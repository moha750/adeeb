"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, PencilSimple } from "@/app/_components/glyphs";
import { Compass, Envelope } from "@phosphor-icons/react";
import { AdLine } from "@/app/_ad/account";
import { AdButton, AdNote } from "@/app/_ad/primitives";

/**
 * **أجزاءُ البابين** — مفرداتٌ واحدةٌ للبوّابة والإنشاء والاستعادة، أصنافُها `.door-*` في
 * `components.css`. (كانت حوارًا مع ديبو — `Says`/`Reply` — ثمّ اعتمد المالك ٢٠٢٦-١٠-١٨ شكلَ
 * «القسمين»: ديبو في لوح الهويّة، والنموذجُ نموذجٌ مألوف.)
 */

/**
 * رأسُ الخطوة بلغة عناوين الموقع («الرأس المذهّب» — `LandingHeading`): عينٌ كبيرةٌ تتلاشى إلى
 * الأرض، والعنوانُ بتدرّج الهويّة على تظليلٍ كقلم التحديد، وسطرٌ تحته. ويلتفّ إن طال (عناوينُ
 * الخطوات أطولُ من كلمتين)، والتظليلُ يتبع كلَّ سطر.
 */
export function Head({ children, kicker, sub }: { children: ReactNode; kicker?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="door-head">
      {kicker ? <p className="door-kicker" aria-hidden>{kicker}</p> : null}
      <h1 className="door-title">
        <span className="door-mark"><span className="door-ink">{children}</span></span>
      </h1>
      {sub ? <p className="door-sub">{sub}</p> : null}
    </header>
  );
}

/**
 * تنبيهٌ في الخطوة: خطأٌ، أو «ليس لك حسابٌ» ومعه ما يُكمل. هو `Alert` الموقع نفسُه — فتنبيهاتُ
 * البوّابة والإنشاء والاستعادة والتعيين بهيئةٍ واحدة.
 */
export function Note({
  tone, title, children, actions,
}: { tone: "error" | "warn"; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return <DoorAlert tone={tone === "error" ? "danger" : "warning"} title={title} actions={actions}>{children}</DoorAlert>;
}

/**
 * **تنبيهُ الباب** (٢٠٢٦-١١-٢٣): في الهويّة الجديدة «الملاحظة» (`AdNote`) بنغمتها وفعلِها وزرِّ إغلاقها — القطعةُ نفسُها في البوّابة والموقع.
 */
type AlertTone = "danger" | "warning" | "info" | "success" | "neutral";
const NOTE_TONE = { danger: "bad", warning: "warn", info: "info", success: "ok", neutral: "info" } as const;
export function DoorAlert({ tone, title, children, actions, onClose }: {
  tone: AlertTone; title?: ReactNode; children?: ReactNode; actions?: ReactNode; onClose?: () => void;
  /** من `Alert` القديم، لا أثرَ له في «الملاحظة» */
  compact?: boolean;
}) {
  return <AdNote tone={NOTE_TONE[tone]} title={title} action={actions} onClose={onClose}>{children}</AdNote>;
}

/**
 * **زرُّ الباب** (٢٠٢٦-١١-٢٣): زرُّ الهويّة (`.ad-btn`) بنوعَي الخطوة — `primary` قطعةُ اللوح، و`ghost` الصندوقُ الأبيضُ بختمه (`icon`) —
 * وبالمقاسات الثلاثة، ويُرسل النموذجَ (`type="submit"`) ويدور حين يعمل.
 */
type BtnProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  type?: "button" | "submit"; variant?: "primary" | "ghost"; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: ReactNode;
};
export function Btn({ variant = "primary", size = "md", loading, disabled, icon, className, children, type = "button", ...rest }: BtnProps) {
  const cls = `ad-btn ${variant === "primary" ? "ad-btn-fill" : "ad-btn-line"}${size === "lg" ? " ad-btn-lg" : size === "sm" ? " ad-btn-sm" : ""}${className ? ` ${className}` : ""}`;
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="ad-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

/** رابطٌ بهيئة زرّ الباب الثانويّ (بختمه). */
export function LinkBtn({ href, icon, children, className }: { href: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`ad-btn ad-btn-line${className ? ` ${className}` : ""}`}>
      {icon}
      {children}
    </Link>
  );
}

/**
 * **ما اخترتَه أو كتبتَه** (البريد، سببُ مجيئك) سطرُ «حسابي» (`AdLine`، ٢٠٢٦-١١-٢٣): رمزُه في مربّعه، والتسميةُ فوق القيمة، و«تغيير» في طرفه —
 * والسطرُ كلُّه زرُّ التعديل يعيدك إلى خطوته، على ورقة الهويّة. (كانت شارةً بقلمٍ صُنعت للباب)
 */
export function Chip({ children, onEdit, ltr, label }: { children: ReactNode; onEdit: () => void; ltr?: boolean; label: string }) {
  return (
    <ul className="ad-lines door-pick">
      <AdLine icon={ltr ? <Envelope /> : <Compass />} k={ltr ? "بريدك" : "سبب مجيئك"} v={String(children)} ltr={ltr}
        onClick={onEdit} act={{ icon: <PencilSimple />, text: "تغيير", label }} />
    </ul>
  );
}

/** رجوعٌ إلى الخطوة السابقة: زرُّ الهويّة الصغيرُ بختم السهم في أوّل السطر (٢٠٢٦-١١-٢٣؛ كان رابطًا نصّيًّا بسهمٍ صُنع للباب). */
export function Back({ onClick, children = "رجوع" }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" className="ad-btn ad-btn-line ad-btn-sm door-back-ad" onClick={onClick}>
      <ArrowRight />
      {children}
    </button>
  );
}

/** طرقُ الخطوة كتلةً واحدة (`ad.css`: الأختامُ عمودٌ واحد، وكلُّ اسمٍ يبدأ بعد ختمه من خطٍّ واحد). */
export function Ways({ children, label }: { children: ReactNode; label?: string }) {
  return <div className="door-ways" role="group" aria-label={label}>{children}</div>;
}

/**
 * طريقٌ من طرق الخطوة: زرُّ الهويّة الكبير (`ad-btn-lg`) — `main` قطعةُ اللوح لأوّل الطرق وحده، وما سواه الصندوقُ بختمه (٢٠٢٦-١١-٢٣).
 * و«آخر دخول» **لسانٌ يخرج من حافّته العليا** (محمد ٢٠٢٦-١١-٢٣): من مادّة الزرّ لونًا وخطًّا، ويتبعه في المرور والضغط. أخُ الزرّ لا ابنُه،
 * فالزرُّ يقصّ ما يخرج منه (لمعتُه). (رُدّت: الشارةُ الطافية القديمة، وشارةُ الهويّة عليها، وفي طرف الزرّ، وبجانب الاسم)
 */
export function Way({
  icon, children, tag, onClick, disabled, busy, main,
}: { icon?: ReactNode; children: ReactNode; tag?: ReactNode; onClick: () => void; disabled?: boolean; busy?: boolean; main?: boolean }) {
  return (
    <div className="door-way-wrap">
      <button
        type="button"
        className={`ad-btn ad-btn-lg ${main ? "ad-btn-fill" : "ad-btn-line"} door-way`}
        onClick={onClick}
        disabled={disabled}
        aria-busy={busy || undefined}
      >
        {busy ? <span className="ad-spin" aria-hidden /> : icon}
        <span>{children}</span>
        {tag ? <span className="sr-only">، {tag}</span> : null}
      </button>
      {tag ? <span className="door-last" aria-hidden><span>{tag}</span></span> : null}
    </div>
  );
}

/**
 * **البابُ الآخر في ذيل الخطوة — سطرُ الطريق الآخر** (`.ad-alt`، ٢٠٢٦-١١-٢٣): «ليس لك حساب؟» بحبرٍ ثانٍ وبجانبها زرُّ الهويّة الصغير، بلا صندوقٍ
 * ولا مربّع — فلا يُقرأ تنبيهًا ينافس الطرق: هو طريقٌ جانبيٌّ لمن أخطأ الباب. (جُرّبت «الملاحظة» `AdNote` فصار كالتحذير، وقبلها شريطٌ صُنع للباب)
 */
export function AltLink({ lead, href, children }: { lead: ReactNode; href: string; children: ReactNode }) {
  return (
    <p className="ad-alt">
      <span>{lead}</span>
      <AdButton size="sm" href={href} icon={<ArrowLeft />} iconEnd>{children as string}</AdButton>
    </p>
  );
}

/** حقولُ الخطوة وزرُّها. */
export function Fields({ children }: { children: ReactNode }) {
  return <div className="door-fields">{children}</div>;
}
