import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** حاوية بعرض أقصى ومسافات جانبية موحّدة. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("mx-auto w-full max-w-6xl px-6", className)}>{children}</div>;
}
