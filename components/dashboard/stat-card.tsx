interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  accent?: "default" | "green" | "blue" | "amber";
}

const accentMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "bg-muted text-foreground",
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
};

export function StatCard({
  label,
  value,
  subtext,
  icon,
  accent = "default",
}: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${accentMap[accent]}`}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
        )}
      </div>
    </div>
  );
}
