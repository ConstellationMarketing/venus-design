import { useState, useEffect } from "react";
import { PlayCircle, Trash2, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { STEP_LABELS } from "@site/lib/importer/types";
import type { WizardStep } from "@site/lib/importer/types";
import {
  listActiveSessions,
  abandonSession,
} from "@site/lib/importer/sessionPersistence";
import type { MigrationSession } from "@site/lib/importer/recipeTypes";
import { supabase } from "../../../../vendor/cms-core/client/lib/supabase";

interface SessionResumeBannerProps {
  onResume: (session: MigrationSession) => void;
}

const TEMPLATE_LABELS: Record<string, string> = {
  practice: "Practice Pages",
  post: "Blog Posts",
};

export default function SessionResumeBanner({
  onResume,
}: SessionResumeBannerProps) {
  const [sessions, setSessions] = useState<MigrationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const list = await listActiveSessions(session?.access_token);
      setSessions(list);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = async (sessionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await abandonSession(sessionId, session?.access_token);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error("Failed to discard session:", err);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading || sessions.length === 0) return null;

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Alert key={session.id} className="border-blue-200 bg-blue-50">
          <FileText className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 text-sm">
            In-Progress Migration
          </AlertTitle>
          <AlertDescription className="text-blue-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-1">
              <div className="flex-1 space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {TEMPLATE_LABELS[session.templateType] ??
                      session.templateType}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {session.recordsCount} records
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Step:{" "}
                    {STEP_LABELS[session.currentStep as WizardStep] ??
                      session.currentStep}
                  </Badge>
                </div>
                {session.name && (
                  <p className="font-medium">{session.name}</p>
                )}
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last updated: {formatDate(session.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => onResume(session)}
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  Resume
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Discard
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Discard Session</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently discard this in-progress migration.
                        Source data and any transformations will be lost.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDiscard(session.id)}
                      >
                        Discard
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
