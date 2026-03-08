import { AppLayout } from "@/components/layout/AppLayout";
import { CourseCard } from "@/components/courses/CourseCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const filters = ["All", "In Progress", "Completed", "Expired", "Paid"];

const mockCourses = [
  { id: "1", title: "Freedom Hackathon 11", author: "Internet Lifestyle Hub", progress: 22, image: "/placeholder.svg", newChapters: 7 },
  { id: "2", title: "Freedom Business Model", author: "Internet Lifestyle Hub", progress: 96, image: "/placeholder.svg", hasCertificate: true },
  { id: "3", title: "My Freedom Codex", author: "Internet Lifestyle Hub", progress: 91, image: "/placeholder.svg" },
  { id: "4", title: "Niche Clarity Codex", author: "Internet Lifestyle Hub", progress: 77, image: "/placeholder.svg" },
  { id: "5", title: "Curriculum Design Codex", author: "Internet Lifestyle Hub", progress: 22, image: "/placeholder.svg" },
  { id: "6", title: "AI Content Mastery", author: "Internet Lifestyle Hub", progress: 85, image: "/placeholder.svg" },
  { id: "7", title: "NalandaX", author: "Internet Lifestyle Hub", progress: 58, image: "/placeholder.svg" },
  { id: "8", title: "Freedom Budget Blueprint", author: "Internet Lifestyle Hub", progress: 46, image: "/placeholder.svg" },
  { id: "9", title: "Freedom Leadgen Challenge", author: "Internet Lifestyle Hub", progress: 8, image: "/placeholder.svg" },
];

export default function Courses() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-6">
        <h1 className="text-3xl font-bold font-display mb-6">Courses</h1>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="search by course title or description"
              className="pl-9 bg-card"
            />
          </div>
          <Select defaultValue="course">
            <SelectTrigger className="w-40 bg-card">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="course">Course</SelectItem>
              <SelectItem value="workshop">Workshop</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {filters.map((filter, i) => (
            <Badge
              key={filter}
              variant={i === 0 ? "default" : "outline"}
              className={`cursor-pointer px-3 py-1 text-sm ${i === 0 ? "bg-accent text-accent-foreground hover:bg-accent/90 border-0" : "hover:bg-secondary"}`}
            >
              {filter}
            </Badge>
          ))}
          <Badge variant="outline" className="cursor-pointer px-3 py-1 text-sm hover:bg-secondary">
            Membership ↓
          </Badge>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {mockCourses.map((course) => (
            <CourseCard key={course.id} {...course} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
