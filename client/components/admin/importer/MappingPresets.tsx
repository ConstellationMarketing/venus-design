import { useState, useEffect } from "react";
import { Loader2, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MappingPreset, MappingConfig } from "@site/lib/importer/types";
import { supabase } from "../../../../vendor/cms-core/client/lib/supabase";

export default function MappingPresets() {
  const [presets, setPresets] = useState<MappingPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("import_mapping_presets")
      .select("*")
      .order("created_at", { ascending: false });
    setPresets((data as MappingPreset[]) ?? []);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase
      .from("import_mapping_presets")
      .delete()
      .eq("id", deleteId);
    setDeleteId(null);
    setPresets((prev) => prev.filter((p) => p.id !== deleteId));
    if (expandedId === deleteId) setExpandedId(null);
  };

  const handleDuplicate = async (preset: MappingPreset) => {
    const { data } = await supabase
      .from("import_mapping_presets")
      .insert({
        name: `${preset.name} (copy)`,
        template_type: preset.template_type,
        mapping_json: preset.mapping_json,
      })
      .select("*")
      .single();
    if (data) {
      setPresets((prev) => [data as MappingPreset, ...prev]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (presets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No mapping presets saved</p>
          <p className="text-sm text-muted-foreground mt-1">
            Save a mapping preset during the import wizard to reuse it later
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved Mapping Presets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Mappings</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presets.map((preset) => {
                const config = preset.mapping_json as unknown as MappingConfig;
                const mappingCount = config?.mappings?.length ?? 0;

                return (
                  <>
                    <TableRow
                      key={preset.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        setExpandedId(
                          expandedId === preset.id ? null : preset.id,
                        )
                      }
                    >
                      <TableCell className="font-medium">
                        {preset.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {preset.template_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {mappingCount} field{mappingCount !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(preset.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(preset);
                            }}
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(preset.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedId === preset.id && config?.mappings && (
                      <TableRow key={`${preset.id}-detail`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">
                              Field Mappings
                            </p>
                            <div className="grid grid-cols-2 gap-2 max-w-lg">
                              {config.mappings.map((m, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-xs font-mono"
                                  >
                                    {m.sourceColumn}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs font-mono"
                                  >
                                    {m.targetField}
                                  </Badge>
                                  {m.transform && m.transform !== "none" && (
                                    <span className="text-xs text-muted-foreground">
                                      ({m.transform})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this mapping preset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
