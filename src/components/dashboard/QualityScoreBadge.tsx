import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface QualityScoreBadgeProps {
  score: number;
  status: "good" | "caution" | "restricted";
}

const QualityScoreBadge = ({ score, status }: QualityScoreBadgeProps) => {
  const statusConfig = {
    good: {
      label: "Good Standing",
      className: "bg-success-light text-success border-success/20",
    },
    caution: {
      label: "Caution",
      className: "bg-warning-light text-warning border-warning/20",
    },
    restricted: {
      label: "Restricted",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Shield className="h-5 w-5" />
        <span className="font-medium">Quality Score</span>
      </div>
      <div className="text-4xl font-bold text-secondary mb-3">{score}%</div>
      <span className={cn(
        "inline-block px-4 py-1.5 rounded-full text-sm font-medium border",
        config.className
      )}>
        {config.label}
      </span>
    </div>
  );
};

export default QualityScoreBadge;
