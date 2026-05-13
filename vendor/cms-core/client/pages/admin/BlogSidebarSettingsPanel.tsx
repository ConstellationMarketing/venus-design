import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ImageUploader from "@/components/admin/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { X, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AwardImage {
  src: string;
  alt: string;
}

interface BlogSidebarSettingsPanelProps {
  onClose: () => void;
}

export default function BlogSidebarSettingsPanel({
  onClose,
}: BlogSidebarSettingsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [attorneyImage, setAttorneyImage] = useState("");
  const [awardImages, setAwardImages] = useState<AwardImage[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("blog_sidebar_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching sidebar settings:", error);
    } else if (data) {
      setSettingsId(data.id);
      setAttorneyImage(data.attorney_image || "");
      setAwardImages(
        Array.isArray(data.award_images) ? data.award_images : [],
      );
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settingsId) return;
    setSaving(true);

    const { error } = await supabase
      .from("blog_sidebar_settings")
      .update({
        attorney_image: attorneyImage,
        award_images: awardImages,
      })
      .eq("id", settingsId);

    if (error) {
      toast.error("Failed to save sidebar settings: " + error.message);
    }
    setSaving(false);
  };

  const addAward = () => {
    setAwardImages([...awardImages, { src: "", alt: "" }]);
  };

  const updateAward = (
    index: number,
    field: keyof AwardImage,
    value: string,
  ) => {
    const updated = [...awardImages];
    updated[index] = { ...updated[index], [field]: value };
    setAwardImages(updated);
  };

  const removeAward = (index: number) => {
    setAwardImages(awardImages.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Blog Sidebar Settings</CardTitle>
            <CardDescription>
              Manage the attorney photo and award images shown on blog posts
            </CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Attorney Image */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Attorney Photo</Label>
          <ImageUploader
            value={attorneyImage}
            onChange={setAttorneyImage}
            folder="sidebar"
            placeholder="Upload attorney photo"
          />
        </div>

        {/* Award Images */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Award Images</Label>
            <Button size="sm" variant="outline" onClick={addAward}>
              <Plus className="mr-1 h-4 w-4" />
              Add Award
            </Button>
          </div>

          {awardImages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No award images yet. Click "Add Award" to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {awardImages.map((award, index) => (
                <AwardImageRow
                  key={index}
                  award={award}
                  onUpdate={(field, value) => updateAward(index, field, value)}
                  onRemove={() => removeAward(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Saving..." : "Save Sidebar Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

interface AwardImageRowProps {
  award: AwardImage;
  onUpdate: (field: keyof AwardImage, value: string) => void;
  onRemove: () => void;
}

function AwardImageRow({ award, onUpdate, onRemove }: AwardImageRowProps) {
  return (
    <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
      <div className="flex items-start justify-between">
        <Label className="text-xs text-gray-500">Award Image</Label>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 -mt-1 -mr-2"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ImageUploader
        value={award.src}
        onChange={(url) => onUpdate("src", url)}
        folder="sidebar/awards"
        placeholder="Upload award image"
      />

      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Alt Text</Label>
        <Input
          value={award.alt}
          onChange={(e) => onUpdate("alt", e.target.value)}
          placeholder="e.g., Super Lawyers 2024"
          className="text-sm h-8"
        />
      </div>
    </div>
  );
}
