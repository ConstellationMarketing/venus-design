import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Template, ContentBlock } from '@/lib/database.types';
import { defaultPracticeAreaPageContent } from '@site/lib/cms/practiceAreaPageTypes';
import type { PracticeAreaPageContent } from '@site/lib/cms/practiceAreaPageTypes';
import PracticeAreaPageEditor from '@site/components/admin/editors/PracticeAreaPageEditor';
import BlockEditor from '@/components/admin/BlockEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from "sonner";

/** Deep-merge CMS content with defaults so every expected key exists */
function mergeWithDefaults<T extends Record<string, any>>(
  cmsContent: Partial<T> | null | undefined,
  defaults: T,
): T {
  if (!cmsContent) return defaults;

  const result: any = { ...defaults };

  for (const key in defaults) {
    if (cmsContent[key] !== undefined) {
      const defaultValue = defaults[key];
      const cmsValue = cmsContent[key];

      if (Array.isArray(defaultValue)) {
        result[key] = Array.isArray(cmsValue) && cmsValue.length > 0 ? cmsValue : defaultValue;
      } else if (defaultValue && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
        result[key] = { ...defaultValue, ...cmsValue };
      } else {
        result[key] = cmsValue;
      }
    }
  }

  for (const key in cmsContent) {
    if (!(key in defaults) && cmsContent[key] !== undefined) {
      result[key] = cmsContent[key];
    }
  }

  return result as T;
}

export default function AdminTemplateEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (id) fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      navigate('/admin/templates');
      return;
    }

    setTemplate(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);

    const { error } = await supabase
      .from('templates')
      .update({
        name: template.name,
        default_content: template.default_content,
        default_meta_title: template.default_meta_title,
        default_meta_description: template.default_meta_description,
      } as Record<string, unknown>)
      .eq('id', template.id);

    if (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template: ' + error.message);
    } else {
      toast.success('Template saved successfully!');
    }

    setSaving(false);
  };

  const updateTemplate = (updates: Partial<Template>) => {
    if (!template) return;
    setTemplate({ ...template, ...updates });
  };

  const isPracticeType = template?.page_type === 'practice';

  // Normalize practice content by merging with defaults
  const normalizedContent = useMemo(() => {
    if (!template || !isPracticeType) return template?.default_content;
    return mergeWithDefaults(
      template.default_content as Partial<PracticeAreaPageContent> | null,
      defaultPracticeAreaPageContent,
    );
  }, [template?.default_content, isPracticeType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!template) {
    return <div>Template not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/templates">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
              <Badge variant="outline" className="capitalize">
                {template.page_type}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm">Template Editor</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </>
          )}
        </Button>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Template Settings</CardTitle>
          <CardDescription>Basic information about this template</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={template.name}
              onChange={(e) => updateTemplate({ name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Page Type</Label>
            <Input value={template.page_type} disabled className="capitalize bg-gray-50" />
            <p className="text-xs text-gray-500">Page type cannot be changed after creation.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaTitle">Default Meta Title Pattern</Label>
            <Input
              id="metaTitle"
              value={template.default_meta_title || ''}
              onChange={(e) => updateTemplate({ default_meta_title: e.target.value || null })}
              placeholder="[Page Title] | Your Firm Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaDescription">Default Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={template.default_meta_description || ''}
              onChange={(e) => updateTemplate({ default_meta_description: e.target.value || null })}
              placeholder="A default description for pages using this template..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Editor Card */}
      <Card>
        <CardHeader>
          <CardTitle>Default Content</CardTitle>
          <CardDescription>
            {isPracticeType
              ? 'Edit the default content sections that new pages will start with.'
              : 'Add and arrange the default content blocks that new pages will start with.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateContentEditor
            pageType={template.page_type}
            content={isPracticeType ? normalizedContent : template.default_content}
            onChange={(content) => updateTemplate({ default_content: content as any })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/** Routes to the correct editor based on page type */
function TemplateContentEditor({
  pageType,
  content,
  onChange,
}: {
  pageType: string;
  content: unknown;
  onChange: (content: unknown) => void;
}) {
  if (pageType === 'practice') {
    return (
      <PracticeAreaPageEditor
        content={content as PracticeAreaPageContent}
        onChange={onChange}
      />
    );
  }

  // standard / landing → block editor
  const blocks = Array.isArray(content) ? (content as ContentBlock[]) : [];
  return <BlockEditor content={blocks} onChange={onChange} />;
}
