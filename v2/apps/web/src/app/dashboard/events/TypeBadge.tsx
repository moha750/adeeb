import { Badge } from "@adeeb/design-system";
import { Chalkboard, ChatsCircle, Confetti, GraduationCap, Images, Sparkle, Tent } from "@phosphor-icons/react";
import { TYPE_META, type ActivityType } from "./vocab";

/**
 * النوع تصنيفٌ لا حالة — فيُرمَّز **بالأيقونة والنصّ لا باللون** (اللون للدورة الحياتيّة وحدها،
 * تفاديًا لقراءة الهويّة باللون؛ القاعدة ١٠). أيقونةٌ لكلّ نوع + نغمة محايدة موحّدة.
 */
const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  activity: <Confetti aria-hidden />,
  program: <Sparkle aria-hidden />,
  workshop: <Chalkboard aria-hidden />,
  course: <GraduationCap aria-hidden />,
  camp: <Tent aria-hidden />,
  exhibition: <Images aria-hidden />,
  dialogue: <ChatsCircle aria-hidden />,
};

export function TypeBadge({ type }: { type: ActivityType }) {
  return (
    <Badge tone="neutral" variant="soft" icon={TYPE_ICON[type]}>
      {TYPE_META[type].label}
    </Badge>
  );
}
