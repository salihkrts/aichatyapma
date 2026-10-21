"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  User,
  Brain,
  BookOpen,
  ShieldCheck,
  Save,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  characterSchema,
  defaultCharacterValues,
  type CharacterFormData,
} from "@/lib/validations/character";
import { createCharacterAction } from "@/app/actions/character";

import { ForgeCoreDemographics } from "@/components/forge/forge-core-demographics";
import { ForgePsychology } from "@/components/forge/forge-psychology";
import { ForgeLoreRag } from "@/components/forge/forge-lore-rag";
import { ForgeGuardrailsModel } from "@/components/forge/forge-guardrails-model";
import { ForgePreviewCard } from "@/components/forge/forge-preview-card";

const STEPS = [
  { id: "demographics", label: "Demographics", icon: User },
  { id: "psychology", label: "Psychology", icon: Brain },
  { id: "lore", label: "Lore & RAG", icon: BookOpen },
  { id: "guardrails", label: "Guardrails & Model", icon: ShieldCheck },
] as const;

export default function CharacterCreatePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("demographics");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CharacterFormData>({
    resolver: zodResolver(characterSchema),
    defaultValues: defaultCharacterValues,
    mode: "onChange",
  });

  const { handleSubmit, watch } = form;
  const formData = watch();

  const currentStepIndex = STEPS.findIndex((s) => s.id === activeTab);

  const onSubmit = async (data: CharacterFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const res = await createCharacterAction(data);

      if (res.success && res.data?.characterId) {
        router.push(`/chat?characterId=${res.data.characterId}`);
      } else {
        setSubmitError(res.error || "Failed to forge persona. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Submission failed:", err);
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setActiveTab(STEPS[currentStepIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setActiveTab(STEPS[currentStepIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-purple-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 size-[500px] rounded-full bg-purple-900/20 blur-[130px]" />
        <div className="absolute top-1/3 -right-40 size-[500px] rounded-full bg-blue-900/20 blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 size-[500px] rounded-full bg-pink-900/15 blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/10 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25">
                <Sparkles className="size-4" />
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                The Character Forge
              </h1>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Construct high-fidelity cognitive personas with custom lore, RAG corpus, and psychological nuances.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="border-white/10 bg-white/[0.03] hover:bg-white/10 text-neutral-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmit)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all duration-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                  Forging Persona...
                </>
              ) : (
                <>
                  <Save className="size-3.5 mr-2" />
                  Forge Persona
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error notification banner */}
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center justify-between"
          >
            <span>{submitError}</span>
            <button
              onClick={() => setSubmitError(null)}
              className="text-red-400 hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* Main Grid: Form Left, Preview Right */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Multi-tab Character Creation Form */}
          <div className="lg:col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Stepper Tabs Bar */}
              <TabsList className="w-full grid grid-cols-4 bg-neutral-900/60 border border-white/10 p-1 rounded-xl mb-6">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isCurrent = activeTab === step.id;
                  const isPast = idx < currentStepIndex;

                  return (
                    <TabsTrigger
                      key={step.id}
                      value={step.id}
                      className="flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300 data-[state=active]:border data-[state=active]:border-purple-500/30"
                    >
                      {isPast ? (
                        <Check className="size-3.5 text-emerald-400" />
                      ) : (
                        <Icon className="size-3.5" />
                      )}
                      <span className="hidden sm:inline">{step.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <form onSubmit={handleSubmit(onSubmit)}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TabsContent value="demographics" className="mt-0 outline-none">
                      <ForgeCoreDemographics form={form} />
                    </TabsContent>

                    <TabsContent value="psychology" className="mt-0 outline-none">
                      <ForgePsychology form={form} />
                    </TabsContent>

                    <TabsContent value="lore" className="mt-0 outline-none">
                      <ForgeLoreRag form={form} />
                    </TabsContent>

                    <TabsContent value="guardrails" className="mt-0 outline-none">
                      <ForgeGuardrailsModel form={form} />
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>

                {/* Step Navigation Controls */}
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStepIndex === 0}
                    className="border-white/10 bg-white/[0.03] text-xs text-neutral-300 hover:bg-white/10 disabled:opacity-40"
                  >
                    <ArrowLeft className="size-3.5 mr-2" /> Previous
                  </Button>

                  <div className="text-[11px] font-mono text-neutral-400">
                    Step {currentStepIndex + 1} of {STEPS.length}
                  </div>

                  {currentStepIndex < STEPS.length - 1 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20"
                    >
                      Next Step <ArrowRight className="size-3.5 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-3.5 mr-2 animate-spin" />
                          Forging...
                        </>
                      ) : (
                        <>
                          <Save className="size-3.5 mr-2" /> Finalize & Forge
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Tabs>
          </div>

          {/* Right Column: Sticky Holographic Preview */}
          <div className="lg:col-span-4 hidden lg:block">
            <ForgePreviewCard data={formData} />
          </div>
        </div>
      </div>
    </div>
  );
}
