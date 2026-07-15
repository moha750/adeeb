type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
};

/** لبنة تحميل بلمعان منزلق — تُشكَّل بالعرض/الارتفاع/الاستدارة أو بصنف مساعد. */
export function Skeleton({ width, height, radius, className }: SkeletonProps) {
  return (
    <span
      className={"sk" + (className ? " " + className : "")}
      style={{ width, height, borderRadius: radius }}
      aria-hidden
    />
  );
}
