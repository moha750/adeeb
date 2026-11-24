"use client";

/**
 * **نصُّ جواب ديبو منسّقًا** — التنسيقُ الخفيفُ الذي في الاتّفاق وحده: الفقرات، و**العريض**، والقوائمُ النقطيّة والمرقّمة، والروابطُ
 * **الداخليّة** (`/…`). وما سوى ذلك يُعرض نصًّا كما كُتب. يُبنى عناصرَ React لا HTML، فلا يُحقن شيءٌ في الصفحة أيًّا كان ما كتبه النموذج.
 * ويُرسم والبثُّ جارٍ: سطرٌ لم يكتمل يُعرض كما هو حتى يكتمل.
 */
import Link from "next/link";
import type { ReactNode } from "react";

/** العريضُ والرابطُ الداخليّ في سطرٍ واحد */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${key}-b${i++}`}>{m[1]}</strong>);
    else out.push(<Link key={`${key}-a${i++}`} href={m[3]}>{m[2]}</Link>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const BULLET = /^\s*[-•*]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;

export function DeeboText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushPara = () => {
    if (para.length) blocks.push(<p key={`p${blocks.length}`}>{para.flatMap((l, i) => (i ? [<br key={`br${i}`} />, ...inline(l, `p${blocks.length}-${i}`)] : inline(l, `p${blocks.length}-${i}`)))}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(<Tag key={`l${blocks.length}`}>{list.items.map((it, i) => <li key={i}>{inline(it, `l${blocks.length}-${i}`)}</li>)}</Tag>);
    list = null;
  };
  for (const raw of lines) {
    const ordered = NUMBER.test(raw);
    if (BULLET.test(raw) || ordered) {
      flushPara();
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push(raw.replace(ordered ? NUMBER : BULLET, ""));
    } else if (!raw.trim()) {
      flushPara(); flushList();
    } else {
      flushList();
      para.push(raw);
    }
  }
  flushPara(); flushList();
  // **نصُّ الجواب** قطعةٌ من عائلة ديبو (`.ad-dc-prose`): بوزن القراءة، وفقراتٌ متقاربةٌ كالكلام لا كالمقالة، وقائمةٌ بنقاط الهويّة الكحليّة
  return <div className="ad-dc-prose">{blocks}</div>;
}
