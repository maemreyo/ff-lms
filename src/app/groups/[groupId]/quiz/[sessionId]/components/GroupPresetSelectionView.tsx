"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lightbulb,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomPromptPresets } from "@/hooks/use-custom-prompts";
import { PresetConfirmationDialog } from "../../../../../../components/groups/quiz/PresetConfirmationDialog";
import { PresetSelectionHeader } from "../../../../../../components/groups/quiz/PresetSelectionHeader";
import { PresetCard } from "../../../../../../components/groups/quiz/PresetCard";
import { CustomGenerationSection } from "../../../../../../components/groups/quiz/CustomGenerationSection";
import { StartQuizSection } from "../../../../../../components/groups/quiz/StartQuizSection";
import { GenerationProgressModal } from "../../../../../../components/groups/quiz/GenerationProgressModal";
import { QuestionTypeSelector, type QuestionType } from "../../../../../../components/groups/quiz/QuestionTypeSelector";
import type { QuestionPreset } from "../../../../../../components/questions/PresetSelector";

interface GroupPresetSelectionViewProps {
  groupId: string;
  onPresetSelect: (preset: QuestionPreset) => void;
  onlineParticipants: Array<{
    user_id: string;
    user_email: string;
    is_online: boolean;
  }>;
  onGenerateQuestions?: (
    difficulty: "easy" | "medium" | "hard"
  ) => Promise<void>;
  onGenerateAllQuestions?: () => Promise<void>;
  onGenerateFromPreset?: (
    distribution: { easy: number; medium: number; hard: number },
    presetInfo: { id: string; name: string }
  ) => Promise<void>;
  generatingState?: {
    easy: boolean;
    medium: boolean;
    hard: boolean;
    all: boolean;
  };
  generatedCounts?: {
    easy: number;
    medium: number;
    hard: number;
  };
  shareTokens?: Record<string, string>;
  onStartQuiz?: (shareTokens: Record<string, string>) => void;
  currentPreset?: {
    id: string;
    name: string;
    distribution: { easy: number; medium: number; hard: number };
    createdAt: Date;
  } | null;
  needsPresetReplacement?: (presetId: string) => boolean;
}

