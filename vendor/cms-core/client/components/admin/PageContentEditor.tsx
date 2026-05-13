import HomeEditor from "@site/components/admin/editors/HomeEditor";
import AboutEditor from "@site/components/admin/editors/AboutEditor";
import ContactEditor from "@site/components/admin/editors/ContactEditor";
import PracticeAreasEditor from "@site/components/admin/editors/PracticeAreasEditor";
import PracticeAreaPageEditor from "@site/components/admin/editors/PracticeAreaPageEditor";
import { Textarea } from "@/components/ui/textarea";

interface PageContentEditorProps {
  pageId: number;
  pageKey: string;
  content: unknown;
  onChange: (content: unknown) => void;
  pageType?: string;
}

export default function PageContentEditor({ pageId, pageKey, content, onChange, pageType }: PageContentEditorProps) {
  // Route by stable numeric page_id — never changes even when the URL/slug changes
  if (pageId === 1) // Home
    return <HomeEditor content={content as any} onChange={onChange as any} />;

  if (pageId === 2) // About Us
    return <AboutEditor content={content as any} onChange={onChange as any} />;

  if (pageId === 3) // Contact
    return <ContactEditor content={content as any} onChange={onChange as any} />;

  if (pageId === 4) // Practice Areas listing
    return <PracticeAreasEditor content={content as any} onChange={onChange as any} />;

  // Individual practice area pages — detected by page_type
  if (pageType === "practice")
    return <PracticeAreaPageEditor content={content as any} onChange={onChange as any} />;

  // Fallback: raw JSON editor for unknown page types
  return (
    <Textarea
      value={JSON.stringify(content, null, 2)}
      onChange={(e) => {
        try {
          onChange(JSON.parse(e.target.value));
        } catch {
          // Allow typing invalid JSON temporarily
        }
      }}
      rows={20}
      className="font-mono text-sm"
    />
  );
}
