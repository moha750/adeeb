import type { ReactNode } from "react";
import { ChatsCircle, BellRinging, Footprints, Handshake, Lightning, ListChecks, Megaphone, PuzzlePiece, Scales, SealCheck, UsersThree } from "@phosphor-icons/react";

/**
 * **رمزُ كلّ بندٍ من بنود التقييم** (معاينة «نتيجتي» ٢٠٢٦-١١-٢٧، اقتراحُ محمد): رمزٌ ثابتٌ للبند يعرفه به صاحبُه من شهرٍ إلى شهر.
 * مصدرُه هنا وحده، لا في `vocab.ts` (ذاك بلا React ليقرأه الخادمُ والمتصفّح معًا)، فإن ظهر البندُ في غرفةٍ أخرى أخذ رمزَه من هنا.
 */
export const ITEM_ICON: Record<string, ReactNode> = {
  interaction: <ChatsCircle />,
  activation: <Lightning />,
  communication: <Megaphone />,
  fairness: <Scales />,
  followup: <ListChecks />,
  conduct: <Handshake />,
  example: <Footprints />,
  quality: <SealCheck />,
  responsiveness: <BellRinging />,
  team: <UsersThree />,
  cooperation: <PuzzlePiece />,
};
