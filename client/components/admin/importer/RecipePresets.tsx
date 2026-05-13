import { useState, useEffect } from "react";
import { Trash2, RefreshCw, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { listRecipes, deleteRecipe } from "@site/lib/importer/sessionPersistence";
import { supabase } from "../../../../vendor/cms-core/client/lib/supabase";

export default function RecipePresets() {
  const [recipes, setRecipes] = useState<
    Array<{
      id: string;
      name: string;
      templateType: string;
      version: number;
      isActive: boolean;
      confidenceThreshold: number;
      updatedAt: string;
      lastUsedAt: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const list = await listRecipes(undefined, session?.access_token);
      setRecipes(list);
    } catch (err) {
      console.error("Failed to load recipes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await deleteRecipe(id, session?.access_token);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete recipe:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const templateLabels: Record<string, string> = {
    practice: "Practice Pages",
    post: "Blog Posts",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Recipe Presets
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Saved transformation recipes for reuse across imports.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadRecipes}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Loading recipes...
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No recipe presets saved yet. Recipes are automatically saved when
            you complete an import using the Build Recipe step.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((recipe) => (
                <TableRow key={recipe.id}>
                  <TableCell className="font-medium">{recipe.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {templateLabels[recipe.templateType] ??
                        recipe.templateType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    v{recipe.version}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(recipe.confidenceThreshold * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(recipe.updatedAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {recipe.lastUsedAt ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(recipe.lastUsedAt)}
                      </span>
                    ) : (
                      "Never"
                    )}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will deactivate the recipe &quot;{recipe.name}&quot;.
                            Existing imports that used this recipe will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(recipe.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
