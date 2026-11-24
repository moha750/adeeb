"use client";

/**
 * **بطاقةُ «عِرفان» العلنيّة على قالب «القراءة»** (٢٠٢٦-١١-٢٤) — الصفحةُ التي يفتحها رابطُ واتساب (`/irfan/<رمز>`).
 *
 * قارئُها القائدُ الذي وصله العِرفان ومن يشاركه إيّاه، فهي **صفحةُ الشيء الواحد**: اللوحُ يقول لمن ومن مَن («عِرفانٌ إلى …»، ومقعدُه سطرُه،
 * والمرسلُ والموسمُ حقيقتان)، و**البطاقةُ نفسُها بطلُ العمود الجانبيّ** مرسومةً بالرسّام نفسِه وتحتها «احفظ البطاقة» — كبطاقة أدِيب في صفحة
 * العضو. والمتنُ **الرسالةُ نصًّا** تُقرأ بلا تكبير الصورة (عنوانُها تسميتُها)، ثمّ بابُ صاحبها إلى بوّابته حيث تبقى رسائلُه كلُّها.
 * (كانت كرتًا من الهويّة القديمة بصورةٍ وسطرين)
 */
import { useEffect, useState } from "react";
import { CalendarHeart, Envelope, HandHeart, PenNib, Quotes, SignIn } from "@phosphor-icons/react";
import { CaretLeft, DownloadSimple } from "@/app/_components/glyphs";
import { renderIrfanCard, saveIrfanCard, type IrfanCard, type IrfanLook } from "@/lib/irfan/card";
import { PubRead, type PubReadFact } from "../read";
import { AdButton, AdNote } from "../primitives";
import { AdLine, AdSection } from "../account";

export function IrfanShared({ id, card, look }: { id: number; card: IrfanCard; look: IrfanLook }) {
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    renderIrfanCard(card, look).then((b) => {
      url = URL.createObjectURL(b);
      if (alive) setSrc(url);
    }, () => { /* تبقى المساحةُ مصبوغةً بقدّ البطاقة */ });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [card, look]);

  const save = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try { await saveIrfanCard(card, look); } catch (e) { setErr(e instanceof Error ? e.message : "تعذّر حفظ البطاقة."); } finally { setBusy(false); }
  };

  const facts: PubReadFact[] = [
    { icon: <PenNib />, text: `من ${card.from}` },
    ...(card.season ? [{ icon: <CalendarHeart />, text: card.season }] : []),
  ];
  const first = card.to.split(" ")[0];

  const side = (
    <div className="ad-mp-side">
      {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ يرسمها المتصفّح (رابطُ blob) */}
      {src ? <img className="ad-irfan-paper" src={src} alt={`عِرفانٌ إلى ${card.to}`} /> : <span className="ad-irfan-paper" aria-hidden />}
      <AdButton busy={busy} onClick={save} icon={<DownloadSimple />}>احفظ البطاقة</AdButton>
      {err ? <AdNote tone="bad" title={err} onClose={() => setErr(null)} /> : null}
    </div>
  );

  return (
    <PubRead title={`عِرفانٌ إلى ${card.to}`} dek={card.seat || undefined} facts={facts} side={side}>
      <AdSection icon={<Envelope />} title="الرسالة" sub={`كما كتبها ${card.from}`}>
        <AdLine icon={<Quotes />} k={card.title ?? undefined} v={card.body} read />
      </AdSection>
      <AdSection icon={<SignIn />} title="في بوّابة أدِيب" sub="ما يصل القادةَ من أعضاء أدِيب يبقى في بوّاباتهم">
        <AdLine icon={<HandHeart />} k={`رسائلُ ${first}`} v="كلُّها في بوّابته" sub="لمن يدخل بحسابه"
          href={`/dashboard/irfan?m=${id}`} act={{ icon: <CaretLeft />, text: "افتح", label: "افتح البوّابة" }} />
      </AdSection>
    </PubRead>
  );
}
