"use client";

import { useRef, useState } from "react";
import { AnchoredPopover } from "@adeeb/design-system";
import { LinkSimple, ShareNetwork, Clock } from "@phosphor-icons/react";
import { Check } from "@/app/_components/glyphs";
import { copyText } from "@/lib/clipboard";
import { useSavedPosition } from "@/lib/radio/progress";
import { formatDuration } from "../../dashboard/radio/vocab";
import { useRadioPlayer } from "./PlayerProvider";

/**
 * مشاركةُ الحلقة — **فعلٌ على الحلقة لا على التشغيل.**
 *
 * كانت في شريط المشغّل، وذلك موضعُ راحةِ الباني لا نموذجِ المستخدم: من أراد
 * أن يشارك حلقةً لا يبحث عن زرِّه بين أزرار الصوت والسرعة. فنُقلت إلى صدر
 * صفحة الحلقة حيث عنوانُها وتاريخُها (قرار المالك ٢٠٢٦-٠٨-١٣).
 *
 * ══ ومشاركةٌ **بلحظة** (٢٠٢٦-٠٨-١٨) ══
 * «سمعتُ شيئًا فأردتُ أن أُسمعَه غيري» هو أكثرُ ما يُشارَك من حديثٍ طويل،
 * ورابطٌ عارٍ يرمي صاحبَه في أوّل واحدٍ وعشرين دقيقة. ويوتيوب وPocket Casts
 * وSoundCloud كلُّها تعطيها، وسبوتيفاي تقرأ `?t=` ولا تعطي بابًا لصنعه.
 *
 * **والخياران يُعرَضان ولا يُخمَّن أحدُهما**: لو شاركنا الموضعَ ضمنًا كلَّما كان
 * ثمّ موضعٌ لفوجئ من أراد الحلقةَ كلَّها برابطٍ يبدأ من وسطها ولا يدري لماذا.
 * فتُفتح لوحةٌ بسطرين حين يكون ثمّ موضعٌ يُشارَك، ويبقى الزرُّ فعلًا واحدًا
 * مباشرًا حين لا موضع — فلا لوحةَ بخيارٍ واحد.
 *
 * والموضعُ من العامل إن كانت هي العاملة، وإلّا فمن المخزن: من عاد إلى حلقةٍ
 * سمع نصفَها يشارك من حيث وقف، وهو ما يقصده.
 *
 * ولا إشعارَ في الموقع العامّ: الزرُّ نفسُه يقول «نُسخ» بعلامة صحٍّ لحظتين،
 * **ومعه منطقةٌ حيّةٌ** فيسمعها من لا يرى الزرّ (وكان التبدّلُ صامتًا لقارئ الشاشة).
 */
export function ShareEpisode({
  title, showTitle, episodeId, seconds,
}: {
  title: string;
  showTitle: string;
  episodeId: string;
  seconds: number | null;
}) {
  const p = useRadioPlayer();
  const saved = useSavedPosition(episodeId, seconds ?? 0);
  const [shared, setShared] = useState(false);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  /** موضعٌ يستحقّ أن يُشارَك: من العامل إن كانت هي، وإلّا من المخزن. */
  const at = Math.floor(p.current?.id === episodeId ? p.time : saved);
  const hasAt = at > 0;

  const share = async (withTime: boolean) => {
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("t");
    if (withTime) url.searchParams.set("t", String(at));
    try {
      if (navigator.share) await navigator.share({ title, text: showTitle, url: url.toString() });
      else await copyText(url.toString());
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* أُلغيت المشاركة أو مُنعت الحافظة، فلا شيء يُقال */ }
  };

  return (
    <>
      <button ref={btnRef} type="button" className="stn-opt"
        aria-expanded={hasAt ? open : undefined}
        onClick={() => (hasAt ? setOpen((v) => !v) : void share(false))}>
        {shared ? <Check size={15} aria-hidden /> : <ShareNetwork size={15} aria-hidden />}
        {shared ? "نُسخ الرابط" : "مشاركة"}
      </button>
      {/* ما تبدّل في الزرّ يُقال مرّةً لمن يسمع الصفحة ولا يراها */}
      <span className="sr-only" role="status">{shared ? "نُسخ الرابط" : ""}</span>

      {hasAt ? (
        <AnchoredPopover open={open} anchorRef={btnRef} onDismiss={() => setOpen(false)}
          align="start" className="dm-menu" role="menu">
          <button type="button" className="dm-item" role="menuitem" onClick={() => void share(false)}>
            <LinkSimple className="dm-ic" aria-hidden />
            رابط الحلقة
          </button>
          <button type="button" className="dm-item" role="menuitem" onClick={() => void share(true)}>
            <Clock className="dm-ic" aria-hidden />
            من الدقيقة <bdi dir="ltr">{formatDuration(at)}</bdi>
          </button>
        </AnchoredPopover>
      ) : null}
    </>
  );
}
