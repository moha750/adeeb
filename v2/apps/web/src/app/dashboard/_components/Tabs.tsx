"use client";

export type TabItem = { value: string; label: string; badge?: string };

type TabsProps = {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  variant?: "underline" | "pill" | "segmented";
  className?: string;
};

export function Tabs({ items, value, onValueChange, variant = "underline", className }: TabsProps) {
  const cls = ["tabs", `tabs-${variant}`, className].filter(Boolean).join(" ");
  return (
    <div className={cls} role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={it.value === value}
          className={"tab" + (it.value === value ? " on" : "")}
          onClick={() => onValueChange(it.value)}
        >
          {it.label}
          {it.badge ? <em className="tab-b num">{it.badge}</em> : null}
        </button>
      ))}
    </div>
  );
}
