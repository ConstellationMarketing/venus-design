import { useState } from 'react';
import type { ContentBlock } from '../../lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Type,
  Phone,
  Layout,
  Users,
  Grid,
  MessageSquare,
  MapPin,
  FileText,
  Megaphone,
  Mail,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import RichTextEditor from '@site/components/admin/RichTextEditor';

interface BlockEditorProps {
  content: ContentBlock[];
  onChange: (content: ContentBlock[]) => void;
}

const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero Section', icon: Layout },
  { type: 'heading', label: 'Heading', icon: Type },
  { type: 'content-section', label: 'Content Section', icon: FileText },
  { type: 'cta', label: 'Call to Action', icon: Megaphone },
  { type: 'team-members', label: 'Team Members', icon: Users },
  { type: 'testimonials', label: 'Testimonials', icon: MessageSquare },
  { type: 'contact-section', label: 'Contact Section', icon: Mail },
  { type: 'map', label: 'Map', icon: MapPin },
  { type: 'practice-areas-grid', label: 'Practice Areas Grid', icon: Grid },
  { type: 'recent-posts', label: 'Recent Blog Posts', icon: Grid },
] as const;

const ICON_OPTIONS = [
  'Car', 'Truck', 'Bike', 'Footprints', 'AlertTriangle', 'Building',
  'FileText', 'Scale', 'Briefcase', 'Users', 'Home', 'DollarSign',
  'Heart', 'Shield', 'TrendingUp', 'Stethoscope',
];

function getDefaultBlock(type: string): ContentBlock {
  switch (type) {
    case 'hero':
      return { type: 'hero', sectionLabel: '– Practice Area', tagline: 'Page Title', description: '<p>Enter a description here...</p>' };
    case 'heading':
      return { type: 'heading', level: 2, text: 'Section Heading' };
    case 'content-section':
      return { type: 'content-section', body: '<p>Enter your content here...</p>', imagePosition: 'right' };
    case 'cta':
      return { type: 'cta', heading: 'Ready to Get Started?', description: '<p>Contact us today for a free consultation.</p>' };
    case 'team-members':
      return { type: 'team-members', sectionLabel: '– Our Team', heading: 'Meet Our Attorneys', members: [{ name: 'Attorney Name', title: 'Partner', bio: '<p>Bio...</p>', image: '/placeholder.svg', imageAlt: '', specialties: [] }] };
    case 'testimonials':
      return { type: 'testimonials', sectionLabel: '– Testimonials', heading: 'What Our Clients Say', backgroundImageAlt: '', items: [{ text: 'Great service and results!', author: 'Client', ratingImage: '/images/logos/rating-stars.png', ratingImageAlt: '' }] };
    case 'contact-section':
      return { type: 'contact-section', sectionLabel: '– Contact Us', heading: 'Get your FREE case evaluation today.', description: 'We are here to help you with your legal needs.', formHeading: 'Contact Us Today To Schedule a Consultation' };
    case 'map':
      return { type: 'map', heading: 'Our Location', subtext: '', mapEmbedUrl: '' };
    case 'practice-areas-grid':
      return { type: 'practice-areas-grid', heading: 'Our Practice Areas', areas: [{ icon: 'Scale', title: 'Practice Area', description: 'Description', image: '/placeholder.svg', imageAlt: '', link: '/contact' }] };
    case 'recent-posts':
      return { type: 'recent-posts', sectionLabel: '– Latest Articles', heading: 'Recent Blog Posts', postCount: 6 };
    default:
      return { type: 'heading', level: 2, text: 'New Section' };
  }
}

