import { User } from "@phosphor-icons/react";
import { avatarFace } from "@/lib/avatarFace";

type AvatarProps = {
  name?: string;
  src?: string;
  gender?: "male" | "female" | string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  status?: "online" | "away" | "busy" | "offline";
  className?: string;
  /** رمزٌ يقوم مقام أيقونة المستخدم الافتراضيّة (حسابٌ بلا ملف): يغلبه الصورةُ ورسمُ الجنس. */
  icon?: React.ReactNode;
};

/**
 * صورة رمزية — مربّع بزوايا مستديرة وحدّ، بتدرّج الهوية؛ صورة، فأيقونة الجنس، فأيقونةُ المستخدم.
 * **لا أحرف** (المالك ٢٠٢٦-١٠-١٦): مَن لا صورةَ له ولا جنسَ كان يُرسَم بأحرف اسمه، فكسر نمطَ
 * «الرسمِ لا الحرف» الذي يحمله سائرُ مَن لا صورةَ لهم. جُرّب له رسمٌ محايدٌ من رسمَي الهويّة
 * (الريشةُ وحدها، وظلُّ وجهٍ مُصمَت) فاختار المالكُ أيقونةَ المكتبة: «أراها أجمل بكثير».
 */
export function Avatar({ name, src, gender, size = "md", status, className, icon }: AvatarProps) {
  const cls = ["av", size !== "md" ? `av-${size}` : "", className].filter(Boolean).join(" ");
  const face = avatarFace(src, gender);
  return (
    <span className={cls} aria-label={name} role="img">
      {face.kind === "photo" ? (
        <img className="av-img" src={face.url} alt={name ?? ""} />
      ) : face.kind === "figure" ? (
        <img className="av-fig" src={face.url} alt="" aria-hidden />
      ) : (
        <span className="av-icon" aria-hidden>{icon ?? <User />}</span>
      )}
      {status ? <i className={`av-dot av-dot-${status}`} /> : null}
    </span>
  );
}
