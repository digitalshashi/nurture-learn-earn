import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock } from "lucide-react";

const BADGE_STYLES: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  silver: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  gold: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  diamond: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200",
};

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  category: string;
  accessLevel?: string;
  progress?: number;
  locked?: boolean;
  onClick: () => void;
}

export function CourseCard({
  title,
  description,
  thumbnail,
  price,
  category,
  accessLevel = "free",
  progress = 0,
  locked = false,
  onClick,
}: CourseCardProps) {
  return (
    <Card
      className={`card-shadow hover:card-shadow-hover transition-shadow overflow-hidden group ${
        locked ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
      }`}
      onClick={onClick}
    >
      <div className="aspect-video bg-secondary overflow-hidden relative">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {locked && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <Lock className="h-8 w-8 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Upgrade to <span className="capitalize font-bold">{accessLevel}</span> to unlock
            </span>
          </div>
        )}
      </div>
      <CardContent className="pt-3 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] font-medium">{category}</Badge>
            <Badge className={`text-[10px] font-medium capitalize border-0 ${BADGE_STYLES[accessLevel] || BADGE_STYLES.free}`}>
              {accessLevel}
            </Badge>
          </div>
          <span className="text-sm font-bold text-accent">{price > 0 ? `₹${price}` : "Free"}</span>
        </div>
        <h3 className="font-semibold text-sm mt-2 line-clamp-2">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>

        {/* Progress bar */}
        {!locked && progress > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">Progress</span>
              <span className="text-[10px] font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {!locked && progress >= 100 && (
          <div className="mt-2">
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 text-[10px] border-0">
              ✓ Completed
            </Badge>
          </div>
        )}

        {!locked && progress > 0 && progress < 100 && (
          <div className="mt-2">
            <span className="text-xs font-medium text-primary cursor-pointer hover:underline">
              Continue →
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
