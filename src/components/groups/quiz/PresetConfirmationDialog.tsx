'use client'

import { AlertTriangle, Clock, Target } from 'lucide-react'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../ui/dialog'

interface PresetConfirmationDialogProps {
  isOpen: boolean
  currentPreset: {
    id: string
    name: string
    distribution: {
      easy: number
      medium: number
      hard: number
    }
    createdAt: Date
  }
  newPreset: {
    id: string
    name: string
    distribution: {
      easy: number
      medium: number
      hard: number
    }
  }
  onConfirm: () => void
  onCancel: () => void
}

export function PresetConfirmationDialog({
  isOpen,
  currentPreset,
  newPreset,
  onConfirm,
  onCancel
}: PresetConfirmationDialogProps) {
  const currentTotal = currentPreset.distribution.easy + currentPreset.distribution.medium + currentPreset.distribution.hard
  const newTotal = newPreset.distribution.easy + newPreset.distribution.medium + newPreset.distribution.hard
  const timeSinceCreation = Math.floor((Date.now() - currentPreset.createdAt.getTime()) / (1000 * 60))

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <AlertTriangle className="h-6 w-6 text-gray-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Replace Existing Questions?
            </DialogTitle>
            <DialogDescription className="mt-2 text-gray-600">
              You already have questions from another preset. This action will replace them.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Preset Info */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Current:</span>
              <span className="font-semibold text-gray-900">{currentPreset.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-sm text-gray-700">
                  Easy: {currentPreset.distribution.easy}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-sm text-gray-700">
                  Medium: {currentPreset.distribution.medium}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-sm text-gray-700">
                  Hard: {currentPreset.distribution.hard}
                </span>
              </div>
              <div className="text-right">
                <div className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
                  {currentTotal} questions
                </div>
                <div className="flex items-center justify-end gap-1 text-xs text-gray-500 mt-1">
                  <Clock className="h-3 w-3" />
                  {timeSinceCreation < 1 ? 'Just now' : `${timeSinceCreation}m ago`}
                </div>
              </div>
            </div>
          </div>

          <div className="my-4 text-center">
            <span className="text-sm text-gray-400">↓</span>
          </div>

          {/* New Preset Info */}
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-900">New:</span>
              <span className="font-semibold text-indigo-900">{newPreset.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-sm text-gray-700">
                  Easy: {newPreset.distribution.easy}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-sm text-gray-700">
                  Medium: {newPreset.distribution.medium}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-sm text-gray-700">
                  Hard: {newPreset.distribution.hard}
                </span>
              </div>
              <div className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-medium text-white">
                {newTotal} questions
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-900">This will replace your current questions</p>
                <p className="text-xs text-red-700">
                  Existing {currentTotal} questions will be deleted. New questions will be generated from the selected preset.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
          >
            Replace Questions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}