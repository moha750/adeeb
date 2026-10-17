"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@adeeb/design-system";
import { Camera, ChatCircle, ListBullets } from "@phosphor-icons/react";

const two = (k: number) => String(k).padStart(2, "0");

/**
 * فهرسُ الخبر — **بلغة جانب «أنظمة أدِيب»** (المالك ٢٠٢٦-١٠-١٤): كرتٌ برأسٍ ناعم، وكلُّ
 * فصلٍ برقمه كما يُكتب على لوح فصله في المتن (01، 02…)، والفصلُ الذي تحت العين مضاءٌ
 * بأرض الأبواب ورقمُه بتدرّج العلامة. وسقط الخطُّ الملوّن في حافّة البند.
 *
 * والمضاءُ يُعرَف من التمرير: آخرُ فصلٍ عبر رأسُه خطَّ القراءة (تحت الرأس العلويّ).
 */
/** معرضُ الصور بندٌ في الفهرس (المالك ٢٠٢٦-١٠-١٤) — رقاقتُه كاميرا لا رقم، فليس فصلًا من المتن. */
export const GALLERY_ID = "art-gallery";
/** والتعليقاتُ آخرُ بنوده دائمًا (المالك ٢٠٢٦-١٠-١٤) — رقاقتُها فقاعةُ حديث. والقسمُ قائمٌ في كلّ خبر. */
export const COMMENTS_ID = "art-comments";

export function ArticleToc({ heads: chapters, gallery = false }: { heads: { id: string; text: string }[]; gallery?: boolean }) {
  const heads = [
    ...chapters,
    ...(gallery ? [{ id: GALLERY_ID, text: "معرض الصور" }] : []),
    { id: COMMENTS_ID, text: "التعليقات" },
  ];
  const [on, setOn] = useState<string | null>(heads[0]?.id ?? null);

  useEffect(() => {
    const els = heads.map((h) => document.getElementById(h.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      let cur = els[0]!.id;
      for (const el of els) if (el.getBoundingClientRect().top < 160) cur = el.id;
      setOn(cur);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [chapters, gallery]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="art-toc" aria-label="فهرس الخبر">
      <Card>
        <CardHeader variant="soft" icon={<ListBullets aria-hidden />} title="في هذا الخبر" />
        <ol className="art-toc-l">
          {heads.map((h, i) => (
            <li key={h.id}>
              <a href={`#${h.id}`} aria-current={on === h.id ? "true" : undefined}>
                <i aria-hidden>
                  {h.id === GALLERY_ID ? <Camera size={14} /> : h.id === COMMENTS_ID ? <ChatCircle size={14} /> : two(i + 1)}
                </i>
                <span>{h.text}</span>
              </a>
            </li>
          ))}
        </ol>
      </Card>
    </nav>
  );
}

