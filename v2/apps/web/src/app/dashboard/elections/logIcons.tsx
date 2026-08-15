// رسمُ كلِّ طبيعةِ حدث — مصدرٌ واحد يقرؤه سجلُّ غرفة الإدارة ورحلةُ العضو، فيُعرَف الفعلُ
// نفسُه برسمه في السطحين. (النصُّ والنغمةُ في `log.ts`، وهذا رسمُهما وحده — فُصل لأنّ JSX
// لا يسكن ملفَّ مفرداتٍ خالصًا.)
"use client";

import type { ReactNode } from "react";
import { Archive, FlagCheckered, Gear, Hourglass, PaperPlaneTilt, Scales, StopCircle, Timer, Trophy, UserPlus } from "@phosphor-icons/react";
import { ArrowUUpLeft, CheckCircle, Checks, PencilSimple, Prohibit, XCircle } from "@/app/_components/glyphs";
import type { LogKind } from "./log";

export const KIND_ICON: Record<LogKind, ReactNode> = {
  submit: <PaperPlaneTilt aria-hidden />,
  edit: <PencilSimple aria-hidden />,
  approve: <CheckCircle aria-hidden />,
  reject: <XCircle aria-hidden />,
  withdraw: <Prohibit aria-hidden />,
  restore: <ArrowUUpLeft aria-hidden />,
  open: <Scales aria-hidden />,
  close: <StopCircle aria-hidden />,
  vote: <Checks aria-hidden />,
  win: <Trophy aria-hidden />,
  end: <FlagCheckered aria-hidden />,
  cancel: <Prohibit aria-hidden />,
  appoint: <UserPlus aria-hidden />,
  stall: <Hourglass aria-hidden />,
  clock: <Timer aria-hidden />,
  archive: <Archive aria-hidden />,
  system: <Gear aria-hidden />,
};
