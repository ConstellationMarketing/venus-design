import { useState, useEffect } from "react";
import { Brain, Cpu, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { supabase } from "../../../../vendor/cms-core/client/lib/supabase";

interface AIStatusBannerProps {
  onAvailabilityChange?: (available: boolean) => void;
  className?: string;
}

export default function AIStatusBanner({
  onAvailabilityChange,
  className,
}: AIStatusBannerProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [model, setModel] = useState<string | undefined>();

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/.netlify/functions/ai-migration-assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: "ping", payload: {}, templateType: "" }),
      });

      if (response.ok) {
        const data = await response.json();
        const isAvailable = data?.result?.available === true;
        setAvailable(isAvailable);
        setModel(data?.result?.model);
        onAvailabilityChange?.(isAvailable);
      } else {
        setAvailable(false);
        onAvailabilityChange?.(false);
      }
    } catch {
      setAvailable(false);
      onAvailabilityChange?.(false);
    } finally {
      setChecking(false);
    }
  };

  if (checking) return null;

  if (available) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-1.5 text-sm text-green-700",
          className,
        )}
      >
        <Brain className="h-4 w-4 shrink-0" />
        <span>
          AI Assisted {model ? `(${model})` : ""}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm text-amber-700",
        className,
      )}
    >
      <Cpu className="h-4 w-4 shrink-0" />
      <span>
        Deterministic Mode — AI features unavailable. Add OPENAI_API_KEY for AI-assisted migration.
      </span>
    </div>
  );
}
