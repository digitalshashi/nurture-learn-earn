import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download, Lock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

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
  instructorName?: string;
  sectionCount?: number;
  lectureCount?: number;
  isPaid?: boolean;
  onClick: () => void;
  onContinue?: () => void;
  onManage?: () => void;
}

export function CourseCard({
  title,
  thumbnail,
  price,
  accessLevel = "free",
  progress = 0,
  locked = false,
  instructorName = "Instructor",
  sectionCount = 0,
  lectureCount = 0,
  isPaid,
  onClick,
  onContinue,
  onManage,
}: CourseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const paid = isPaid ?? price > 0;
  const ctaLabel = progress > 0 && progress < 100 ? "Continue" : progress >= 100 ? "View Again" : "Start";

  return (
    <div
      className={cn(
        "group rounded-xl border border-border bg-card overflow-hidden flex flex-col",
        "shadow-sm hover:shadow-md transition-shadow",
        locked ? "opacity-80" : "cursor-pointer",
      )}
      onClick={() => {
        if (locked || menuOpen) return;
        onClick();
      }}
    >
      {/* 16:9 thumbnail */}
      <div className="relative w-full aspect-video bg-zinc-900 overflow-hidden">
        <img
          src={thumbnail || "/placeholder.svg"}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />
        {locked && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 text-white">
            <Lock className="h-7 w-7" />
            <span className="text-xs font-medium">
              Upgrade to <span className="capitalize font-semibold">{accessLevel}</span>
            </span>
          </div>
        )}

        {/* Options menu */}
        <div className="absolute top-2.5 right-2.5" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-8 w-8 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                aria-label="Course options"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onClick}>Open course</DropdownMenuItem>
              {onContinue && (
                <DropdownMenuItem onClick={onContinue}>
                  {ctaLabel}
                </DropdownMenuItem>
              )}
              {onManage && (
                <DropdownMenuItem onClick={onManage}>Manage</DropdownMenuItem>
              )}
              <DropdownMenuItem disabled className="text-muted-foreground">
                <MoreHorizontal className="h-3.5 w-3.5 mr-2" />
                More soon
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {paid && (
          <Badge className="absolute bottom-2 left-2 bg-black/70 text-white border-0 text-[10px]">
            Paid
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-bold text-[15px] leading-snug line-clamp-2 text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground truncate">{instructorName}</p>
        <p className="text-xs text-muted-foreground">
          {sectionCount} {sectionCount === 1 ? "section" : "sections"} · {lectureCount}{" "}
          {lectureCount === 1 ? "lecture" : "lectures"}
        </p>

        {/* Green progress */}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground tabular-nums w-9 text-right">
            {progress}%
          </span>
        </div>

        {/* CTA row */}
        <div className="flex items-center gap-2 mt-auto pt-2">
          <button
            type="button"
            disabled={locked}
            onClick={(e) => {
              e.stopPropagation();
              if (locked) return;
              (onContinue || onClick)();
            }}
            className={cn(
              "flex-1 h-10 rounded-lg bg-foreground text-background text-sm font-semibold",
              "hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {ctaLabel}
          </button>
          {progress > 0 && !locked && (
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="h-10 w-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
              title="Download for offline"
              aria-label="Download for offline"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
