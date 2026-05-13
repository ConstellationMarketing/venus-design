import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type {
  WizardState,
  WizardStep,
  TemplateType,
  SourceType,
  ParseResult,
  MappingConfig,
  ValidationResult,
  TransformedRecord,
  PreparedRecord,
  ImportMode,
  BatchItemResult,
} from "@site/lib/importer/types";
import {
  INITIAL_WIZARD_STATE,
  WIZARD_STEPS,
  STEP_LABELS,
} from "@site/lib/importer/types";
import type {
  ImportRecipe,
  TransformedRecordWithConfidence,
  MigrationSession,
} from "@site/lib/importer/recipeTypes";
import StepTemplateSelect from "./StepTemplateSelect";
import StepSourceSelect from "./StepSourceSelect";
import StepFieldDetection from "./StepFieldDetection";
import StepTeachRecipe from "./StepTeachRecipe";
import StepAutoTransform from "./StepAutoTransform";
import StepExceptionReview from "./StepExceptionReview";
import StepValidation from "./StepValidation";
import StepPreview from "./StepPreview";
import StepImportRun from "./StepImportRun";
import AIStatusBanner from "./AIStatusBanner";
import {
  createSession,
  debouncedSaveSession,
  flushSave,
  loadSession,
} from "@site/lib/importer/sessionPersistence";
import { supabase } from "../../../../vendor/cms-core/client/lib/supabase";
import { useSiteSettings } from "@site/contexts/SiteSettingsContext";

interface ImportWizardProps {
  /** Session to resume (passed from SessionResumeBanner) */
  resumeSession?: MigrationSession | null;
  onSessionCleared?: () => void;
}

