type AvatarProps = {
  name?: string;
  src?: string;
  gender?: "male" | "female" | string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  status?: "online" | "away" | "busy" | "offline";
  className?: string;
};

const initialsOf = (name?: string) =>
  name ? name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join(" ") : "؟";

const FIG: Record<string, string> = {
  male: "/brand/avatar/avatar-male.svg",
  female: "/brand/avatar/avatar-female.svg",
};

/** صورة رمزية — مربّع بزوايا مستديرة وحدّ، بتدرّج الهوية؛ صورة، فأيقونة الجنس، فالأحرف. */
export function Avatar({ name, src, gender, size = "md", status, className }: AvatarProps) {
  const cls = ["av", size !== "md" ? `av-${size}` : "", className].filter(Boolean).join(" ");
  const fig = !src && gender ? FIG[gender] : undefined;
  return (
    <span className={cls} aria-label={name} role="img">
      {src ? (
        <img className="av-img" src={src} alt={name ?? ""} />
      ) : fig ? (
        <img className="av-fig" src={fig} alt="" aria-hidden />
      ) : (
        <span className="av-ini">{initialsOf(name)}</span>
      )}
      {status ? <i className={`av-dot av-dot-${status}`} /> : null}
    </span>
  );
}
