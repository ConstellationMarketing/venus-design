import { useState, useRef } from "react";
import { Upload, Globe, FileUp, FileJson, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  SourceType,
  ParseResult,
  TemplateType,
} from "@site/lib/importer/types";
import { parseCSV } from "@site/lib/importer/csvParser";
import { parseJSON } from "@site/lib/importer/apiParser";
import { supabase } from "../../../../vendor/cms-core/client/lib/supabase";

interface StepSourceSelectProps {
  templateType: TemplateType;
  sourceType: SourceType | null;
  onSourceTypeChange: (type: SourceType) => void;
  onParseComplete: (result: ParseResult) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepSourceSelect({
  sourceType,
  onSourceTypeChange,
  onParseComplete,
  onNext,
  onBack,
}: StepSourceSelectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [jsonPath, setJsonPath] = useState("");
  const [apiHeaders, setApiHeaders] = useState("");
  const [useServerFetch, setUseServerFetch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await parseCSV(file);
      if (result.records.length === 0) {
        setError("No valid records found in the CSV file");
        return;
      }
      setParseResult(result);
      onParseComplete(result);
      onSourceTypeChange("csv");
    } catch (err) {
      setError(
        `Failed to parse CSV: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJSONPaste = () => {
    if (!jsonText.trim()) {
      setError("Please paste JSON content");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = parseJSON(jsonText, jsonPath || undefined);
      if (result.errors.length > 0 && result.records.length === 0) {
        setError(result.errors.map((e) => e.message).join("; "));
        return;
      }
      setParseResult(result);
      onParseComplete(result);
      onSourceTypeChange("json");
    } catch (err) {
      setError(
        `Failed to parse JSON: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAPIFetch = async () => {
    if (!apiUrl.trim()) {
      setError("Please enter an API URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (useServerFetch) {
        // Server-side fetch via Netlify function
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const headersObj: Record<string, string> = {};
        if (apiHeaders.trim()) {
          for (const line of apiHeaders.split("\n")) {
            const idx = line.indexOf(":");
            if (idx > 0) {
              headersObj[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
            }
          }
        }

        const response = await fetch("/.netlify/functions/bulk-import-fetch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            url: apiUrl,
            headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
            jsonPath: jsonPath || undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          setError(data.error || "Server-side fetch failed");
          return;
        }

        const result: ParseResult = {
          records: data.records,
          columns: data.columns,
          errors: [],
        };
        setParseResult(result);
        onParseComplete(result);
        onSourceTypeChange("api");
      } else {
        // Client-side fetch
        const response = await fetch(apiUrl);
        if (!response.ok) {
          setError(`API returned ${response.status}: ${response.statusText}`);
          return;
        }

        const text = await response.text();
        const result = parseJSON(text, jsonPath || undefined);
        if (result.errors.length > 0 && result.records.length === 0) {
          setError(result.errors.map((e) => e.message).join("; "));
          return;
        }
        setParseResult(result);
        onParseComplete(result);
        onSourceTypeChange("api");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("CORS") || msg.includes("fetch")) {
        setError(
          `Client-side fetch failed (likely CORS). Try enabling "Server-side fetch" below.`,
        );
        setUseServerFetch(true);
      } else {
        setError(`API fetch failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Load Source Data</h2>
        <p className="text-sm text-muted-foreground">
          Load your source data. Cleaning and structuring happens in the Content Preparation step.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* CSV Upload */}
        <Card
          className={cn(
            "transition-all",
            sourceType === "csv" && parseResult && "border-primary",
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileUp className="h-5 w-5" />
              CSV File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV files only
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCSVUpload}
            />
          </CardContent>
        </Card>

        {/* JSON Paste */}
        <Card
          className={cn(
            "transition-all",
            sourceType === "json" && parseResult && "border-primary",
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileJson className="h-5 w-5" />
              JSON Paste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Paste JSON</Label>
              <Textarea
                placeholder='[{"title": "...", "body": "..."}]'
                className="h-24 font-mono text-xs"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>JSON Path (optional)</Label>
              <Input
                placeholder="data.results"
                value={jsonPath}
                onChange={(e) => setJsonPath(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Dot-notation path to the records array
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleJSONPaste}
              disabled={loading || !jsonText.trim()}
            >
              Parse JSON
            </Button>
          </CardContent>
        </Card>

        {/* API Feed */}
        <Card
          className={cn(
            "transition-all",
            sourceType === "api" && parseResult && "border-primary",
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5" />
              API Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API URL</Label>
              <Input
                placeholder="https://api.example.com/data"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>JSON Path (optional)</Label>
              <Input
                placeholder="data.results"
                value={jsonPath}
                onChange={(e) => setJsonPath(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Dot-notation path to the records array in the response
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="server-fetch"
                checked={useServerFetch}
                onChange={(e) => setUseServerFetch(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="server-fetch" className="text-sm font-normal">
                Server-side fetch (CORS/auth)
              </Label>
            </div>

            {useServerFetch && (
              <div className="space-y-2">
                <Label>Custom Headers (optional)</Label>
                <Textarea
                  placeholder={"Authorization: Bearer abc123\nX-API-Key: mykey"}
                  className="h-16 font-mono text-xs"
                  value={apiHeaders}
                  onChange={(e) => setApiHeaders(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  One header per line: Header-Name: value
                </p>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleAPIFetch}
              disabled={loading || !apiUrl.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Fetching...
                </>
              ) : (
                "Fetch Data"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Parse summary */}
      {parseResult && parseResult.records.length > 0 && (
        <Alert>
          <AlertDescription>
            Parsed <strong>{parseResult.records.length}</strong> records with{" "}
            <strong>{parseResult.columns.length}</strong> columns.
            {parseResult.errors.length > 0 && (
              <span className="text-yellow-600 ml-2">
                ({parseResult.errors.length} parse warnings)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!parseResult || parseResult.records.length === 0}
        >
          Continue to Field Mapping
        </Button>
      </div>
    </div>
  );
}
