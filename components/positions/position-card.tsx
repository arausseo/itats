import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { PositionWithCount } from "@/src/types/position";

interface PositionCardProps {
  position: PositionWithCount;
}

export function PositionCard({ position }: PositionCardProps) {
  const t = useTranslations("positions");

  return (
    <Link href={`/positions/${position.id}`} className="group block">
      <div className="flex h-full flex-col rounded-lg border border-border/70 bg-card p-4 shadow-sm transition-all hover:border-border hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
            {position.title}
          </h3>
          <Badge
            variant={position.status === "Open" ? "default" : "secondary"}
            className="shrink-0 text-xs"
          >
            {position.status === "Open" ? t("statusOpen") : t("statusClosed")}
          </Badge>
        </div>

        {position.description && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {position.description}
          </p>
        )}

        <div className="mt-auto pt-3">
          <span className="text-xs text-muted-foreground">
            {position.candidate_count}{" "}
            {position.candidate_count === 1 ? t("candidate") : t("candidates")}
          </span>
        </div>
      </div>
    </Link>
  );
}
