"use client";

import { createContext, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { openCandidateFile } from "./candidateFile";
import {
  appointToSeat, cancelElection, castVote, createElection, declareWinner, loadAppointOptions,
  openVoting, resolveDepartmentWinners, restoreCandidacy, resubmitCandidacy, reviewCandidate,
  setDeadline, submitCandidacy, transitionElection, withdrawCandidacy,
  type CandidacyFile,
} from "./actions";

/**
 * **بابُ الانتخابات إلى العالم** — كلُّ ما تفعله شاشةٌ خارج نفسها يمرّ من هنا: نداءُ القاعدة،
 * ورفعُ الملفّ، وفتحُه، والانتقالُ بين الصفحات، وإعادةُ الجلب.
 *
 * **ولِمَ سياقٌ لا استيرادٌ مباشر؟** لأنّ المحاكي (`/ui/elections-sim`) يعرض **هذه الشاشاتِ
 * نفسَها** لا نسخًا منها: لو نسخناها لصار للنظام وجهان يفترقان بعد شهر، ولو تُركت تنادي
 * القاعدةَ مباشرةً لكتب المحاكي في الإنتاج. فالمنفذُ هنا نقطةٌ واحدة تُبدَّل، والشاشةُ لا تعلم
 * ولا تتغيّر.
 *
 * **والإنتاجُ لا يحتاج مزوِّدًا**: الافتراضُ هو الحقيقيّ، فمن لم يلفَّ نفسَه بشيءٍ نادى القاعدة.
 * والمزوِّدُ يُغطّي ما يذكره فقط (`Partial`)، فمن أراد تبديلَ فعلٍ واحدٍ بدّله وحدَه.
 */
export type ElectionApi = {
  /* ── أفعالُ الإدارة ─────────────────────────────────────────────── */
  createElection: typeof createElection;
  reviewCandidate: typeof reviewCandidate;
  restoreCandidacy: typeof restoreCandidacy;
  transitionElection: typeof transitionElection;
  setDeadline: typeof setDeadline;
  openVoting: typeof openVoting;
  loadAppointOptions: typeof loadAppointOptions;
  appointToSeat: typeof appointToSeat;
  declareWinner: typeof declareWinner;
  resolveDepartmentWinners: typeof resolveDepartmentWinners;
  cancelElection: typeof cancelElection;

  /* ── أفعالُ العضو ───────────────────────────────────────────────── */
  submitCandidacy: typeof submitCandidacy;
  resubmitCandidacy: typeof resubmitCandidacy;
  castVote: typeof castVote;
  withdrawCandidacy: typeof withdrawCandidacy;

  /**
   * رفعُ ملفّ الترشّح إلى دلو `election-files` ثمّ وصفُه للدالّة — و`null` تعذّرُ الرفع.
   * (كان مبثوثًا في `ApplyForm`؛ ورفعُه هنا يجعل المخزنَ منفذًا واحدًا كالقاعدة.)
   */
  uploadCandidacyFile: (userId: string, electionId: string, file: File) => Promise<CandidacyFile | null>;
  /** أفضليّةُ المقعد بين مقاعد القسم (`set_seat_preference`). */
  setSeatPreference: (departmentId: number, preferredElectionId: string) => Promise<void>;
  /** فتحُ ملفٍّ في الدلو برابطٍ موقَّعٍ مؤقّت — للمراجع وللناخب ولصاحب الملفّ. */
  openFile: (path: string) => Promise<boolean>;

  /* ── الحركة ─────────────────────────────────────────────────────── */
  /** الانتقالُ إلى شاشةٍ أخرى من شاشات النظام. */
  nav: (href: string) => void;
  /** إعادةُ جلب بيانات الصفحة بعد فعلٍ غيّرها. */
  refresh: () => void;
};

const Ctx = createContext<Partial<ElectionApi> | null>(null);

/** يلفُّ شجرةً فتُبدَّل أفعالُها — لا يستعمله إلّا المحاكي والمعارض. */
export const ElectionApiProvider = Ctx.Provider;

/** رفعُ المرفَق الحقيقيّ: مسارٌ باسمٍ مشذَّب تحت `{userId}/{electionId}/`. */
async function realUpload(userId: string, electionId: string, file: File): Promise<CandidacyFile | null> {
  const sb = createClient();
  const path = `${userId}/${electionId}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const up = await sb.storage.from("election-files").upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (up.error) return null;
  return { url: path, name: file.name, size: file.size, mime: file.type || null };
}

async function realSeatPreference(departmentId: number, preferredElectionId: string): Promise<void> {
  await createClient().rpc("set_seat_preference", { p_department: departmentId, p_preferred_election: preferredElectionId });
}

/**
 * الأفعالُ كما تُنفَّذ فعلًا، مع ما يذكره المزوِّدُ فوقها. والملفُّ يُفتح بمصدرٍ واحد
 * (`openCandidateFile`) لصاحبه وللمراجع وللناخب — والتبويبُ يُفتح قبل التوقيع لأجل سفاري.
 */
export function useElectionApi(): ElectionApi {
  const override = useContext(Ctx);
  const router = useRouter();

  return useMemo<ElectionApi>(() => ({
    createElection,
    reviewCandidate,
    restoreCandidacy,
    transitionElection,
    setDeadline,
    openVoting,
    loadAppointOptions,
    appointToSeat,
    declareWinner,
    resolveDepartmentWinners,
    cancelElection,
    submitCandidacy,
    resubmitCandidacy,
    castVote,
    withdrawCandidacy,
    uploadCandidacyFile: realUpload,
    setSeatPreference: realSeatPreference,
    openFile: openCandidateFile,
    nav: (href: string) => router.push(href),
    refresh: () => router.refresh(),
    ...(override ?? {}),
  }), [override, router]);
}
