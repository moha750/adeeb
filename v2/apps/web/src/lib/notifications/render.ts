/**
 * **رسمُ الإشعار** — من مفتاح النوع ومفتاح المخاطَب والحقائق إلى ما يُقرأ، بجنس قارئه.
 * يستعمله الصندوقُ (عند العرض)، والموزِّعُ (نصُّ شاشة القفل والعنوانُ الاحتياطيّ)، والمعرض.
 *
 * **ولا يرمي أبدًا**: نوعٌ حُذف من الدليل، أو حقائقُ ناقصةٌ كسرت دالّةَ النصّ، يُرسَم بعنوانه
 * الاحتياطيّ بلا وِجهة. فصفٌّ واحدٌ معطوب لا يُسقط الصندوقَ كلَّه.
 */
import { SECTIONS, kindOf } from "./catalog";
import type { IconKey } from "@/app/dashboard/_shell/icons";
import type { Gender, Level } from "./types";

export type RenderedNote = {
  icon: IconKey;
  level: Level;
  title: string;
  body: string | null;
  href: string | null;
};

/**
 * المسارُ داخليٌّ أو لا شيء — توأمُ `safePath` في `lib/push/send.ts`.
 *
 * و`/` في أوّله لا تكفي (من المراجعة، ٢٠٢٦-١٠-١٠): المتصفّحُ يقرأ `/\evil.com` و`/\t/evil.com`
 * عنوانًا خارجيًّا (الخطُّ المائلُ العكسيّ يُعامَل معاملةَ `/`، والفراغاتُ الخفيّة تُنزَع). فيُرفض
 * ما بعد `/` الأولى من `/` أو `\`، وكلُّ خطٍّ عكسيٍّ أو فراغٍ أو محرفِ تحكّمٍ في أيّ موضع.
 */
const INTERNAL = /^\/(?![/\\])[^\\\s\u0000-\u001f\u007f]*$/;

export function internalHref(href: string | null | undefined): string | null {
  return href && INTERNAL.test(href) ? href : null;
}

export function renderNote(
  kind: string,
  audience: string,
  facts: unknown,
  gender: Gender,
  fallback?: string | null,
): RenderedNote {
  const k = kindOf(kind);
  const a = k?.audiences.find((x) => x.key === audience);
  const orphan: RenderedNote = {
    icon: k ? SECTIONS[k.section].icon : "gear",
    level: a?.level ?? "normal",
    title: fallback?.trim() || "إشعار",
    body: null,
    href: null,
  };
  if (!k || !a) return orphan;
  try {
    const t = a.text(facts, gender);
    return {
      icon: SECTIONS[k.section].icon,
      level: a.level,
      title: t.title,
      body: t.body?.trim() || null,
      href: internalHref(a.href(facts)),
    };
  } catch {
    return orphan;
  }
}
