/**
 * StructuredPagePreview
 *
 * Renders a read-only preview of structured page content (Home, About, Contact,
 * Practice Areas) inside the admin "Preview" tab. Each page type is detected
 * by the shape of the content object and rendered with lightweight section cards.
 */

import type {
  HomePageContent,
  AboutPageContent,
  ContactPageContent,
  PracticeAreasPageContent,
} from "@/lib/pageContentTypes";

/* ------------------------------------------------------------------ */
/*  Type guards                                                        */
/* ------------------------------------------------------------------ */

function isHomeContent(c: unknown): c is HomePageContent {
  return (
    typeof c === "object" &&
    c !== null &&
    "hero" in c &&
    "features" in c &&
    "mission" in c
  );
}

function isAboutContent(c: unknown): c is AboutPageContent {
  return (
    typeof c === "object" &&
    c !== null &&
    "hero" in c &&
    "story" in c &&
    "approach" in c
  );
}

function isContactContent(c: unknown): c is ContactPageContent {
  return (
    typeof c === "object" &&
    c !== null &&
    "hero" in c &&
    "info" in c &&
    "form" in c &&
    "officeHours" in c
  );
}

function isPracticeAreasContent(c: unknown): c is PracticeAreasPageContent {
  return (
    typeof c === "object" &&
    c !== null &&
    "hero" in c &&
    "areas" in c &&
    "options" in c
  );
}

/* ------------------------------------------------------------------ */
/*  Shared primitives                                                  */
/* ------------------------------------------------------------------ */

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden mb-4">
      <div className="bg-slate-100 px-4 py-2 border-b">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function PreviewField({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined | null;
}) {
  if (!value && value !== 0) return null;
  return (
    <p className="text-sm text-gray-700 mb-1">
      <span className="font-medium text-gray-500">{label}:</span> {value}
    </p>
  );
}

function PreviewImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt || ""}
      className="max-h-40 rounded border object-cover mt-2"
      width={280}
      height={160}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Page previews                                                      */
/* ------------------------------------------------------------------ */

