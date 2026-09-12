"use client";

import { useState } from "react";
import { Button, Container, Segmented } from "@adeeb/design-system";
import { ChartLineUp, Gear } from "@phosphor-icons/react";

/**
 * **مبدّلُ بابَي الباركود** — أربعُ هيئاتٍ تُعرَض ليُختار منها.
 *
 * الحكايةُ: صارت للباركود صفحتان (إحصاءٌ وإعدادات)، وجُرّب المبدّلُ المقطعيُّ ممتدًّا
 * فتكوّم بابَاه في طرفه، ثمّ حاضنًا لمحتواه فترك فراغًا حوله، ثمّ بعرضٍ محدودٍ مقتسَم
 * فبقي «غيرَ جميل» بكلمة المالك. فتُعرَض البدائلُ بدل الوصف.
 */

const TITLE = "الملتقى التعريفيّ لبرنامج الولاء الوظيفيّ «دوم»";

function Frame({ tag, note, children }: { tag: string; note: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <div className="phdlab-tag"><span className="dot" aria-hidden />{tag}</div>
      <div className="phdlab-frame">
        <div className="pb-4">
          <h1 className="phn-title" style={{ marginBottom: 14 }}>{TITLE}</h1>
          {children}
        </div>
        <div className="phdlab-body">{note}</div>
      </div>
    </div>
  );
}

export default function QrTabsLab() {
  const [a, setA] = useState("stats");
  const [b, setB] = useState("stats");
  const [c, setC] = useState("stats");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, QR</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">مبدّلُ بابَي الباركود</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          أربعُ هيئاتٍ للتنقّل بين «الإحصاء» و«الإعدادات». انظر أيّها يستقيم تحت الاسم.
        </p>

        <Frame tag="أ) خطٌّ سفليّ" note="أخفُّها حبرًا: كلمتان وخطٌّ تحت المضيء، بلا سطحٍ رماديّ. وهو نمطُ تبويبات الصفحات المعتاد.">
          <div className="tabs tabs-underline" role="tablist">
            <button type="button" role="tab" className={"tab" + (a === "stats" ? " on" : "")} onClick={() => setA("stats")}>الإحصاء</button>
            <button type="button" role="tab" className={"tab" + (a === "settings" ? " on" : "")} onClick={() => setA("settings")}>الإعدادات</button>
          </div>
        </Frame>

        <Frame tag="ب) حبّاتٌ منغّمة" note="التبويبُ المضيءُ حبّةٌ بتدرّج الهويّة، والآخرُ نصٌّ خفيّ. أوضحُها للعين وأثقلُها لونًا.">
          <div className="tabs tabs-pill" role="tablist">
            <button type="button" role="tab" className={"tab" + (b === "stats" ? " on" : "")} onClick={() => setB("stats")}>الإحصاء</button>
            <button type="button" role="tab" className={"tab" + (b === "settings" ? " on" : "")} onClick={() => setB("settings")}>الإعدادات</button>
          </div>
        </Frame>

        <Frame tag="ج) مبدّلُ النظام (seg)" note="المبدّلُ نفسُه المستعمَل في إحصائيّات الزوّار، بعرض حبره. شكلٌ واحدٌ في اللوحة كلّها.">
          <Segmented
            aria-label="باب الباركود"
            value={c}
            onValueChange={setC}
            items={[{ value: "stats", label: "الإحصاء" }, { value: "settings", label: "الإعدادات" }]}
          />
        </Frame>

        <Frame tag="د) زرٌّ واحدٌ يقابله" note="لا مبدّلَ أصلًا: في الإحصاء زرُّ «الإعدادات»، وفي الإعدادات زرُّ «الإحصاء». أخفُّ عنصرٍ ممكن.">
          <Button variant="ghost" size="sm"><Gear /> الإعدادات</Button>
          <span className="fld-help" style={{ marginInlineStart: 10 }}>(وفي صفحة الإعدادات: <ChartLineUp size={13} /> الإحصاء)</span>
        </Frame>
      </Container>
    </main>
  );
}
