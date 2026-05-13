import type { ContactPageContent } from "@site/lib/cms/contactPageTypes";
import { Section, ArrayEditor, GlobalSectionInfo, RichTextField, HeadingField, Input, Label, Textarea } from "./EditorShared";

interface ContactEditorProps {
  content: ContactPageContent;
  onChange: (c: ContactPageContent) => void;
}

export default function ContactEditor({ content, onChange }: ContactEditorProps) {
  const update = <K extends keyof ContactPageContent>(key: K, value: ContactPageContent[K]) => {
    onChange({ ...content, [key]: value });
  };

  return (
    <div className="space-y-6">
      <HeroSection content={content} update={update} />
      <ContactMethodsSection content={content} update={update} />
      <FormSection content={content} update={update} />
      <OfficeHoursSection content={content} update={update} />
      <ProcessSection content={content} update={update} />
      <VisitOfficeSection content={content} update={update} />
      <GlobalSectionInfo sectionTitle="Call to Action" managedIn="About Us" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
type Updater = <K extends keyof ContactPageContent>(key: K, value: ContactPageContent[K]) => void;
type SectionProps = { content: ContactPageContent; update: Updater };

function useHeadingTag(content: ContactPageContent, update: Updater) {
  return {
    get: (key: string) => content.headingTags?.[key] ?? "h2",
    set: (key: string, tag: string) =>
      update("headingTags", { ...content.headingTags, [key]: tag }),
  };
}

/* ------------------------------------------------------------------ */
function HeroSection({ content, update }: SectionProps) {
  const hero = content.hero;
  const set = (patch: Partial<typeof hero>) => update("hero", { ...hero, ...patch });
  const ht = useHeadingTag(content, update);

  return (
    <Section title="Hero Section">
      <div className="grid gap-4">
        <HeadingField
          label="Section Heading"
          value={hero.sectionLabel}
          onChange={(v) => set({ sectionLabel: v })}
          tag={content.headingTags?.["hero.sectionLabel"] ?? "h1"}
          onTagChange={(t) => ht.set("hero.sectionLabel", t)}
        />
        <div>
          <Label>Tagline</Label>
          <Input value={hero.tagline} onChange={(e) => set({ tagline: e.target.value })} />
        </div>
        <RichTextField label="Description" value={hero.description} onChange={(v) => set({ description: v })} />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
function ContactMethodsSection({ content, update }: SectionProps) {
  return (
    <Section title="Contact Methods" defaultOpen={false}>
      <ArrayEditor
        items={content.contactMethods.methods}
        onChange={(items) => update("contactMethods", { methods: items })}
        itemLabel="Method"
        newItem={() => ({ icon: "Phone", title: "", detail: "", subDetail: "" })}
        renderItem={(item, _, upd) => (
          <div className="grid gap-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>Icon</Label>
                <Input value={item.icon} onChange={(e) => upd({ ...item, icon: e.target.value })} placeholder="Lucide icon name" />
              </div>
              <div className="col-span-3">
                <Label>Title</Label>
                <Input value={item.title} onChange={(e) => upd({ ...item, title: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Detail</Label>
                <Input value={item.detail} onChange={(e) => upd({ ...item, detail: e.target.value })} />
              </div>
              <div>
                <Label>Sub-Detail</Label>
                <Input value={item.subDetail} onChange={(e) => upd({ ...item, subDetail: e.target.value })} />
              </div>
            </div>
          </div>
        )}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
function FormSection({ content, update }: SectionProps) {
  const form = content.form;
  const set = (patch: Partial<typeof form>) => update("form", { ...form, ...patch });
  const ht = useHeadingTag(content, update);

  return (
    <Section title="Contact Form" defaultOpen={false}>
      <div className="grid gap-4">
        <HeadingField
          label="Heading"
          value={form.heading}
          onChange={(v) => set({ heading: v })}
          tag={ht.get("form.heading")}
          onTagChange={(t) => ht.set("form.heading", t)}
        />
        <RichTextField label="Subtext" value={form.subtext} onChange={(v) => set({ subtext: v })} />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
function OfficeHoursSection({ content, update }: SectionProps) {
  const oh = content.officeHours;
  const set = (patch: Partial<typeof oh>) => update("officeHours", { ...oh, ...patch });
  const ht = useHeadingTag(content, update);

  return (
    <Section title="Office Hours" defaultOpen={false}>
      <div className="grid gap-4">
        <HeadingField
          label="Heading"
          value={oh.heading}
          onChange={(v) => set({ heading: v })}
          tag={ht.get("officeHours.heading")}
          onTagChange={(t) => ht.set("officeHours.heading", t)}
        />
        <ArrayEditor
          items={oh.items}
          onChange={(items) => set({ items })}
          itemLabel="Schedule"
          newItem={() => ({ day: "", hours: "" })}
          renderItem={(item, _, upd) => (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Day</Label>
                <Input value={item.day} onChange={(e) => upd({ ...item, day: e.target.value })} />
              </div>
              <div>
                <Label>Hours</Label>
                <Input value={item.hours} onChange={(e) => upd({ ...item, hours: e.target.value })} />
              </div>
            </div>
          )}
        />
        <div>
          <Label>Note</Label>
          <Textarea value={oh.note} onChange={(e) => set({ note: e.target.value })} rows={2} />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
function ProcessSection({ content, update }: SectionProps) {
  const p = content.process;
  const set = (patch: Partial<typeof p>) => update("process", { ...p, ...patch });
  const ht = useHeadingTag(content, update);

  return (
    <Section title="Process Steps" defaultOpen={false}>
      <div className="grid gap-4">
        <HeadingField
          label="Section Heading"
          value={p.sectionLabel}
          onChange={(v) => set({ sectionLabel: v })}
          tag={ht.get("process.sectionLabel")}
          onTagChange={(t) => ht.set("process.sectionLabel", t)}
        />
        <div>
          <Label>Subtitle</Label>
          <Input value={p.heading} onChange={(e) => set({ heading: e.target.value })} />
        </div>
        <div>
          <Label>Subtitle</Label>
          <Input value={p.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
        </div>
        <ArrayEditor
          items={p.steps}
          onChange={(items) => set({ steps: items })}
          itemLabel="Step"
          newItem={() => ({ number: String(p.steps.length + 1), title: "", description: "" })}
          renderItem={(item, _, upd) => (
            <div className="grid gap-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>Number</Label>
                  <Input value={item.number} onChange={(e) => upd({ ...item, number: e.target.value })} />
                </div>
                <div className="col-span-3">
                  <Label>Title</Label>
                  <Input value={item.title} onChange={(e) => upd({ ...item, title: e.target.value })} />
                </div>
              </div>
              <RichTextField label="Description" value={item.description} onChange={(v) => upd({ ...item, description: v })} />
            </div>
          )}
        />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
function VisitOfficeSection({ content, update }: SectionProps) {
  const vo = content.visitOffice;
  const set = (patch: Partial<typeof vo>) => update("visitOffice", { ...vo, ...patch });
  const ht = useHeadingTag(content, update);

  return (
    <Section title="Visit Our Office" defaultOpen={false}>
      <div className="grid gap-4">
        <HeadingField
          label="Heading"
          value={vo.heading}
          onChange={(v) => set({ heading: v })}
          tag={ht.get("visitOffice.heading")}
          onTagChange={(t) => ht.set("visitOffice.heading", t)}
        />
        <RichTextField label="Subtext" value={vo.subtext} onChange={(v) => set({ subtext: v })} />
        <div>
          <Label>Google Maps Embed URL</Label>
          <Input value={vo.mapEmbedUrl} onChange={(e) => set({ mapEmbedUrl: e.target.value })} placeholder="https://www.google.com/maps/embed?..." />
        </div>
      </div>
    </Section>
  );
}
