"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@adeeb/design-system";
import { HandHeart, Image as ImageIcon, SignIn } from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import { renderIrfanCard, saveIrfanCard, type IrfanCard, type IrfanLook } from "@/lib/irfan/card";
import { CaretAct, Row } from "@/app/dashboard/_portal/Row";

/**
 * البطاقةُ في صفحتها العلنيّة: مرسومةً بالرسّام نفسِه (لا الصورةُ المصغّرة المرفوعة للمعاينة)، وتحتها
 * حفظُها، وبابُ صاحبها إلى بوّابته حيث تبقى رسائلُه كلُّها.
 */
export function SharedCard({ id, card, look }: { id: number; card: IrfanCard; look: IrfanLook }) {
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    renderIrfanCard(card, look).then((b) => {
      url = URL.createObjectURL(b);
      if (alive) setSrc(url);
    }, () => { /* تبقى المساحةُ فارغة */ });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [card, look]);

  const first = card.to.split(" ")[0];
  return (
    <Card className="acr-share">
      <CardHeader variant="soft" icon={<HandHeart aria-hidden />} title={`عِرفانٌ إلى ${card.to}`} subtitle={`من ${card.from}`} />
      <div className="acr-easel is-plain">
        {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob) */}
        {src ? <img className="acr-shot is-portrait" src={src} alt={`عِرفانٌ إلى ${card.to}`} /> : <span className="acr-shot is-portrait" aria-hidden />}
      </div>
      <Row Icon={ImageIcon} k="البطاقة" v="صورةٌ للمشاركة" sub="احفظها أو انشرها في قصّتك"
        act={{ Icon: DownloadSimple, label: "حفظ البطاقة", text: "حفظ" }} disabled={busy || !src}
        onClick={async () => { setBusy(true); try { await saveIrfanCard(card, look); } finally { setBusy(false); } }} />
      <Row Icon={SignIn} k="بوّابة أدِيب" v={`رسائلُ ${first} كلُّها هناك`} sub="ما وصله من أعضاء أدِيب، لمن يدخل بحسابه"
        act={CaretAct("افتح البوّابة")} href={`/dashboard/irfan?m=${id}`} />
    </Card>
  );
}
