import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  category: string;
  onClick: () => void;
}

export function CourseCard({ title, description, thumbnail, price, category, onClick }: CourseCardProps) {
  return (
    <Card className="card-shadow hover:card-shadow-hover transition-shadow cursor-pointer overflow-hidden group" onClick={onClick}>
      <div className="aspect-video bg-secondary overflow-hidden">
        <img src={thumbnail} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
      <CardContent className="pt-3 pb-4">
        <div className="flex items-center justify-between mb-1">
          <Badge variant="secondary" className="text-[10px] font-medium">{category}</Badge>
          <span className="text-sm font-bold text-accent">{price > 0 ? `₹${price}` : "Free"}</span>
        </div>
        <h3 className="font-semibold text-sm mt-2 line-clamp-2">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
      </CardContent>
    </Card>
  );
}
