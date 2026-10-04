import { useSyncExternalStore } from "react";

/**
 * **عرضُ التثبيت في أندرويد والحاسوب** (`beforeinstallprompt`) — حدثٌ يطلقه كروم مرّةً عند
 * التحميل، وقد يسبق ترطيبَ React. فسكربتُ `layout.tsx` المضمَّن يلتقطه أوّلًا في
 * `window.__adeebInstall`، وهذا المخزنُ يقرؤه منه ويسمع ما بعده. (آيفون لا يطلقه أبدًا.)
 *
 * ولا `preventDefault` عليه: شريطُ كروم المصغَّر يبقى كما هو، وزرُّنا طريقٌ ثانٍ إلى العرض نفسِه.
 */

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type W = Window & { __adeebInstall?: InstallPromptEvent | null };

const listeners = new Set<() => void>();
let wired = false;

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    (window as W).__adeebInstall = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    (window as W).__adeebInstall = null;
    listeners.forEach((l) => l());
  });
}

function subscribe(l: () => void) {
  wire();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useInstallPrompt(): InstallPromptEvent | null {
  return useSyncExternalStore(
    subscribe,
    () => (window as W).__adeebInstall ?? null,
    () => null,
  );
}

/** يعرض نافذةَ التثبيت. العرضُ يُستهلك بمرّةٍ واحدة، فيُمحى بعدها أيًّا كان الجواب. */
export async function runInstallPrompt(e: InstallPromptEvent): Promise<boolean> {
  try {
    await e.prompt();
    const { outcome } = await e.userChoice;
    return outcome === "accepted";
  } finally {
    // عرضٌ استُهلك (أو رُفض استهلاكُه) لا يُعاد: يُمحى في الحالين فلا يبقى زرٌّ ميّت.
    (window as W).__adeebInstall = null;
    listeners.forEach((l) => l());
  }
}
