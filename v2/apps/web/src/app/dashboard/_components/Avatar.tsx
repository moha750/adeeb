type AvatarProps = {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  status?: "online" | "away" | "busy" | "offline";
  className?: string;
};

const initialsOf = (name?: string) =>
  name ? name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join(" ") : "؟";

/** صورة رمزية — مربّع بزوايا مستديرة وحدّ، بتدرّج الهوية؛ صورة مع رجوع للأحرف. */
export function Avatar({ name, src, size = "md", status, className }: AvatarProps) {
  const cls = ["av", size !== "md" ? `av-${size}` : "", className].filter(Boolean).join(" ");
  return (
    <span className={cls} aria-label={name} role="img">
      {src ? <img className="av-img" src={src} alt={name ?? ""} /> : <span className="av-ini">{initialsOf(name)}</span>}
      {status ? <i className={`av-dot av-dot-${status}`} /> : null}
    </span>
  );
}