function HomePreview({ content }: { content: HomePageContent }) {
  return (
    <div className="space-y-4">
      <PreviewSection title="Hero">
        <PreviewField label="Title" value={content.hero.title} />
        <PreviewField label="Subtitle" value={content.hero.subtitle} />
        <PreviewField label="CTA" value={content.hero.ctaText} />
        <PreviewImage src={content.hero.backgroundImage} alt="Hero background" />
      </PreviewSection>

      <PreviewSection title="Features">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {content.features.map((f, i) => (
            <div key={i} className="bg-gray-50 rounded p-3">
              <p className="font-medium text-gray-800">{f.title}</p>
              <p className="text-sm text-gray-600 mt-1">{f.description}</p>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection title="Mission">
        <PreviewField label="Heading" value={content.mission.heading} />
        {content.mission.paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-gray-600 mb-2">{p}</p>
        ))}
        <PreviewImage src={content.mission.image} alt="Mission" />
      </PreviewSection>

      <PreviewSection title="Attorney">
        <PreviewField label="Name" value={content.attorney.name} />
        <PreviewField label="Title" value={content.attorney.title} />
        <p className="text-sm text-gray-600 mt-1">{content.attorney.bio}</p>
        <PreviewImage src={content.attorney.photo} alt={content.attorney.name} />
      </PreviewSection>

      <PreviewSection title="Speak With Us">
        <PreviewField label="Heading" value={content.speakWithUs.heading} />
        <p className="text-sm text-gray-600">{content.speakWithUs.description}</p>
      </PreviewSection>

      <PreviewSection title="Client Stories">
        <PreviewField label="Heading" value={content.clientStories.heading} />
        <PreviewField label="Videos" value={`${content.clientStories.videos.length} video(s)`} />
      </PreviewSection>

      <PreviewSection title="Services">
        <PreviewField label="Heading" value={content.services.heading} />
        <div className="flex flex-wrap gap-2 mt-2">
          {content.services.items.map((s, i) => (
            <span key={i} className="bg-slate-100 text-sm px-2 py-1 rounded">
              {s.title}
            </span>
          ))}
        </div>
      </PreviewSection>
    </div>
  );
}

function AboutPreview({ content }: { content: AboutPageContent }) {
  return (
    <div className="space-y-4">
      <PreviewSection title="Hero">
        <PreviewField label="Title" value={content.hero.title} />
        <PreviewImage src={content.hero.backgroundImage} alt="Hero" />
      </PreviewSection>

      <PreviewSection title="Our Story">
        {content.story.paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-gray-600 mb-2">{p}</p>
        ))}
        <PreviewImage src={content.story.image} alt="Story" />
      </PreviewSection>

      <PreviewSection title="Attorney">
        <PreviewField label="Name" value={content.attorney.name} />
        <PreviewField label="Title" value={content.attorney.title} />
        <PreviewImage src={content.attorney.photo} alt={content.attorney.name} />
      </PreviewSection>

      <PreviewSection title="Our Approach">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {content.approach.map((a, i) => (
            <div key={i} className="bg-gray-50 rounded p-3">
              <p className="font-medium text-gray-800">{a.title}</p>
              <p className="text-sm text-gray-600 mt-1">{a.description}</p>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection title="Testimonials">
        {content.testimonials.map((t, i) => (
          <div key={i} className="bg-gray-50 rounded p-3 mb-2">
            <p className="text-sm text-gray-600 italic">"{t.quote}"</p>
            <p className="text-sm font-medium mt-1">{t.name} — {t.caseType}</p>
          </div>
        ))}
      </PreviewSection>

      <PreviewSection title="CTA">
        <PreviewField label="Heading" value={content.cta.heading} />
        <PreviewField label="Phone" value={content.cta.phone} />
      </PreviewSection>
    </div>
  );
}

function ContactPreview({ content }: { content: ContactPageContent }) {
  return (
    <div className="space-y-4">
      <PreviewSection title="Hero">
        <PreviewField label="Title" value={content.hero.title} />
        <PreviewField label="Subtitle" value={content.hero.subtitle} />
        <PreviewImage src={content.hero.backgroundImage} alt="Hero" />
      </PreviewSection>

      <PreviewSection title="Contact Info">
        <PreviewField label="Phone" value={content.info.phone} />
        <PreviewField label="Note" value={content.info.phoneNote} />
        <PreviewField label="Address" value={content.info.address.join(", ")} />
      </PreviewSection>

      <PreviewSection title="Office Hours">
        {content.officeHours.map((h, i) => (
          <PreviewField key={i} label={h.label} value={h.hours} />
        ))}
        {content.hoursNote && (
          <p className="text-sm text-gray-500 mt-1 italic">{content.hoursNote}</p>
        )}
      </PreviewSection>

      <PreviewSection title="CTA">
        <PreviewField label="Heading" value={content.cta.heading} />
        <PreviewField label="Phone" value={content.cta.phone} />
      </PreviewSection>
    </div>
  );
}

function PracticeAreasPreview({ content }: { content: PracticeAreasPageContent }) {
  return (
    <div className="space-y-4">
      <PreviewSection title="Hero">
        <PreviewField label="Title" value={content.hero.title} />
        <PreviewImage src={content.hero.backgroundImage} alt="Hero" />
      </PreviewSection>

      <PreviewSection title="Introduction">
        <p className="text-sm text-gray-600">{content.intro}</p>
      </PreviewSection>

      <PreviewSection title="Practice Areas">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {content.areas.map((a, i) => (
            <div key={i} className="bg-gray-50 rounded p-3">
              <p className="font-medium text-gray-800">{a.name}</p>
              <p className="text-sm text-gray-600 mt-1">{a.description}</p>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection title="Understanding Your Options">
        <PreviewField label="Heading" value={content.options.heading} />
        <p className="text-sm text-gray-600 mt-1">{content.options.text}</p>
        <PreviewImage src={content.options.image} alt="Options" />
      </PreviewSection>

      <PreviewSection title="CTA">
        <PreviewField label="Heading" value={content.cta.heading} />
        <PreviewField label="Phone" value={content.cta.phone} />
      </PreviewSection>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

interface StructuredPagePreviewProps {
  content: unknown;
}

export default function StructuredPagePreview({
  content,
}: StructuredPagePreviewProps) {
  if (isHomeContent(content)) {
    return <HomePreview content={content} />;
  }
  if (isAboutContent(content)) {
    return <AboutPreview content={content} />;
  }
  if (isContactContent(content)) {
    return <ContactPreview content={content} />;
  }
  if (isPracticeAreasContent(content)) {
    return <PracticeAreasPreview content={content} />;
  }

  // Unknown structured content — show raw JSON
  return (
    <div className="p-4">
      <p className="text-sm text-gray-500 mb-2">Structured content preview:</p>
      <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
        {JSON.stringify(content, null, 2)}
      </pre>
    </div>
  );
}
