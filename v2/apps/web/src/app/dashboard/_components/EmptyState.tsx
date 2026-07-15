type EmptyStateProps = {
  variant?: "soft" | "aurora";
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

/** حالة فارغة — «soft» لغياب النتائج، «aurora» لغياب العناصر (ترحيبية). */
export function EmptyState({ variant = "soft", icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={"empty empty-" + variant}>
      <span className="empty-ic">{icon}</span>
      <h4 className="empty-title">{title}</h4>
      {description ? <p className="empty-desc">{description}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
