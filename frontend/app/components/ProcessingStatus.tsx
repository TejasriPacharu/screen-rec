'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient, RecordingStatusResponse } from '@/lib/api';

interface ProcessingStatusProps {
  recordingId: string;
  onComplete: () => void; // called when status = READY, triggers list refresh
  onError: (msg: string) => void;
}

const STEPS = [
  { key: 'PROCESSING',   label: 'Uploading',       description: 'Receiving your video' },
  { key: 'TRANSCRIBED',  label: 'Transcribing',     description: 'Converting speech to text' },
  { key: 'AI_GENERATED', label: 'Generating AI',    description: 'Creating title, summary & chapters' },
  { key: 'READY',        label: 'Ready',            description: 'Upload complete' },
] as const;

function getStepIndex(status: RecordingStatusResponse['status']): number {
  switch (status) {
    case 'PROCESSING':   return 0;
    case 'TRANSCRIBED':  return 1;
    case 'AI_GENERATED': return 2;
    case 'READY':        return 3;
    default:             return 0;
  }
}

export default function ProcessingStatus({
  recordingId,
  onComplete,
  onError,
}: ProcessingStatusProps) {
  const [status, setStatus] = useState<RecordingStatusResponse | null>(null);

  const poll = useCallback(async () => {
    try {
      const result = await apiClient.getRecordingStatus(recordingId);
      setStatus(result);

      if (result.status === 'READY') {
        onComplete();
        return true; // signal to stop polling
      }
      if (result.status === 'FAILED') {
        onError(result.error || 'Processing failed. Please try again.');
        return true;
      }
      return false;
    } catch {
      // Don't surface transient network errors during polling
      return false;
    }
  }, [recordingId, onComplete, onError]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let stopped = false;

    const run = async () => {
      const done = await poll();
      if (done || stopped) return;
      intervalId = setInterval(async () => {
        const done = await poll();
        if (done) clearInterval(intervalId);
      }, 3000);
    };

    run();
    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  }, [poll]);

  const currentStep = status ? getStepIndex(status.status) : 0;
  const isFailed = status?.status === 'FAILED';

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        {!isFailed && (
          <svg className="w-4 h-4 animate-spin text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        <p className="text-sm font-medium text-gray-900">
          {isFailed ? 'Processing failed' : 'Processing your recording…'}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, index) => {
          const isComplete = currentStep > index;
          const isActive = currentStep === index && !isFailed;
          const isFail = isFailed && currentStep === index;

          return (
            <div key={step.key} className="flex items-center gap-1 flex-1 min-w-0">
              {/* Step dot */}
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                    isFail    ? 'bg-red-500' :
                    isComplete ? 'bg-gray-900' :
                    isActive   ? 'bg-gray-500 animate-pulse' :
                                 'bg-gray-200'
                  }`}
                />
                <span className={`text-xs truncate w-full text-center transition-colors ${
                  isComplete || isActive ? 'text-gray-700 font-medium' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className={`h-px flex-1 mb-4 transition-colors ${
                  currentStep > index ? 'bg-gray-900' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step description */}
      {!isFailed && status && (
        <p className="text-xs text-gray-500">
          {STEPS[currentStep]?.description}
        </p>
      )}

      {/* Error message */}
      {isFailed && status?.error && (
        <p className="text-xs text-red-600">{status.error}</p>
      )}
    </div>
  );
}