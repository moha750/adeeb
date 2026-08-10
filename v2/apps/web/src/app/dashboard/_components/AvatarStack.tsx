import { Avatar } from "./Avatar";

/**
 * كومةُ أفتار — وجوهُ الوحدة مُتراكبةً في مساحةِ سطر. تُقرأ في لمحةٍ ما لا يُقرأ في اثني عشر صفًّا
 * مكتوبة: **من فيها وكم هم**. والزائد على الحدّ يُطوى في حبّةٍ برقمه، فلا يمتدّ الصفّ بلا نهاية.
 *
 * الترتيب في RTL: الأوّل في الصدر (يمينًا) وما بعده يتوارى تحته، فتُقرأ الكومة كما يُقرأ السطر.
 */
export function AvatarStack({ people, max = 5, size = "sm" }: {
  people: { userId: string; name: string; avatar: string | null; gender: "male" | "female" | null }[];
  max?: number;
  size?: "xs" | "sm";
}) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className={"avstack avstack-" + size} aria-label={`${people.length} أعضاء`}>
      {shown.map((p, i) => (
        <span key={p.userId + i} className="avstack-it" style={{ zIndex: shown.length - i }}>
          <Avatar name={p.name} src={p.avatar ?? undefined} gender={p.gender} size={size} />
        </span>
      ))}
      {rest > 0 ? <span className="avstack-rest">{rest}+</span> : null}
    </span>
  );
}
