import type { PracticeAreaPageContent } from "@site/lib/cms/practiceAreaPageTypes";
import {
  createPracticeAreaContentSection,
  getPracticeAreaSectionShowCtasDefault,
} from "@site/lib/cms/practiceAreaPageTypes";
import {
  Section,
  ArrayEditor,
  ImageField,
  RichTextField,
  HeadingField,
  Input,
  Label,
  Textarea,
} from "./EditorShared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface PracticeAreaPageEditorProps {
  content: PracticeAreaPageContent;
  onChange: (c: PracticeAreaPageContent) => void;
}

export default function PracticeAreaPageEditor({
  content,
  onChange,
}: PracticeAreaPageEditorProps) {
  const update = <K extends keyof PracticeAreaPageContent>(
    key: K,
    value: PracticeAreaPageContent[K],
  ) => {
    onChange({ ...content, [key]: value });
  };

  return (
    <div className="space-y-6">
      <HeroSection content={content} update={update} />
      <SocialProofSection content={content} update={update} />
      <ContentSectionsEditor content={content} update={update} />
      <FaqSection content={content} update={update} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
type Updater = <K extends keyof PracticeAreaPageContent>(
  key: K,
  value: PracticeAreaPageContent[K],
) => void;
type SectionProps = { content: PracticeAreaPageContent; update: Updater };

function useHeadingTag(content: PracticeAreaPageContent, update: Updater) {
  return {
    get: (key: string) => content.headingTags?.[key] ?? "h2",
    set: (key: string, tag: string) =>
      update("headingTags", { ...content.headingTags, [key]: tag }),
  };
}

/* ------------------------------------------------------------------ */
/*  Hero Section                                                       */
/* ------------------------------------------------------------------ */
function HeroSection({ content, update }: SectionProps) {
  const hero = content.hero;
  const set = (patch: Partial<typeof hero>) =>
    update("hero", { ...hero, ...patch });
  return (
    <Section title="Hero Section">
      <div className="grid gap-4">
        <div>
          <Label>Page Title (H1)</Label>
          <Input
            value={hero.sectionLabel}
            onChange={(e) => set({ sectionLabel: e.target.value })}
          />
        </div>
        <div>
          <Label>Tagline</Label>
          <Input
            value={hero.tagline}
            onChange={(e) => set({ tagline: e.target.value })}
          />
        </div>
        <RichTextField
          label="Description"
          value={hero.description}
          onChange={(v) => set({ description: v })}
        />
        <ImageField
          label="Background Image (Optional)"
          value={hero.backgroundImage || ""}
          onChange={(url) => set({ backgroundImage: url })}
          altValue={hero.backgroundImageAlt || ""}
          onAltChange={(backgroundImageAlt) => set({ backgroundImageAlt })}
          onSelectAsset={(asset) => set({
            backgroundImage: asset.url,
            backgroundImageAlt: asset.suggestedAltText || hero.backgroundImageAlt || "",
          })}
          folder="practice-areas"
        />
        <div>
          <Label>Background Image Alt Text</Label>
          <Input
            value={hero.backgroundImageAlt || ""}
            onChange={(e) => set({ backgroundImageAlt: e.target.value })}
            placeholder="Describe the background image"
          />
        </div>
        <p className="text-xs text-gray-500 italic">
          When set, the background image replaces the solid dark green
          background. A semi-transparent overlay is applied automatically.
        </p>
        <p className="text-xs text-gray-500 italic">
          Phone number CTA is managed globally in Site Settings &gt; Contact
          Info
        </p>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Social Proof Section                                               */
/* ------------------------------------------------------------------ */
function SocialProofSection({ content, update }: SectionProps) {
  const sp = content.socialProof;
  const set = (patch: Partial<typeof sp>) =>
    update("socialProof", { ...sp, ...patch });
  const ht = useHeadingTag(content, update);

  return (
    <Section title="Social Proof / Testimonials / Awards" defaultOpen={false}>
      <div className="grid gap-4">
        {/* Mode selector */}
        <div>
          <Label>Display Mode</Label>
          <Select
            value={sp.mode}
            onValueChange={(v) =>
              set({ mode: v as "testimonials" | "awards" | "none" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="awards">Awards / Badges</SelectItem>
              <SelectItem value="testimonials">Testimonials</SelectItem>
              <SelectItem value="none">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Testimonials fields */}
        {sp.mode === "testimonials" && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <h4 className="font-medium text-sm text-gray-700">Testimonials</h4>
            <ArrayEditor
              items={sp.testimonials}
              onChange={(items) => set({ testimonials: items })}
              itemLabel="Testimonial"
              newItem={() => ({
                text: "",
                author: "",
                ratingImage: "/images/logos/rating-stars.png",
                ratingImageAlt: "5 star rating",
              })}
              renderItem={(item, _, upd) => (
                <div className="grid gap-3">
                  <RichTextField
                    label="Text"
                    value={item.text}
                    onChange={(v) => upd({ ...item, text: v })}
                  />
                  <div>
                    <Label>Author</Label>
                    <Input
                      value={item.author}
                      onChange={(e) =>
                        upd({ ...item, author: e.target.value })
                      }
                    />
                  </div>
                  <ImageField
                    label="Rating Image"
                    value={item.ratingImage}
                    onChange={(url) => upd({ ...item, ratingImage: url })}
                    altValue={item.ratingImageAlt || ""}
                    onAltChange={(ratingImageAlt) =>
                      upd({ ...item, ratingImageAlt })
                    }
                    onSelectAsset={(asset) => upd({
                      ...item,
                      ratingImage: asset.url,
                      ratingImageAlt: asset.suggestedAltText || item.ratingImageAlt || "",
                    })}
                    folder="testimonials"
                  />
                  <div>
                    <Label>Rating Image Alt Text</Label>
                    <Input
                      value={item.ratingImageAlt || ""}
                      onChange={(e) =>
                        upd({ ...item, ratingImageAlt: e.target.value })
                      }
                      placeholder="e.g. 5 star rating"
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {/* Awards fields */}
        {sp.mode === "awards" && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <h4 className="font-medium text-sm text-gray-700">
              Awards & Badges
            </h4>
            <p className="text-xs text-gray-500 italic">
              Logos are displayed in a single horizontal row on the page.
            </p>
            <ArrayEditor
              items={sp.awards.logos}
              onChange={(items) =>
                set({ awards: { ...sp.awards, logos: items } })
              }
              itemLabel="Logo"
              newItem={() => ({ src: "", alt: "" })}
              renderItem={(item, _, upd) => (
                <div className="grid gap-3">
                  <ImageField
                    label="Logo Image"
                    value={item.src}
                    onChange={(url) => upd({ ...item, src: url })}
                    altValue={item.alt}
                    onAltChange={(alt) => upd({ ...item, alt })}
                    onSelectAsset={(asset) => upd({
                      ...item,
                      src: asset.url,
                      alt: asset.suggestedAltText || item.alt,
                    })}
                    folder="awards"
                  />
                  <div>
                    <Label>Alt Text</Label>
                    <Input
                      value={item.alt}
                      onChange={(e) =>
                        upd({ ...item, alt: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Content Sections (repeatable)                                      */
/* ------------------------------------------------------------------ */
function ContentSectionsEditor({ content, update }: SectionProps) {
  return (
    <Section title="Content Sections" defaultOpen={false}>
      <p className="text-sm text-gray-500 mb-4">
        Add content blocks with rich text and images. Each block renders as a
        two-column layout on the page.
      </p>
      <ArrayEditor
        items={content.contentSections}
        onChange={(items) => update("contentSections", items)}
        itemLabel="Content Block"
        newItem={() =>
          createPracticeAreaContentSection(content.contentSections.length, {
            body: "<p>Enter your content here...</p>",
          })
        }
        renderItem={(item, index, upd) => (
          <div className="grid gap-3">
            <RichTextField
              label="Body Content"
              value={item.body}
              onChange={(v) => upd({ ...item, body: v })}
            />
            <ImageField
              label="Section Image"
              value={item.image}
              onChange={(url) => upd({ ...item, image: url })}
              altValue={item.imageAlt}
              onAltChange={(imageAlt) => upd({ ...item, imageAlt })}
              onSelectAsset={(asset) => upd({
                ...item,
                image: asset.url,
                imageAlt: asset.suggestedAltText || item.imageAlt,
              })}
              folder="practice-areas"
            />
            <div>
              <Label>Image Alt Text</Label>
              <Input
                value={item.imageAlt}
                onChange={(e) => upd({ ...item, imageAlt: e.target.value })}
              />
            </div>
            <div>
              <Label>Image Position</Label>
              <Select
                value={item.imagePosition}
                onValueChange={(v) =>
                  upd({
                    ...item,
                    imagePosition: v as "left" | "right",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={item.showCTAs ?? getPracticeAreaSectionShowCtasDefault(index)}
                onCheckedChange={(checked) =>
                  upd({ ...item, showCTAs: checked })
                }
              />
              <Label>Show CTA Buttons</Label>
            </div>
          </div>
        )}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ Section                                                        */
/* ------------------------------------------------------------------ */
function FaqSection({ content, update }: SectionProps) {
  const faq = content.faq;
  const set = (patch: Partial<typeof faq>) =>
    update("faq", { ...faq, ...patch });
  const ht = useHeadingTag(content, update);

  return (
    <Section title="FAQ Section" defaultOpen={false}>
      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={faq.enabled}
            onCheckedChange={(checked) => set({ enabled: checked })}
          />
          <Label>Show FAQ Section</Label>
        </div>

        {faq.enabled && (
          <>
            <HeadingField
              label="Heading"
              value={faq.heading}
              onChange={(v) => set({ heading: v })}
              tag={ht.get("faq.heading")}
              onTagChange={(t) => ht.set("faq.heading", t)}
            />
            <RichTextField
              label="Description"
              value={faq.description}
              onChange={(v) => set({ description: v })}
            />
            <ArrayEditor
              items={faq.items}
              onChange={(items) => set({ items })}
              itemLabel="FAQ"
              newItem={() => ({ question: "", answer: "" })}
              renderItem={(item, _, upd) => (
                <div className="grid gap-3">
                  <div>
                    <Label>Question</Label>
                    <Input
                      value={item.question}
                      onChange={(e) =>
                        upd({ ...item, question: e.target.value })
                      }
                    />
                  </div>
                  <RichTextField
                    label="Answer"
                    value={item.answer}
                    onChange={(v) => upd({ ...item, answer: v })}
                  />
                </div>
              )}
            />
          </>
        )}
      </div>
    </Section>
  );
}
