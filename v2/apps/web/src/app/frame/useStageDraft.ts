"use client";

import { useEffect, useState } from "react";
import { stageMsg } from "@/lib/stageFrame";

/**
 * **يستقبل المسوّدةَ من المحرّر** الذي يحمل الإطار: من الأصل نفسه ومن النافذة الأمّ وحدها، ويُعلن أنّه جاهز حين يركّب وكلّما سُئل
 * (قد يجهز الإطارُ قبل المحرّر فيضيع إعلانُه الأوّل). والطرفُ الآخر `StageFrame` في `_ad/workspace.tsx`.
 */
export function useStageDraft<T>(kind: string): T | null {
  const [draft, setDraft] = useState<T | null>(null);
  useEffect(() => {
    const m = stageMsg(kind);
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== window.parent || !e.data) return;
      if (e.data.kind === m.ping) { window.parent.postMessage({ kind: m.ready }, location.origin); return; }
      if (e.data.kind !== m.draft) return;
      setDraft(e.data.draft as T);
    };
    window.addEventListener("message", on);
    window.parent?.postMessage({ kind: m.ready }, location.origin);
    return () => window.removeEventListener("message", on);
  }, [kind]);
  return draft;
}
