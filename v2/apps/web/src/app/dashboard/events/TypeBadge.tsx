import { Badge } from "@adeeb/design-system";
import { Chalkboard, ChatsCircle, Confetti, GraduationCap, Images, Sparkle, Tent } from "@phosphor-icons/react";
import { TYPE_META, type ActivityType } from "./vocab";

/**
 * النوع تصنيفٌ لا حالة — فيُرمَّز **بالأيقونة والنصّ لا باللون** (اللون للدورة الحياتيّة وحدها،
 * تفاديًا لقراءة الهويّة باللون؛ القاعدة ١٠). أيقونةٌ لكلّ نوع + نغمة محايدة موحّدة.
 */
const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  activity: <Confetti weight="duotone" aria-hidden />,
  program: <Sparkle weight="duotone" aria-hidden />,
  workshop: <Chalkboard weight="duotone" aria-hidden />,
  course: <GraduationCap weight="duotone" aria-hidden />,
  camp: <Tent weight="duotone" aria-hidden />,
  exhibition: <Images weight="duotone" aria-hidden />,
  dialogue: <ChatsCircle weight="duotone" aria-hidden />,
};

export function TypeBadge({ type }: { type: ActivityType }) {
  return (
    <Badge tone="neutral" variant="soft" icon={TYPE_ICON[type]}>
      {TYPE_META[type].label}
    </Badge>
  );
}
