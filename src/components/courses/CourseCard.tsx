import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

interface CourseCardProps {
  id: string;
  title: string;
  author: string;
  progress: number;
  image: string;
  newChapters?: number;
  hasCertificate?: boolean;
}

export function CourseCard({ id, title, author, progress, image, newChapters, hasCertificate }: CourseCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border card-shadow hover:card-shadow-hover transition-shadow animate-fade-in overflow-hidden">
      <Link to={`/courses/${id}`}>
        <div className="aspect-video bg-secondary overflow-hidden">
          <img src={image} alt={title} className="w-full h-full object-cover" />
        </div>
      </Link>

      <div className="p-4">
        <Link to={`/courses/${id}`}>
          <h3 className="font-semibold text-sm mb-0.5 hover:text-accent transition-colors line-clamp-1">{title}</h3>
        </Link>
        <p className="text-xs text-muted-foreground mb-3">{author}</p>

        <div className="flex items-center gap-2 mb-3">
          <Progress
            value={progress}
            className="h-1.5 flex-1"
          />
          <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-sm font-medium">
            <Link to={`/courses/${id}`}>Continue</Link>
          </Button>
          {hasCertificate && (
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>

        {newChapters && (
          <div className="flex items-center gap-1.5 mt-2.5">
            <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0 border-0">NEW</Badge>
            <span className="text-xs text-muted-foreground">
              <strong>{newChapters} new chapters</strong> recently added
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
