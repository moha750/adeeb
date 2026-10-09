"use client";

import type { CSSProperties } from "react";
import type { PubPerson } from "./data";

/**
 * **الوجه** — وحدةُ الصفحة كلّها (قرار المالك ٢٠٢٦-١٠-٠٩: «تهمّني إظهار الوجوه»).
 *
 * - **الصورةُ بمعالجةٍ واحدة**: رماديّةٌ تحت صبغة الهويّة (كحليّ ← فولاذيّ)، فتصير صورُ الجوّالات
 *   المتفرّقة عائلةً واحدة. وتعود ألوانُها حين يُشار إلى صاحبها (`lit`) — الإشارةُ تُحيي الوجه.
 * - **ومن لا صورة له لا يُعطى الأيقونةَ المكرّرة**: حرفُ اسمه الأوّل بخطّ Lyon فوق نقش أدِيب،
 *   بالمقاس والصبغة نفسيهما، فلا تظهر فجوةٌ بين من له صورةٌ ومن ليست له.
 *
 * المقاسُ يُمرَّر قيمةَ CSS (`px` أو `cqi`) في `--pf-s`، والحرفُ يُحسب منه.
 */
export function initialOf(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return Array.from(first)[0] ?? "؟";
}

export function Face({ p, size, lit, className, style }: {
  p: PubPerson;
  size: string;
  lit?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={"pf" + (lit ? " is-lit" : "") + (p.avatar ? "" : " pf-none") + (className ? ` ${className}` : "")}
      style={{ ...style, ["--pf-s" as string]: size }}
      aria-hidden
    >
      {p.avatar ? <img className="pf-img" src={p.avatar} alt="" loading="lazy" draggable={false} /> : <span className="pf-mono">{initialOf(p.name)}</span>}
    </span>
  );
}
