"use client";
/**
 * Completion Question Active Component
 * Optimized for active quiz taking with separate input fields
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExplanationWithTimeframes } from "@/components/groups/quiz/ExplanationWithTimeframes";
import { QuestionComponentProps } from "@/lib/registry/QuestionTypeRegistry";
import {
  CompletionQuestion as CompletionQuestionType,
  CompletionResponse,
} from "@/lib/types/question-types";

/**
 * Active Completion Question Component - Optimized for quiz taking
 */
export function CompletionQuestionActive({
  question,
  questionIndex,
  responses,
  onAnswerSelect,
  showResults = false,
  evaluationResult,
  enableWordSelection = true,
  videoUrl,
}: QuestionComponentProps<CompletionQuestionType>) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const questionRef = useRef<HTMLDivElement>(null);

  // Initialize answers from existing response
  useEffect(() => {
    const existingResponse = responses.find(
      (r) => r.questionIndex === questionIndex
    );
    if (existingResponse && existingResponse.questionType === "completion") {
      const completionResponse = existingResponse as CompletionResponse;
      const answerMap: Record<string, string> = {};
      completionResponse.response.answers.forEach((answer) => {
        answerMap[answer.blankId] = answer.value;
      });
      setAnswers(answerMap);
    } else {
      // Clear answers when moving to a new question
      setAnswers({});
    }
  }, [questionIndex]);

  // Update answer for a specific blank - memoized to prevent re-renders
  const updateAnswer = useCallback(
    (blankId: string, value: string) => {
      const newAnswers = { ...answers, [blankId]: value };
      setAnswers(newAnswers);

      // Create response object
      const response: CompletionResponse = {
        questionIndex,
        questionType: "completion",
        timestamp: new Date(),
        response: {
          answers: Object.entries(newAnswers).map(([blankId, value]) => ({
            blankId,
            value: value.trim(),
          })),
        },
      };

      onAnswerSelect(questionIndex, response);
    },
    [answers, questionIndex, onAnswerSelect]
  );

  // Render the template with visual blank indicators - memoized
  const renderTemplateDisplay = useCallback(() => {
    const template = question.content.template;
    const parts = template.split("____"); // Leave this `____` don't need to fix

    return (
      <div className="text-lg leading-relaxed text-gray-800 mb-6">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < question.content.blanks.length && (
              <span className="inline-flex items-center px-3 py-1 mx-1 bg-blue-100 border-2 border-dashed border-blue-400 rounded text-blue-800 font-bold text-sm">
                #{index + 1}
              </span>
            )}
          </span>
        ))}
      </div>
    );
  }, [question.content.template, question.content.blanks.length]);

  // Render optimized input fields for active quiz taking - memoized
  const renderInputFields = useCallback(() => {
    const blanks = question.content.blanks.sort(
      (a, b) => a.position - b.position
    );

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {blanks.map((blank, index) => {
          // Handle different blank ID formats - AI generates without IDs
          const blankId = blank.id || `blank-${index}`;
          const isCorrect =
            showResults &&
            evaluationResult?.partialCredit?.details?.includes(
              `blank-${blankId}-correct`
            );
          const isIncorrect =
            showResults &&
            evaluationResult?.partialCredit?.details?.includes(
              `blank-${blankId}-incorrect`
            );
          const currentValue = answers[blankId] || "";

          return (
            <div key={blankId} className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  {index + 1}
                </span>
                Blank {index + 1}
              </label>
              <Input
                type="text"
                value={currentValue}
                onChange={(e) => updateAnswer(blankId, e.target.value)}
                disabled={showResults}
                placeholder="Type your answer..."
                autoFocus
                className={`
                  h-12 text-lg font-medium
                  transition-all duration-200
                  ${
                    isCorrect
                      ? "border-green-500 bg-green-50 text-green-800"
                      : ""
                  }
                  ${isIncorrect ? "border-red-500 bg-red-50 text-red-800" : ""}
                  ${
                    !showResults
                      ? "hover:border-gray-400 focus:border-blue-500"
                      : ""
                  }
                `}
              />
              {showResults && isCorrect && (
                <div className="flex items-center gap-2 text-green-600">
                  <span className="text-lg">✓</span>
                  <span className="font-medium">Correct</span>
                </div>
              )}
              {showResults && isIncorrect && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-red-600">
                    <span className="text-lg">✗</span>
                    <span className="font-medium">Incorrect</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Correct answer:{" "}
                    <span className="font-medium text-green-700">
                      {(() => {
                        // Handle expected format (acceptedAnswers)
                        if (
                          blank.acceptedAnswers &&
                          Array.isArray(blank.acceptedAnswers)
                        ) {
                          return blank.acceptedAnswers[0];
                        }
                        // Handle AI-generated format (answer)
                        if ((blank as any).answer) {
                          return (blank as any).answer;
                        }
                        return "???";
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [
    question.content.blanks,
    showResults,
    evaluationResult,
    answers,
    updateAnswer,
  ]);

  return (
    <Card className="border-2 border-purple-100 shadow-lg">
      <CardContent className="p-8">
        {/* Question Text */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            {question.question}
          </h3>
          <p className="text-gray-600">
            Fill in the numbered blanks with the appropriate words based on what
            you heard.
          </p>
        </div>

        {/* Template Display */}
        <div
          id={`question-text-${questionIndex}`}
          ref={questionRef}
          className={`
            mb-8 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6
            ${enableWordSelection ? "select-text cursor-text" : ""}
          `}
        >
          {renderTemplateDisplay()}
        </div>

        {/* Input Fields */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Your Answers:
          </h4>
          {renderInputFields()}
        </div>

        {/* Hints Section */}
        {question.content.blanks.some((blank) => blank.hint) &&
          !showResults && (
            <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <span className="text-lg">💡</span>
                Hints
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                {question.content.blanks
                  .filter((blank) => blank.hint)
                  .map((blank, index) => (
                    <div
                      key={blank.id}
                      className="flex items-start gap-3 text-blue-700"
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-800 text-xs font-bold mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-sm">{blank.hint}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

        {/* Results Section */}
        {showResults && evaluationResult && (
          <div className="p-6 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-start gap-4">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-xl font-bold ${
                  evaluationResult.score >= 0.7
                    ? "bg-green-500"
                    : evaluationResult.score >= 0.4
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              >
                {evaluationResult.score >= 0.7
                  ? "✓"
                  : evaluationResult.score >= 0.4
                  ? "~"
                  : "✗"}
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-gray-800 mb-2">
                  Score: {Math.round(evaluationResult.score * 100)}%
                </h4>
                <p className="text-gray-600 mb-3">
                  {evaluationResult.partialCredit?.earned || 0} out of{" "}
                  {evaluationResult.partialCredit?.possible ||
                    question.content.blanks.length}{" "}
                  blanks correct
                </p>
                <div className="text-gray-700 leading-relaxed">
                  {videoUrl ? (
                    <ExplanationWithTimeframes
                      explanation={question.explanation}
                      videoUrl={videoUrl}
                      className="text-gray-700"
                    />
                  ) : (
                    <p>{question.explanation}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
