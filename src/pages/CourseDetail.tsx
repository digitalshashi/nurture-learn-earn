import { AppLayout } from "@/components/layout/AppLayout";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, PlayCircle, CheckCircle2, Star, ArrowLeft, Download } from "lucide-react";
import { useState } from "react";

const courseSections = [
  {
    title: "Day 1",
    lectures: 5,
    duration: "1hr 40min 45s",
    lessons: [
      { title: "Freedom Journey - Launch Orientation", duration: "39min 10s", completed: true },
      { title: "How The FREEDOM Business Model Really Works", duration: "34min 27s", completed: true },
      { title: "The Self Discovery Process To Attain FREEDOM", duration: "4min 20s", completed: true },
      { title: "How To Set Your Intentions & Goals To Achieve FREEDOM", duration: "12min 47s", completed: true, resources: 3 },
      { title: "How To Make This A Fail-Proof Journey", duration: "9min 58s", completed: true },
    ],
  },
  {
    title: "Day 2",
    lectures: 5,
    duration: "1hr 32min 32s",
    lessons: [
      { title: "Mindset Mastery For Success", duration: "28min 15s", completed: false },
      { title: "Building Your Foundation", duration: "22min 40s", completed: false },
      { title: "The Power of Consistency", duration: "15min 30s", completed: false },
      { title: "Action Planning Workshop", duration: "18min 07s", completed: false },
      { title: "Day 2 Wrap-Up & Assignments", duration: "8min 00s", completed: false },
    ],
  },
  {
    title: "Day 3",
    lectures: 6,
    duration: "1hr 43min 57s",
    lessons: [
      { title: "Advanced Marketing Strategies", duration: "20min 15s", completed: false },
      { title: "Content Creation Blueprint", duration: "25min 40s", completed: false },
      { title: "Sales Funnel Setup", duration: "18min 30s", completed: false },
      { title: "Email Marketing Automation", duration: "15min 07s", completed: false },
      { title: "Social Media Mastery", duration: "12min 25s", completed: false },
      { title: "Final Challenge & Next Steps", duration: "12min 00s", completed: false },
    ],
  },
];

export default function CourseDetail() {
  const { id } = useParams();
  const [openSections, setOpenSections] = useState<number[]>([0]);

  const toggleSection = (index: number) => {
    setOpenSections((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const totalSections = courseSections.length;
  const totalLectures = courseSections.reduce((sum, s) => sum + s.lectures, 0);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-6">
        {/* Back link */}
        <Link to="/courses" className="text-accent text-sm font-medium hover:underline inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to courses
        </Link>

        {/* Course Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="md:w-80 shrink-0">
            <div className="aspect-video bg-secondary rounded-lg overflow-hidden">
              <img src="/placeholder.svg" alt="Course" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-display mb-4">Freedom Business Model</h1>

            {/* Completion Banner */}
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-semibold text-sm">Congrats! you've completed the course.</p>
                  <button className="text-accent text-sm font-medium hover:underline">
                    Download certificate
                  </button>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Rate this course</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-border hover:text-accent cursor-pointer transition-colors" />
                ))}
              </div>
            </div>

            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              View Again
            </Button>
          </div>
        </div>

        {/* Contents */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-1">Contents</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {totalSections} sections • {totalLectures} lectures • 3hr 57min 15s
          </p>

          <div className="space-y-2">
            {courseSections.map((section, sIndex) => (
              <div key={section.title} className="border border-border rounded-lg overflow-hidden">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(sIndex)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {openSections.includes(sIndex) ? (
                      <ChevronDown className="h-5 w-5 text-accent" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-semibold">{section.title}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {section.lectures} lectures • {section.duration}
                  </span>
                </button>

                {/* Lessons */}
                {openSections.includes(sIndex) && (
                  <div className="border-t border-border">
                    {section.lessons.map((lesson, lIndex) => (
                      <div
                        key={lIndex}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors border-b border-border last:border-b-0"
                      >
                        {lesson.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                        ) : (
                          <PlayCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                        <span className="flex-1 text-sm">{lesson.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {lesson.resources && (
                            <span className="text-xs text-muted-foreground">
                              Resources ({lesson.resources})
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-xl font-bold mb-2">Description</h2>
          <p className="text-muted-foreground">
            The ultimate training system designed to give you freedom.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
