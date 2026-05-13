import type { TransformedPracticePage } from "@site/lib/importer/types";
import { Badge } from "@/components/ui/badge";
import { Globe, Search, Image as ImageIcon } from "lucide-react";

interface PracticePagePreviewProps {
  record: TransformedPracticePage;
}

export default function PracticePagePreview({ record }: PracticePagePreviewProps) {
  const content = record.content as Record<string, unknown>;
  const hero = content?.hero as Record<string, unknown> | undefined;
  const contentSections = content?.contentSections as Record<string, unknown>[] | undefined;
  const faq = content?.faq as Record<string, unknown> | undefined;
  const faqItems = faq?.items as Record<string, unknown>[] | undefined;

  return (
    <div className="space-y-4">
      {/* Hero section preview */}
      <div className="relative rounded-lg overflow-hidden bg-slate-800 text-white p-6">
        {hero?.backgroundImage && (
          <div className="absolute inset-0 opacity-30">
            <img
              src={String(hero.backgroundImage)}
              alt={String(hero.backgroundImageAlt ?? "")}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="relative z-10">
          <p className="text-xs text-amber-400 uppercase tracking-wider mb-1">
            {String(hero?.sectionLabel ?? "Practice Area")}
          </p>
          <h3 className="text-lg font-bold mb-2">
            {String(hero?.tagline ?? record.title)}
          </h3>
          {hero?.description && (
            <div
              className="text-sm text-slate-300 line-clamp-3"
              dangerouslySetInnerHTML={{ __html: String(hero.description) }}
            />
          )}
        </div>
      </div>

      {/* Content sections preview */}
      {contentSections && contentSections.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Content Sections ({contentSections.length})
          </p>
          {contentSections.slice(0, 3).map((section, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                String(section.imagePosition) === "left" ? "flex-row-reverse" : ""
              }`}
            >
              <div className="flex-1">
                <div
                  className="text-sm text-muted-foreground line-clamp-3 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: String(section.body ?? ""),
                  }}
                />
              </div>
              {section.image && String(section.image) && (
                <div className="w-24 h-16 bg-muted rounded flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={String(section.image)}
                    alt={String(section.imageAlt ?? "")}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = "none";
                      el.parentElement!.innerHTML =
                        '<div class="flex items-center justify-center w-full h-full"><span class="text-xs text-muted-foreground">No img</span></div>';
                    }}
                  />
                </div>
              )}
            </div>
          ))}
          {contentSections.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{contentSections.length - 3} more sections
            </p>
          )}
        </div>
      )}

      {/* FAQ preview */}
      {faq && faqItems && faqItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            FAQ ({faqItems.length} items)
          </p>
          <div className="space-y-1">
            {faqItems.slice(0, 3).map((item, idx) => (
              <div key={idx} className="bg-muted/50 rounded px-3 py-2">
                <p className="text-sm font-medium">{String(item.question)}</p>
              </div>
            ))}
            {faqItems.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{faqItems.length - 3} more questions
              </p>
            )}
          </div>
        </div>
      )}

      {/* SEO summary card */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
          <Search className="h-3 w-3" />
          SEO Summary
        </p>
        <div className="space-y-1">
          {record.meta_title && (
            <p className="text-sm">
              <span className="text-muted-foreground text-xs">Title:</span>{" "}
              {record.meta_title}
            </p>
          )}
          {record.meta_description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              <span className="text-xs">Desc:</span>{" "}
              {record.meta_description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="secondary" className="text-xs gap-1">
            <Globe className="h-3 w-3" />
            {record.url_path}
          </Badge>
          {record.canonical_url && (
            <Badge variant="outline" className="text-xs">
              Canonical: {record.canonical_url}
            </Badge>
          )}
          {record.noindex && (
            <Badge variant="destructive" className="text-xs">
              noindex
            </Badge>
          )}
          {record.og_title && (
            <Badge variant="outline" className="text-xs">
              OG: {record.og_title.slice(0, 30)}
              {record.og_title.length > 30 && "…"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
