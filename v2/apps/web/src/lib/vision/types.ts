import type { GoalStatus } from "./vocab";

/** هدفٌ كما يُنشر — بلا «الواقع اليوم» ولا من غيّر الحال (`get_public_vision`). */
export type PublicGoal = {
  id: number;
  cluster: string | null;
  title: string;
  detail: string | null;
  target: string;
  owner: string;
  due_on: string | null;
  status: GoalStatus;
  done_at: string | null;
};

export type PublicTrack = { position: number; name: string; summary: string; icon: string; goals: PublicGoal[] };

export type VisionSummary = {
  slug: string;
  name: string;
  starts_on: string;
  horizon_label: string;
  status: "active" | "closed";
  total: number;
  done: number;
};

export type PublicVision = {
  slug: string;
  name: string;
  starts_on: string;
  horizon_label: string;
  horizon_on: string;
  status: "active" | "closed";
  tracks: PublicTrack[];
  /** بقيّةُ الرؤى المنشورة (السارية والمنتهية) بعدد أهدافها وما تحقّق منها */
  archive: VisionSummary[];
};

/** عددُ أهداف كلّ مسارٍ بترتيبه — مدخلُ هندسة الهلال (`geometry.ts`) */
export const countsOf = (tracks: { goals: unknown[] }[]) => tracks.map((t) => t.goals.length);
