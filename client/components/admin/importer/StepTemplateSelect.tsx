import { FileText, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TemplateType } from "@site/lib/importer/types";

interface StepTemplateSelectProps {
  selected: TemplateType | null;
  onSelect: (type: TemplateType) => void;
  onNext: () => void;
}

const templates = [
  {
    type: "practice" as TemplateType,
    icon: FileText,
    title: "Practice Area Pages",
    description:
      "Import practice area pages with hero sections, content blocks, and FAQ sections. Each row creates a page under /practice-areas/.",
    fields: "Title, Slug, Hero, Content Sections, FAQ Items, SEO fields",
  },
  {
    type: "post" as TemplateType,
    icon: Newspaper,
    title: "Blog Posts",
    description:
      "Import blog posts with title, body content, categories, and featured images. Each row creates a post under /blog/.",
    fields: "Title, Slug, Body, Excerpt, Category, Featured Image, SEO fields",
  },
];

export default function StepTemplateSelect({
  selected,
  onSelect,
  onNext,
}: StepTemplateSelectProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Choose Content Type</h2>
        <p className="text-sm text-muted-foreground">
          Select the type of content you want to import
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((tpl) => (
          <Card
            key={tpl.type}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50",
              selected === tpl.type && "border-primary ring-2 ring-primary/20",
            )}
            onClick={() => onSelect(tpl.type)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "rounded-lg p-2",
                    selected === tpl.type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  <tpl.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{tpl.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>{tpl.description}</CardDescription>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Fields:</span> {tpl.fields}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!selected}>
          Continue
        </Button>
      </div>
    </div>
  );
}
