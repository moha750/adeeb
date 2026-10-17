"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { Trash } from "@/app/_components/glyphs";
import { Comments, type PublicComment } from "@/app/news/[slug]/_parts/Comments";
import { ConfirmDialog } from "@/app/dashboard/_components/ConfirmDialog";

const VIEWERS = [
  { value: "chief", label: "رئيس التحرير" },
  { value: "reader", label: "القارئ" },
];

const WIDTHS = [
  { value: "375", label: "375" },
  { value: "680", label: "680" },
];

export function CommentDeleteLab({ items, next }: { items: PublicComment[]; next: string }) {
  const [viewer, setViewer] = useState("chief");
  const [w, setW] = useState("680");
  const [rows, setRows] = useState(items);
  const [kill, setKill] = useState<string | null>(null);

  return (
    <main className="py-16">
      <Container>
        <h1 className="font-display text-3xl font-black text-content">لسانُ الحذف</h1>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Segmented items={VIEWERS} value={viewer} onValueChange={setViewer} aria-label="بعينَي من" />
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="العرض" />
        </div>

        <div className="art mt-10" style={{ maxWidth: Number(w), marginInline: "auto" }}>
          <Comments
            items={rows}
            me={null}
            onLike={(id) => setRows((s) => s.map((c) => (c.id === id ? { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) } : c)))}
            onSend={async () => false}
            next={next}
            onDelete={viewer === "chief" ? setKill : undefined}
          />
        </div>
      </Container>

      <ConfirmDialog
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف التعليق؟"
        text="يُحذف نهائيًّا ومعه إعجاباته."
        confirmLabel="حذف"
        onConfirm={() => setKill(null)}
      />
    </main>
  );
}