export default function BlockEditor({ content, onChange }: BlockEditorProps) {
  if (!Array.isArray(content)) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        This page uses structured content and should be edited with its dedicated editor.
      </div>
    );
  }

  const addBlock = (type: string) => {
    const newBlock = getDefaultBlock(type);
    onChange([...content, newBlock]);
  };

  const updateBlock = (index: number, updates: Partial<ContentBlock>) => {
    const newContent = [...content];
    newContent[index] = { ...newContent[index], ...updates } as ContentBlock;
    onChange(newContent);
  };

  const removeBlock = (index: number) => {
    onChange(content.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= content.length) return;
    const newContent = [...content];
    [newContent[index], newContent[newIndex]] = [newContent[newIndex], newContent[index]];
    onChange(newContent);
  };

  return (
    <div className="space-y-4">
      {content.map((block, index) => (
        <BlockCard
          key={index}
          block={block}
          index={index}
          total={content.length}
          onUpdate={(updates) => updateBlock(index, updates)}
          onRemove={() => removeBlock(index)}
          onMove={(dir) => moveBlock(index, dir)}
        />
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full border-dashed">
            <Plus className="h-4 w-4 mr-2" />
            Add Block
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
            <DropdownMenuItem key={type} onClick={() => addBlock(type)}>
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BlockCard                                                          */
/* ------------------------------------------------------------------ */

interface BlockCardProps {
  block: ContentBlock;
  index: number;
  total: number;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

function BlockCard({ block, index, total, onUpdate, onRemove, onMove }: BlockCardProps) {
  const [expanded, setExpanded] = useState(true);
  const blockInfo = BLOCK_TYPES.find(b => b.type === block.type);
  const Icon = blockInfo?.icon || FileText;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
          <Icon className="h-4 w-4 text-gray-500" />
          <CardTitle
            className="text-sm font-medium flex-1 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            {blockInfo?.label || block.type}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onMove('up')} disabled={index === 0} className="h-8 w-8 p-0">
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onMove('down')} disabled={index === total - 1} className="h-8 w-8 p-0">
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onRemove} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <BlockFields block={block} onUpdate={onUpdate} />
        </CardContent>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  BlockFields – editor forms for each block type                     */
/* ------------------------------------------------------------------ */

function BlockFields({ block, onUpdate }: { block: ContentBlock; onUpdate: (updates: Partial<ContentBlock>) => void }) {
  switch (block.type) {
    case 'hero':
      return <HeroFields block={block} onUpdate={onUpdate} />;
    case 'heading':
      return <HeadingFields block={block} onUpdate={onUpdate} />;
    case 'content-section':
      return <ContentSectionFields block={block} onUpdate={onUpdate} />;
    case 'cta':
      return <CTAFields block={block} onUpdate={onUpdate} />;
    case 'team-members':
      return <TeamMembersFields block={block} onUpdate={onUpdate} />;
    case 'testimonials':
      return <TestimonialsFields block={block} onUpdate={onUpdate} />;
    case 'contact-section':
      return <ContactSectionFields block={block} onUpdate={onUpdate} />;
    case 'map':
      return <MapFields block={block} onUpdate={onUpdate} />;
    case 'practice-areas-grid':
      return <PracticeAreasGridFields block={block} onUpdate={onUpdate} />;
    case 'recent-posts':
      return <RecentPostsFields block={block} onUpdate={onUpdate} />;
    default:
      return <p className="text-gray-500 text-sm">Legacy block — no editor available. Please replace with a new block type.</p>;
  }
}

/* ------------------------------------------------------------------ */
/*  Hero Fields                                                        */
/* ------------------------------------------------------------------ */
function HeroFields({ block, onUpdate }: { block: Extract<ContentBlock, { type: 'hero' }>; onUpdate: (u: Partial<ContentBlock>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Section Label</Label>
        <Input value={block.sectionLabel} onChange={(e) => onUpdate({ sectionLabel: e.target.value })} placeholder="– Practice Area" />
      </div>
      <div>
        <Label>Tagline</Label>
        <Input value={block.tagline} onChange={(e) => onUpdate({ tagline: e.target.value })} placeholder="Main heading text" />
      </div>
      <div>
        <Label>Description</Label>
        <RichTextEditor value={block.description} onChange={(html) => onUpdate({ description: html })} placeholder="Hero description..." />
      </div>
      <div>
        <Label>Background Image URL</Label>
        <Input value={block.backgroundImage || ''} onChange={(e) => onUpdate({ backgroundImage: e.target.value })} placeholder="https://..." />
      </div>
      <div>
        <Label>Background Image Alt Text</Label>
        <Input value={block.backgroundImageAlt || ''} onChange={(e) => onUpdate({ backgroundImageAlt: e.target.value })} placeholder="Describe the background image" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Heading Fields                                                     */
/* ------------------------------------------------------------------ */
function HeadingFields({ block, onUpdate }: { block: Extract<ContentBlock, { type: 'heading' }>; onUpdate: (u: Partial<ContentBlock>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Text</Label>
        <Input value={block.text} onChange={(e) => onUpdate({ text: e.target.value })} />
      </div>
      <div>
        <Label>Level (SEO only — visual style stays the same)</Label>
        <Select value={String(block.level)} onValueChange={(v) => onUpdate({ level: Number(v) as 1 | 2 | 3 })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">H1 - Main Title</SelectItem>
            <SelectItem value="2">H2 - Section Title</SelectItem>
            <SelectItem value="3">H3 - Subsection</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Content Section Fields                                             */
/* ------------------------------------------------------------------ */
function ContentSectionFields({ block, onUpdate }: { block: Extract<ContentBlock, { type: 'content-section' }>; onUpdate: (u: Partial<ContentBlock>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Body Content</Label>
        <RichTextEditor value={block.body} onChange={(html) => onUpdate({ body: html })} placeholder="Section content..." minHeight="200px" />
      </div>
      <div>
        <Label>Image URL</Label>
        <Input value={block.image || ''} onChange={(e) => onUpdate({ image: e.target.value })} placeholder="https://..." />
      </div>
      <div>
        <Label>Image Alt Text</Label>
        <Input value={block.imageAlt || ''} onChange={(e) => onUpdate({ imageAlt: e.target.value })} placeholder="Describe the image" />
      </div>
      <div>
        <Label>Image Position</Label>
        <Select value={block.imagePosition} onValueChange={(v) => onUpdate({ imagePosition: v as 'left' | 'right' })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="right">Right (text left, image right)</SelectItem>
            <SelectItem value="left">Left (image left, text right)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={block.showCTAs !== false} onCheckedChange={(checked) => onUpdate({ showCTAs: checked })} />
        <Label>Show CTA Buttons (phone & schedule)</Label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA Fields                                                         */
/* ------------------------------------------------------------------ */
function CTAFields({ block, onUpdate }: { block: Extract<ContentBlock, { type: 'cta' }>; onUpdate: (u: Partial<ContentBlock>) => void }) {
  const secondary = block.secondaryButton || { label: '', sublabel: '', link: '' };

  return (
    <div className="space-y-4">
      <div>
        <Label>Heading</Label>
        <Input value={block.heading} onChange={(e) => onUpdate({ heading: e.target.value })} />
      </div>
      <div>
        <Label>Description</Label>
        <RichTextEditor value={block.description} onChange={(html) => onUpdate({ description: html })} placeholder="CTA description..." />
      </div>
      <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
        <Label className="font-semibold">Secondary Button (optional)</Label>
        <div>
          <Label className="text-xs text-gray-500">Button Title</Label>
          <Input value={secondary.label} onChange={(e) => onUpdate({ secondaryButton: { ...secondary, label: e.target.value } })} placeholder="e.g. Schedule Now" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Button Subtitle</Label>
          <Input value={secondary.sublabel} onChange={(e) => onUpdate({ secondaryButton: { ...secondary, sublabel: e.target.value } })} placeholder="e.g. Free Consultation" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Button Link</Label>
          <Input value={secondary.link} onChange={(e) => onUpdate({ secondaryButton: { ...secondary, link: e.target.value } })} placeholder="/contact" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Team Members Fields                                                */
/* ------------------------------------------------------------------ */
function TeamMembersFields({ block, onUpdate }: { block: Extract<ContentBlock, { type: 'team-members' }>; onUpdate: (u: Partial<ContentBlock>) => void }) {
  const updateMember = (idx: number, updates: Partial<typeof block.members[0]>) => {
    const newMembers = [...block.members];
    newMembers[idx] = { ...newMembers[idx], ...updates };
    onUpdate({ members: newMembers });
  };

  const addMember = () => {
    onUpdate({ members: [...block.members, { name: 'New Member', title: 'Title', bio: '<p>Bio...</p>', image: '/placeholder.svg', imageAlt: '', specialties: [] }] });
  };

  const removeMember = (idx: number) => {
    onUpdate({ members: block.members.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Section Label</Label>
        <Input value={block.sectionLabel} onChange={(e) => onUpdate({ sectionLabel: e.target.value })} />
      </div>
      <div>
        <Label>Heading</Label>
        <Input value={block.heading} onChange={(e) => onUpdate({ heading: e.target.value })} />
      </div>

      <Label className="font-semibold">Team Members</Label>
      {block.members.map((member, idx) => (
        <div key={idx} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Member {idx + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => removeMember(idx)} className="text-red-500 h-8 w-8 p-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Name</Label>
            <Input value={member.name} onChange={(e) => updateMember(idx, { name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Title</Label>
            <Input value={member.title} onChange={(e) => updateMember(idx, { title: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Image URL</Label>
            <Input value={member.image} onChange={(e) => updateMember(idx, { image: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Image Alt Text</Label>
            <Input value={member.imageAlt || ''} onChange={(e) => updateMember(idx, { imageAlt: e.target.value })} placeholder="Describe the photo" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Bio</Label>
            <RichTextEditor value={member.bio} onChange={(html) => updateMember(idx, { bio: html })} placeholder="Member bio..." />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Specialties (comma-separated)</Label>
            <Input value={(member.specialties || []).join(', ')} onChange={(e) => updateMember(idx, { specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Criminal Law, Civil Rights" />
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addMember} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Member
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Testimonials Fields                                                */
/* ------------------------------------------------------------------ */
function TestimonialsFields({ block, onUpdate }: { block: Extract<ContentBlock, { type: 'testimonials' }>; onUpdate: (u: Partial<ContentBlock>) => void }) {
  const updateItem = (idx: number, updates: Partial<typeof block.items[0]>) => {
    const newItems = [...block.items];
    newItems[idx] = { ...newItems[idx], ...updates };
    onUpdate({ items: newItems });
  };

  const addItem = () => {
    onUpdate({ items: [...block.items, { text: 'Testimonial text...', author: 'Client Name', ratingImage: '/images/logos/rating-stars.png', ratingImageAlt: '' }] });
  };

  const removeItem = (idx: number) => {
    onUpdate({ items: block.items.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Section Label</Label>
        <Input value={block.sectionLabel} onChange={(e) => onUpdate({ sectionLabel: e.target.value })} />
      </div>
      <div>
        <Label>Heading</Label>
        <Input value={block.heading} onChange={(e) => onUpdate({ heading: e.target.value })} />
      </div>
      <div>
        <Label>Background Image URL</Label>
        <Input value={block.backgroundImage || ''} onChange={(e) => onUpdate({ backgroundImage: e.target.value })} placeholder="https://..." />
      </div>
      <div>
        <Label>Background Image Alt Text</Label>
        <Input value={block.backgroundImageAlt || ''} onChange={(e) => onUpdate({ backgroundImageAlt: e.target.value })} placeholder="Describe the background image" />
      </div>

      <Label className="font-semibold">Testimonials</Label>
      {block.items.map((item, idx) => (
        <div key={idx} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Testimonial {idx + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="text-red-500 h-8 w-8 p-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Testimonial Text</Label>
            <RichTextEditor value={item.text} onChange={(html) => updateItem(idx, { text: html })} placeholder="Client testimonial..." />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Author</Label>
            <Input value={item.author} onChange={(e) => updateItem(idx, { author: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Rating Image URL</Label>
            <Input value={item.ratingImage || ''} onChange={(e) => updateItem(idx, { ratingImage: e.target.value })} placeholder="/images/logos/rating-stars.png" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Rating Image Alt Text</Label>
            <Input value={item.ratingImageAlt || ''} onChange={(e) => updateItem(idx, { ratingImageAlt: e.target.value })} placeholder="e.g. 5 star rating" />
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addItem} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Testimonial
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact Section Fields                                             */
/* ------------------------------------------------------------------ */
function ContactSectionFields({ block, onUpdate }: { block: Extract<ContentBlock, { type: 'contact-section' }>; onUpdate: (u: Partial<ContentBlock>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Section Label</Label>
        <Input value={block.sectionLabel} onChange={(e) => onUpdate({ sectionLabel: e.target.value })} />
      </div>
      <div>
        <Label>Heading</Label>
        <Input value={block.heading} onChange={(e) => onUpdate({ heading: e.target.value })} />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={block.description} onChange={(e) => onUpdate({ description: e.target.value })} rows={3} />
      </div>
      <div>
        <Label>Form Heading</Label>
        <Input value={block.formHeading} onChange={(e) => onUpdate({ formHeading: e.target.value })} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Map Fields                                                         */
/* ------------------------------------------------------------------ */
function MapFields({ block, onUpdate }: { block: Extract<ContentBlock, { type: 'map' }>; onUpdate: (u: Partial<ContentBlock>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Heading</Label>
        <Input value={block.heading || ''} onChange={(e) => onUpdate({ heading: e.target.value })} placeholder="Our Location" />
      </div>
      <div>
        <Label>Subtext</Label>
        <Input value={block.subtext || ''} onChange={(e) => onUpdate({ subtext: e.target.value })} placeholder="Optional description" />
      </div>
      <div>
        <Label>Google Maps Embed URL</Label>
        <Input value={block.mapEmbedUrl} onChange={(e) => onUpdate({ mapEmbedUrl: e.target.value })} placeholder="https://www.google.com/maps/embed?..." />
        <p className="text-xs text-gray-400 mt-1">Paste the embed URL from Google Maps (Share → Embed a map → copy the src URL)</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Practice Areas Grid Fields                                         */
/* ------------------------------------------------------------------ */
function PracticeAreasGridFields({ block, onUpdate }: { block: Extract<ContentBlock, { type: 'practice-areas-grid' }>; onUpdate: (u: Partial<ContentBlock>) => void }) {
  const updateArea = (idx: number, updates: Partial<typeof block.areas[0]>) => {
    const newAreas = [...block.areas];
    newAreas[idx] = { ...newAreas[idx], ...updates };
    onUpdate({ areas: newAreas });
  };

  const addArea = () => {
    onUpdate({ areas: [...block.areas, { icon: 'Scale', title: 'New Area', description: 'Description', image: '/placeholder.svg', imageAlt: '', link: '/contact' }] });
  };

  const removeArea = (idx: number) => {
    onUpdate({ areas: block.areas.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Heading</Label>
        <Input value={block.heading} onChange={(e) => onUpdate({ heading: e.target.value })} />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={block.description || ''} onChange={(e) => onUpdate({ description: e.target.value })} rows={2} />
      </div>

      <Label className="font-semibold">Practice Areas</Label>
      {block.areas.map((area, idx) => (
        <div key={idx} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Area {idx + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => removeArea(idx)} className="text-red-500 h-8 w-8 p-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Icon</Label>
            <Select value={area.icon} onValueChange={(v) => updateArea(idx, { icon: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((icon) => (
                  <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Title</Label>
            <Input value={area.title} onChange={(e) => updateArea(idx, { title: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Description</Label>
            <Textarea value={area.description} onChange={(e) => updateArea(idx, { description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Image URL</Label>
            <Input value={area.image} onChange={(e) => updateArea(idx, { image: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Image Alt Text</Label>
            <Input value={area.imageAlt || ''} onChange={(e) => updateArea(idx, { imageAlt: e.target.value })} placeholder="Describe the background image" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Link</Label>
            <Input value={area.link} onChange={(e) => updateArea(idx, { link: e.target.value })} placeholder="/practice-areas/..." />
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addArea} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Area
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent Posts Fields                                                 */
/* ------------------------------------------------------------------ */
function RecentPostsFields({ block, onUpdate }: { block: Extract<ContentBlock, { type: 'recent-posts' }>; onUpdate: (u: Partial<ContentBlock>) => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        This section dynamically displays your most recent published blog posts.
      </div>
      <div>
        <Label>Section Label</Label>
        <Input value={block.sectionLabel} onChange={(e) => onUpdate({ sectionLabel: e.target.value })} />
      </div>
      <div>
        <Label>Heading</Label>
        <Input value={block.heading} onChange={(e) => onUpdate({ heading: e.target.value })} />
      </div>
      <div>
        <Label>Number of Posts</Label>
        <Input type="number" min={1} max={12} value={block.postCount ?? 6} onChange={(e) => onUpdate({ postCount: Number(e.target.value) })} />
      </div>
    </div>
  );
}