export default function ImportWizard({
  resumeSession,
  onSessionCleared,
}: ImportWizardProps) {
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE);
  const [aiAvailable, setAiAvailable] = useState(false);
  const accessTokenRef = useRef<string | undefined>();
  const { settings } = useSiteSettings();
  const siteName = settings.siteName || "";

  // Fetch access token on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      accessTokenRef.current = session?.access_token;
    });
  }, []);

  // Handle session resume
  useEffect(() => {
    if (!resumeSession) return;
    resumeFromSession(resumeSession);
  }, [resumeSession]);

  const resumeFromSession = async (session: MigrationSession) => {
    // Load full session data
    const full = await loadSession(session.id, accessTokenRef.current);
    if (!full) return;

    setState((prev) => ({
      ...prev,
      currentStep: (full.currentStep as WizardStep) || "template",
      templateType: full.templateType,
      sourceType: full.sourceType,
      parseResult: full.sourceData
        ? {
            records: full.sourceData,
            columns: full.sourceSummary?.columns ?? [],
            errors: [],
          }
        : null,
      mappingConfig: full.mapping ?? null,
      recipe: full.recipe ?? null,
      sessionId: full.id,
      confidenceResults: full.transformedRecords ?? [],
      exceptionIndices: full.exceptionIndices ?? [],
      transformedRecords: (full.transformedRecords ?? [])
        .filter(
          (r) =>
            r.status === "auto_approved" ||
            r.status === "approved" ||
            r.status === "edited",
        )
        .map((r) => r.record),
    }));
  };

  // Auto-save session on state changes (debounced)
  useEffect(() => {
    if (!state.sessionId) return;
    if (state.currentStep === "template") return;

    const session = stateToSession(state);
    if (session) {
      debouncedSaveSession(session, accessTokenRef.current);
    }
  }, [
    state.currentStep,
    state.mappingConfig,
    state.recipe,
    state.confidenceResults,
    state.exceptionIndices,
  ]);

  const stateToSession = (
    s: WizardState,
  ): MigrationSession | null => {
    if (!s.sessionId || !s.templateType || !s.sourceType) return null;

    const approved = s.confidenceResults.filter(
      (r) =>
        r.status === "auto_approved" ||
        r.status === "approved" ||
        r.status === "edited",
    );
    const exceptions = s.confidenceResults.filter(
      (r) => r.status === "needs_review",
    );
    const skipped = s.confidenceResults.filter(
      (r) => r.status === "skipped",
    );

    return {
      id: s.sessionId,
      templateType: s.templateType,
      sourceType: s.sourceType,
      currentStep: s.currentStep,
      recordsCount: s.parseResult?.records.length ?? 0,
      approvedCount: approved.length,
      exceptionCount: exceptions.length,
      skippedCount: skipped.length,
      errorCount: 0,
      sourceSummary: s.parseResult
        ? {
            columns: s.parseResult.columns,
            recordCount: s.parseResult.records.length,
          }
        : undefined,
      sourceData: s.parseResult?.records,
      mapping: s.mappingConfig ?? undefined,
      recipe: s.recipe ?? undefined,
      transformedRecords: s.confidenceResults.length > 0
        ? s.confidenceResults
        : undefined,
      exceptionIndices: s.exceptionIndices,
      status: "in_progress",
    };
  };

  // Create or ensure session exists
  const ensureSession = useCallback(
    async (templateType: TemplateType, sourceType: SourceType) => {
      if (state.sessionId) return state.sessionId;

      try {
        const session = await createSession(
          {
            templateType,
            sourceType,
            currentStep: "source",
            recordsCount: 0,
            approvedCount: 0,
            exceptionCount: 0,
            skippedCount: 0,
            errorCount: 0,
            status: "in_progress",
          },
          accessTokenRef.current,
        );
        setState((prev) => ({ ...prev, sessionId: session.id }));
        return session.id;
      } catch (err) {
        console.warn("Failed to create session:", err);
        return null;
      }
    },
    [state.sessionId],
  );

  const goToStep = useCallback(
    async (step: WizardStep) => {
      // Flush any pending saves before transitioning
      if (state.sessionId) {
        const session = stateToSession({
          ...state,
          currentStep: step,
        });
        if (session) {
          await flushSave(session, accessTokenRef.current);
        }
      }
      setState((prev) => ({ ...prev, currentStep: step }));
    },
    [state.sessionId, state.templateType, state.sourceType],
  );

  const setTemplateType = useCallback((type: TemplateType) => {
    setState((prev) => ({
      ...prev,
      templateType: type,
      // Reset all downstream state
      parseResult: null,
      mappingConfig: null,
      preparedRecords: [],
      validationResult: null,
      transformedRecords: [],
      batchResults: [],
      recipe: null,
      mappedRecords: [],
      confidenceResults: [],
      exceptionIndices: [],
      sessionId: null,
    }));
  }, []);

  const setSourceType = useCallback((type: SourceType) => {
    setState((prev) => ({ ...prev, sourceType: type }));
  }, []);

  const setParseResult = useCallback(
    (result: ParseResult) => {
      setState((prev) => ({
        ...prev,
        parseResult: result,
        // Reset downstream
        mappingConfig: null,
        preparedRecords: [],
        validationResult: null,
        transformedRecords: [],
        recipe: null,
        mappedRecords: [],
        confidenceResults: [],
        exceptionIndices: [],
      }));
      // Ensure session exists after source is loaded
      if (state.templateType && state.sourceType) {
        ensureSession(state.templateType, state.sourceType);
      }
    },
    [state.templateType, state.sourceType, ensureSession],
  );

  const setMappingConfig = useCallback((config: MappingConfig) => {
    setState((prev) => ({
      ...prev,
      mappingConfig: config,
      // Recipe and downstream may need re-evaluation
      preparedRecords: [],
      validationResult: null,
      transformedRecords: [],
      confidenceResults: [],
      exceptionIndices: [],
    }));
  }, []);

  const setRecipe = useCallback((recipe: ImportRecipe | null) => {
    setState((prev) => ({
      ...prev,
      recipe,
      // Clear transform results when recipe changes
      confidenceResults: [],
      exceptionIndices: [],
      validationResult: null,
      transformedRecords: [],
    }));
  }, []);

  const setConfidenceResults = useCallback(
    (results: TransformedRecordWithConfidence[]) => {
      const threshold = state.recipe?.confidenceThreshold ?? 0.8;
      const exceptions = results
        .map((r, i) => (r.confidence.overall < threshold ? i : -1))
        .filter((i) => i >= 0);

      // Auto-approve records above threshold
      const updated = results.map((r) => ({
        ...r,
        status:
          r.confidence.overall >= threshold
            ? ("auto_approved" as const)
            : ("needs_review" as const),
      }));

      setState((prev) => ({
        ...prev,
        confidenceResults: updated,
        exceptionIndices: exceptions,
      }));
    },
    [state.recipe?.confidenceThreshold],
  );

  const updateConfidenceRecord = useCallback(
    (
      index: number,
      update: Partial<TransformedRecordWithConfidence>,
    ) => {
      setState((prev) => ({
        ...prev,
        confidenceResults: prev.confidenceResults.map((r, i) =>
          i === index ? { ...r, ...update } : r,
        ),
      }));
    },
    [],
  );

  const setPreparedRecords = useCallback((records: PreparedRecord[]) => {
    setState((prev) => ({
      ...prev,
      preparedRecords: records,
      validationResult: null,
      transformedRecords: [],
    }));
  }, []);

  const setValidationResult = useCallback((result: ValidationResult) => {
    setState((prev) => ({ ...prev, validationResult: result }));
  }, []);

  const setTransformedRecords = useCallback(
    (records: TransformedRecord[]) => {
      setState((prev) => ({ ...prev, transformedRecords: records }));
    },
    [],
  );

  const setImportMode = useCallback((mode: ImportMode) => {
    setState((prev) => ({ ...prev, importMode: mode }));
  }, []);

  const setJobId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, jobId: id }));
  }, []);

  const addBatchResults = useCallback((results: BatchItemResult[]) => {
    setState((prev) => ({
      ...prev,
      batchResults: [...prev.batchResults, ...results],
    }));
  }, []);

  const setImporting = useCallback((importing: boolean) => {
    setState((prev) => ({ ...prev, isImporting: importing }));
  }, []);

  const setImportProgress = useCallback(
    (progress: { current: number; total: number } | null) => {
      setState((prev) => ({ ...prev, importProgress: progress }));
    },
    [],
  );

  const resetWizard = useCallback(() => {
    setState(INITIAL_WIZARD_STATE);
    onSessionCleared?.();
  }, [onSessionCleared]);

  const currentStepIndex = WIZARD_STEPS.indexOf(state.currentStep);

  return (
    <div className="space-y-6">
      {/* AI Status Banner */}
      <AIStatusBanner onAvailabilityChange={setAiAvailable} />

      {/* Step indicator */}
      <nav aria-label="Import progress">
        <ol className="flex items-center gap-1 overflow-x-auto pb-2">
          {WIZARD_STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <li key={step} className="flex items-center gap-1 flex-shrink-0">
                {index > 0 && (
                  <div
                    className={cn(
                      "h-px w-4 sm:w-6 transition-colors",
                      isCompleted ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
                <button
                  onClick={() => {
                    if (isCompleted) goToStep(step);
                  }}
                  disabled={!isCompleted && !isCurrent}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                    isCompleted &&
                      "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
                    isCurrent && "bg-primary text-primary-foreground",
                    !isCompleted &&
                      !isCurrent &&
                      "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                  <span className="hidden md:inline">
                    {STEP_LABELS[step]}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <div>
        {state.currentStep === "template" && (
          <StepTemplateSelect
            selected={state.templateType}
            onSelect={setTemplateType}
            onNext={() => goToStep("source")}
          />
        )}

        {state.currentStep === "source" && (
          <StepSourceSelect
            templateType={state.templateType!}
            sourceType={state.sourceType}
            onSourceTypeChange={setSourceType}
            onParseComplete={setParseResult}
            onNext={() => goToStep("field_detection")}
            onBack={() => goToStep("template")}
          />
        )}

        {state.currentStep === "field_detection" && (
          <StepFieldDetection
            templateType={state.templateType!}
            parseResult={state.parseResult!}
            mappingConfig={state.mappingConfig}
            onMappingChange={setMappingConfig}
            onNext={() => goToStep("teach_recipe")}
            onBack={() => goToStep("source")}
          />
        )}

        {state.currentStep === "teach_recipe" && (
          <StepTeachRecipe
            templateType={state.templateType!}
            parseResult={state.parseResult!}
            mappingConfig={state.mappingConfig!}
            recipe={state.recipe}
            onRecipeChange={setRecipe}
            aiAvailable={aiAvailable}
            siteName={siteName}
            onNext={() => goToStep("auto_transform")}
            onBack={() => goToStep("field_detection")}
          />
        )}

        {state.currentStep === "auto_transform" && (
          <StepAutoTransform
            templateType={state.templateType!}
            parseResult={state.parseResult!}
            mappingConfig={state.mappingConfig!}
            recipe={state.recipe!}
            slugCollisionMode={state.slugCollisionMode}
            siteName={siteName}
            onTransformComplete={(records, exceptions) => {
              setConfidenceResults(records);
              setState((prev) => ({
                ...prev,
                exceptionIndices: exceptions,
              }));
            }}
            onNext={() => {
              // Skip exception review if no exceptions
              if (state.exceptionIndices.length === 0) {
                goToStep("validation");
              } else {
                goToStep("exception_review");
              }
            }}
            onBack={() => goToStep("teach_recipe")}
          />
        )}

        {state.currentStep === "exception_review" && (
          <StepExceptionReview
            templateType={state.templateType!}
            records={state.confidenceResults}
            exceptionIndices={state.exceptionIndices}
            onRecordsChange={(updated) =>
              setState((prev) => ({
                ...prev,
                confidenceResults: updated,
              }))
            }
            onNext={() => goToStep("validation")}
            onBack={() => goToStep("auto_transform")}
          />
        )}

        {state.currentStep === "validation" && (
          <StepValidation
            templateType={state.templateType!}
            parseResult={state.parseResult!}
            mappingConfig={state.mappingConfig!}
            preparedRecords={state.preparedRecords}
            confidenceResults={state.confidenceResults}
            validationResult={state.validationResult}
            onValidationComplete={setValidationResult}
            onTransformed={setTransformedRecords}
            onNext={() => goToStep("preview")}
            onBack={() => {
              if (state.exceptionIndices.length > 0) {
                goToStep("exception_review");
              } else {
                goToStep("auto_transform");
              }
            }}
          />
        )}

        {state.currentStep === "preview" && (
          <StepPreview
            templateType={state.templateType!}
            transformedRecords={state.transformedRecords}
            preparedRecords={state.preparedRecords}
            confidenceResults={state.confidenceResults}
            validationResult={state.validationResult}
            onNext={() => goToStep("import")}
            onBack={() => goToStep("validation")}
          />
        )}

        {state.currentStep === "import" && (
          <StepImportRun
            templateType={state.templateType!}
            sourceType={state.sourceType!}
            transformedRecords={state.transformedRecords}
            preparedRecords={state.preparedRecords}
            confidenceResults={state.confidenceResults}
            recipe={state.recipe}
            sessionId={state.sessionId}
            importMode={state.importMode}
            onImportModeChange={setImportMode}
            jobId={state.jobId}
            onJobIdChange={setJobId}
            batchResults={state.batchResults}
            onBatchResults={addBatchResults}
            isImporting={state.isImporting}
            onImportingChange={setImporting}
            importProgress={state.importProgress}
            onProgressChange={setImportProgress}
            onReset={resetWizard}
            onBack={() => goToStep("preview")}
          />
        )}
      </div>
    </div>
  );
}
