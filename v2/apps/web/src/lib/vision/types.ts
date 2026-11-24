import type { VisionMarkShape } from "./mark";
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
  starts_label: string | null;
  horizon_label: string | null;
  horizon_on: string;
  status: "active" | "closed";
  total: number;
  done: number;
};

/**
 * مقعدٌ في فريق الرؤية كما يُنشر (`vision_team` عبر `get_public_vision`): الاسمُ والجنس، والصورةُ ورابطُ الصفحة لعضوٍ قائمٍ وحده.
 * ومن لا حساب له يُكتب اسمُه، فلا صورةَ ولا رابط.
 */
export type PublicTeamSeat = {
  id: number;
  role: "supervisor" | "leader" | "track";
  /** ترتيبُ المسار لقائد المسار، و`null` للمشرف والقائد */
  track: number | null;
  name: string;
  gender: "male" | "female" | null;
  avatar: string | null;
  slug: string | null;
};

/**
 * **بطاقةٌ من «فكرة الشعار»** — حكايةُ علامة الرؤية، تُكتب في محرّر الرؤية مع علامتها (`visions.stories`). وفي النصّ `{total}`
 * يصير عددَ أهداف الرؤية و`{tracks}` عددَ مساراتها، فلا يُكتب رقمٌ يتخلّف عنها.
 * `art`: ما يُضاء في علامة البطاقة — `all` كلُّها، `layers` طبقةٌ وطبقة، `one` قطعةٌ واحدة.
 */
export type StoryCard = { title: string; text: string; art: "all" | "layers" | "one" };

export type PublicVision = {
  slug: string;
  name: string;
  starts_on: string;
  /** موعدا البداية والنهاية بالكلام، والغائبُ يُقرأ تاريخًا (`span.ts`) */
  starts_label: string | null;
  horizon_label: string | null;
  horizon_on: string;
  /** عبارةُ الرؤية (`slogan`): سطرٌ تحت اسمها في رأس الصفحة — «عبارة» لا «شعار»، فالشعارُ رسمُ العلامة («فكرة الشعار») */
  slogan: string | null;
  status: "active" | "closed";
  /** علامتُها، واسمُها في الجمل («الهلال»: «لكلّ هدفٍ قطعةٌ في الهلال»)، وسطرُها تحت «فكرة الشعار»، وحكايتُها */
  mark: VisionMarkShape;
  mark_noun: string;
  idea_deck: string | null;
  stories: StoryCard[];
  tracks: PublicTrack[];
  /** فريقُ الرؤية: مقعدٌ لكلّ دور، والشاغرُ لا صفَّ له */
  team: PublicTeamSeat[];
  /** بقيّةُ الرؤى المنشورة (السارية والمنتهية) بعدد أهدافها وما تحقّق منها */
  archive: VisionSummary[];
};

/** عددُ أهداف كلّ مسارٍ بترتيبه — مدخلُ هندسة الهلال (`geometry.ts`) */
export const countsOf = (tracks: { goals: unknown[] }[]) => tracks.map((t) => t.goals.length);
