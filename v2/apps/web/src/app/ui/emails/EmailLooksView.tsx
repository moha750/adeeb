"use client";

import { useState } from "react";
import { Segmented } from "@adeeb/design-system";
// الإطارُ نفسُه الذي تعرض به صفحةُ الرسالة في سجلّ البريد رسالتَها: ما يُرى هنا هو ما يُرى هناك.
import { MailFrame } from "../../dashboard/system/email/MailFrame";

type Font = "adeeb" | "desktop" | "phone";
export type MailRow = { key: string; when: string; subject: string; html: Record<Font, string> };

const FONTS = [
  { value: "phone", label: "تطبيق Gmail على الآيفون" },
  { value: "desktop", label: "Gmail على الحاسوب" },
  { value: "adeeb", label: "بريد أبل" },
];

const WIDTHS = [
  { value: "600", label: "حاسوب" },
  { value: "375", label: "جوّال" },
];

export default function EmailLooksView({ groups }: { groups: Array<{ title: string; rows: MailRow[] }> }) {
  const [width, setWidth] = useState("375");
  const [font, setFont] = useState<Font>("phone");

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Segmented items={WIDTHS} value={width} onValueChange={setWidth} aria-label="عرض الشاشة" />
        <span className="text-sm text-content-muted">الشاشةُ التي تُقرأ فيها الرسالة</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Segmented items={FONTS} value={font} onValueChange={(v) => setFont(v as Font)} aria-label="برنامج البريد" />
        <span className="text-sm text-content-muted">البرنامجُ الذي تُقرأ فيه، ومعه خطُّه</span>
      </div>

      {groups.map((g) => (
        <section key={g.title} className="mt-14">
          <h2 className="font-display text-2xl font-black text-content">{g.title}</h2>
          <div className="mt-4 grid gap-10 lg:grid-cols-2">
            {g.rows.map((r) => (
              <div key={r.key}>
                <p className="font-display text-lg font-bold text-content">{r.subject}</p>
                <p className="mb-2 text-sm text-content-muted">
                  {r.when}، <span className="font-latin" dir="ltr">{r.key}</span>
                </p>
                <MailFrame html={r.html[font]} width={Number(width)} title={r.subject} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
