'use client'

import React from 'react'
import { Play } from 'lucide-react'
import {
  parseExplanationWithTimeframes,
  getVideoLink,
  formatVideoTimestamp
} from '../../../lib/utils/timeframe'

interface ExplanationWithTimeframesProps {
  explanation: string
  videoUrl?: string
  className?: string
}

export function ExplanationWithTimeframes({
  explanation,
  videoUrl,
  className = 'text-sm text-blue-700'
}: ExplanationWithTimeframesProps) {
  if (!explanation) return null

  const segments = parseExplanationWithTimeframes(explanation)

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <React.Fragment key={index}>{segment.content}</React.Fragment>
        }

        // segment.type === 'timeframe'
        const { content: timeframe } = segment
        const videoLink = getVideoLink(videoUrl, timeframe.startTime)

        return (
          <button
            key={`timeframe-${index}`}
            className="mx-1 inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            onClick={() => {
              if (videoLink) {
                window.open(videoLink, '_blank')
              }
            }}
            title={`Jump to ${formatVideoTimestamp(timeframe.startTime)} - ${formatVideoTimestamp(
              timeframe.endTime
            )}`}
            disabled={!videoLink}
          >
            <Play className="h-3 w-3" />
            {timeframe.originalText}
          </button>
        )
      })}
    </div>
  )
}