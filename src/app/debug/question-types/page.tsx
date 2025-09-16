/**
 * Debug page for testing question types
 * Access via /debug/question-types
 */

import QuestionTypeDebug from '@/components/debug/QuestionTypeDebug'

export default function QuestionTypesDebugPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <QuestionTypeDebug />
    </div>
  )
}