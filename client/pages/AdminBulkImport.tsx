import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, History, Bookmark, BookOpen } from "lucide-react";
import ImportWizard from "@site/components/admin/importer/ImportWizard";
import ImportHistory from "@site/components/admin/importer/ImportHistory";
import MappingPresets from "@site/components/admin/importer/MappingPresets";
import RecipePresets from "@site/components/admin/importer/RecipePresets";
import SessionResumeBanner from "@site/components/admin/importer/SessionResumeBanner";
import type { MigrationSession } from "@site/lib/importer/recipeTypes";

export default function AdminBulkImport() {
  const [resumeSession, setResumeSession] = useState<MigrationSession | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("new-import");

  const handleResume = (session: MigrationSession) => {
    setResumeSession(session);
    setActiveTab("new-import");
  };

  const handleSessionCleared = () => {
    setResumeSession(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Content Importer</h1>
        <p className="text-muted-foreground mt-1">
          Import pages and posts from CSV files or JSON API feeds
        </p>
      </div>

      <SessionResumeBanner onResume={handleResume} />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="new-import" className="gap-2">
            <Upload className="h-4 w-4" />
            New Import
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Import History
          </TabsTrigger>
          <TabsTrigger value="presets" className="gap-2">
            <Bookmark className="h-4 w-4" />
            Mapping Presets
          </TabsTrigger>
          <TabsTrigger value="recipes" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Recipe Presets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new-import">
          <ImportWizard
            resumeSession={resumeSession}
            onSessionCleared={handleSessionCleared}
          />
        </TabsContent>

        <TabsContent value="history">
          <ImportHistory />
        </TabsContent>

        <TabsContent value="presets">
          <MappingPresets />
        </TabsContent>

        <TabsContent value="recipes">
          <RecipePresets />
        </TabsContent>
      </Tabs>
    </div>
  );
}
