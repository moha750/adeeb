"use client";

import { useRef, useState } from "react";
import { attachHint, fileMeta, UPLOAD_RULES } from "@/lib/upload";
import { useToast } from "../_components/ToastProvider";
import { uploadGameMedia } from "./media";
import { discardGameMedia } from "./actions";
import type { GameDraft } from "./vocab";

/**
 * **زرُّ مقطع الشاشة** — في تبويب «الإعداد». يرفع ساعةَ الاختيار
 * ويضع الرابطين في المسودّة، والحفظُ بعدها يكتبهما في الصفّ. والرفضُ والقبولُ إشعاران (القاعدة ١٤).
 */
export function useVideoSlot(slug: string, draft: GameDraft, patch: (p: Partial<GameDraft>) => void) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<{ name: string; meta: string } | null>(null);
  // ما رُفع في هذه الجلسة ولم يُحفظ بعد: يُمحى إن استُبدل أو أُزيل أو أُغلقت النافذةُ بلا حفظ.
  // ومعه معرّفُ اللعبة يومَ رُفع: في نافذة «لعبة جديدة» قد يتغيّر المعرّفُ بعد الرفع.
  const unsaved = useRef<{ slug: string; urls: string[] } | null>(null);
  const drop = () => {
    const u = unsaved.current;
    unsaved.current = null;
    if (u) void discardGameMedia(u.slug, u.urls);
  };
  const rule = UPLOAD_RULES.gameVideo;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await uploadGameMedia(slug, file);
      if (!r.ok) {
        toast.error(`${file.name}: ${r.message}`);
        return;
      }
      drop();
      unsaved.current = { slug, urls: [r.video, r.poster] };
      patch({ attractVideo: r.video, attractPoster: r.poster });
      setPicked({ name: file.name, meta: fileMeta(file.type, file.size) });
      toast.success(`رُفع ${file.name}، ويُثبَّت مع الحفظ.`);
    } finally {
      setBusy(false);
    }
  };

  const fileName = draft.attractVideo ? decodeURIComponent(draft.attractVideo.split("/").pop() ?? "") : "";
  const slot = {
    state: busy ? ("uploading" as const) : draft.attractVideo ? ("ready" as const) : ("attach" as const),
    label: busy ? "يُرفع المقطع" : draft.attractVideo ? (picked?.name ?? fileName) : "مقطع الشاشة",
    hint: busy ? "تُقتطع صورتُه ثمّ يُرفعان" : draft.attractVideo ? (picked?.meta ?? "يدور في شاشة الكابينة") : attachHint(rule),
    onPick: () => input.current?.click(),
    onRemove: draft.attractVideo && !busy ? () => { drop(); patch({ attractVideo: null, attractPoster: null }); setPicked(null); } : undefined,
  };
  const picker = { ref: input, accept: rule.accept, onChange: (e: React.ChangeEvent<HTMLInputElement>) => { void onFile(e.target.files?.[0]); e.target.value = ""; } };
  /** بعد حفظٍ ناجح: صار المرفوعُ ملكَ الصفّ، فلا يُمحى. */
  const commit = () => { unsaved.current = null; };
  /** إغلاقٌ بلا حفظ: يُمحى ما رُفع. */
  const discard = () => { drop(); setPicked(null); };
  return { slot, picker, busy, commit, discard };
}