export function GroupPresetSelectionView({
  groupId,
  onPresetSelect,
  onlineParticipants,
  onGenerateQuestions,
  onGenerateAllQuestions,
  onGenerateFromPreset,
  generatingState = { easy: false, medium: false, hard: false, all: false },
  generatedCounts = { easy: 0, medium: 0, hard: 0 },
  shareTokens = {},
  onStartQuiz,
  currentPreset,
  needsPresetReplacement,
}: GroupPresetSelectionViewProps) {
  const router = useRouter();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [generatingPresetId, setGeneratingPresetId] = useState<string | null>(null);
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('multiple-choice');
  const [pendingPreset, setPendingPreset] = useState<{
    id: string;
    name: string;
    distribution: { easy: number; medium: number; hard: number };
  } | null>(null);

  // Load custom prompts
  const { customPresets, isLoading: customPromptsLoading } =
    useCustomPromptPresets();

  // Filter presets based on selected question type
  const filteredPresets = customPresets.filter(preset => {
    if (selectedQuestionType === 'multiple-choice') {
      // Multiple choice presets are the default ones that don't contain fill-in-the-blank keywords
      return !preset.name.toLowerCase().includes('fill-in-the-blank') &&
             !preset.name.toLowerCase().includes('dictation');
    } else {
      // Completion presets contain fill-in-the-blank or dictation keywords
      return preset.name.toLowerCase().includes('fill-in-the-blank') ||
             preset.name.toLowerCase().includes('dictation');
    }
  });

  // Custom generation levels
  const customLevels = [
    {
      id: "easy",
      name: "Easy Questions",
      description: "Basic comprehension and recall",
      icon: Lightbulb,
      textColor: "text-green-700",
      borderColor: "border-green-300",
      bgColor: "bg-green-50",
      hoverColor: "hover:bg-green-100",
    },
    {
      id: "medium",
      name: "Medium Questions",
      description: "Application and analysis",
      icon: Target,
      textColor: "text-yellow-700",
      borderColor: "border-yellow-300",
      bgColor: "bg-yellow-50",
      hoverColor: "hover:bg-yellow-100",
    },
    {
      id: "hard",
      name: "Hard Questions",
      description: "Critical thinking and synthesis",
      icon: Trophy,
      textColor: "text-red-700",
      borderColor: "border-red-300",
      bgColor: "bg-red-50",
      hoverColor: "hover:bg-red-100",
    },
  ];

  const totalGenerated = Object.values(generatedCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  const isGenerating =
    generatingState.easy ||
    generatingState.medium ||
    generatingState.hard ||
    generatingState.all;

  // Show progress modal when generating
  React.useEffect(() => {
    if (isGenerating && generatingPresetId) {
      setShowProgressModal(true);
    }
    // Remove auto-close logic - let user close manually when ready
  }, [isGenerating, generatingPresetId]);

  const handleGoBack = () => {
    router.push(`/groups/${groupId}`);
  };

  const handlePresetSelection = async (preset: any) => {
    if (preset.id === "custom") {
      setSelectedPreset(preset.id);
      return;
    }

    if (needsPresetReplacement && needsPresetReplacement(preset.id)) {
      setPendingPreset(preset);
      setShowConfirmationDialog(true);
      return;
    }

    await generateFromPreset(preset);
  };

  const generateFromPreset = async (preset: any) => {
    if (!onGenerateFromPreset) {
      toast.error("Generation not available");
      return;
    }

    try {
      setSelectedPreset(preset.id);
      setGeneratingPresetId(preset.id);

      // Pass additional info for custom prompts
      const presetInfo = {
        id: preset.id,
        name: preset.name,
        isCustom: preset.isCustom || false,
        systemPrompt: preset.system_prompt,
        userTemplate: preset.user_template,
        config: preset.config,
      };

      await onGenerateFromPreset(preset.distribution, presetInfo);
      toast.success(
        `Generated ${preset.totalQuestions} questions from ${preset.name}!`
      );
    } catch (error) {
      console.error("Failed to generate from preset:", error);
      toast.error("Failed to generate questions from preset");
      setSelectedPreset(null);
      setGeneratingPresetId(null);
      setShowProgressModal(false);
    }
  };

  const handleConfirmPresetReplacement = async () => {
    if (pendingPreset) {
      setShowConfirmationDialog(false); // Close confirmation dialog immediately
      await generateFromPreset(pendingPreset);
      setPendingPreset(null);
    }
  };

  const handleCancelPresetReplacement = () => {
    setPendingPreset(null);
    setShowConfirmationDialog(false);
  };

  const handleCustomGenerateQuestions = async (
    difficulty: "easy" | "medium" | "hard"
  ) => {
    if (!onGenerateQuestions) {
      toast.error("Generation not available");
      return;
    }

    try {
      await onGenerateQuestions(difficulty);
    } catch (error) {
      console.error(`Failed to generate ${difficulty} questions:`, error);
      toast.error(`Failed to generate ${difficulty} questions`);
    }
  };

  const getCurrentPresetName = () => {
    if (generatingPresetId) {
      const preset = customPresets.find(p => p.id === generatingPresetId);
      return preset?.name || 'Unknown Preset';
    }
    return undefined;
  };

  return (
    <div className="space-y-6">
      {/* Confirmation Dialog */}
      {showConfirmationDialog && currentPreset && pendingPreset && (
        <PresetConfirmationDialog
          isOpen={showConfirmationDialog}
          currentPreset={currentPreset}
          newPreset={pendingPreset}
          onConfirm={handleConfirmPresetReplacement}
          onCancel={handleCancelPresetReplacement}
        />
      )}

      {/* Generation Progress Modal */}
      <GenerationProgressModal
        isOpen={showProgressModal}
        generatingState={generatingState}
        generatedCounts={generatedCounts}
        presetName={getCurrentPresetName()}
        onClose={() => {
          setShowProgressModal(false);
          setGeneratingPresetId(null);
        }}
      />

      {/* Header */}
      <PresetSelectionHeader
        onGoBack={handleGoBack}
        currentPreset={currentPreset}
      />

      {/* Start Quiz Section - Moved to top when questions available */}
      <StartQuizSection
        totalGenerated={totalGenerated}
        shareTokens={shareTokens}
        onStartQuiz={onStartQuiz}
      />

      {/* Question Type Selector - More compact */}
      <QuestionTypeSelector
        selectedType={selectedQuestionType}
        onTypeChange={(type) => {
          setSelectedQuestionType(type);
          // Reset selected preset when changing question type
          setSelectedPreset(null);
        }}
        disabled={isGenerating}
      />

      {/* Presets Grid */}
      {customPromptsLoading ? (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Loading custom presets...</div>
        </div>
      ) : (
        <>
          {/* Custom Presets Only */}
          {filteredPresets.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedQuestionType === 'multiple-choice' ? 'Multiple Choice' : 'Fill-in-the-Blank'} Templates
                <span className="ml-2 text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Custom Prompts
                </span>
              </h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPresets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    isSelected={
                      selectedPreset === preset.id ||
                      currentPreset?.id === preset.id
                    }
                    isGenerating={generatingPresetId === preset.id}
                    onClick={() => handlePresetSelection(preset)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-12">
              <div className="text-center text-gray-500">
                <p className="text-lg mb-2">
                  No {selectedQuestionType === 'multiple-choice' ? 'multiple choice' : 'fill-in-the-blank'} prompts available
                </p>
                <p className="text-sm">
                  {selectedQuestionType === 'multiple-choice'
                    ? 'Multiple choice question templates will appear here'
                    : 'Fill-in-the-blank question templates will appear here'}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Custom Generation Section */}
      {selectedPreset === "custom" && (
        <CustomGenerationSection
          customLevels={customLevels}
          generatedCounts={generatedCounts}
          isGenerating={isGenerating}
          generatingState={generatingState}
          onGenerateQuestions={handleCustomGenerateQuestions}
        />
      )}
    </div>
  );
}