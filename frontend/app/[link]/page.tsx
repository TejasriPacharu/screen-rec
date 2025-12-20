"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { apiClient, Recording } from "@/lib/api";
import VideoPlayer from "../components/VideoPlayer";

export default function RecordingView() {
  const params = useParams();
  const link = params.link as string;

  const [recording, setRecording] = useState<Recording | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref to track if data has been fetched (prevents double-fetch in React Strict Mode)
  const hasFetched = useRef(false);

  useEffect(() => {
    const loadRecording = async () => {
      if (!link) {
        setError("Invalid recording link");
        setIsLoading(false);
        return;
      }

      // Skip if already fetched
      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        setIsLoading(true);
        setError(null);

        const data = await apiClient.getRecordingByLink(link);
        setRecording(data);
        console.log("HEREEE");
        console.log(data);
        setViewUrl(data.viewUrl);
      } catch (err) {
        console.error("Failed to load recording:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load recording",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadRecording();
  }, [link]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <svg
            className="w-12 h-12 animate-spin text-gray-900 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-600">Loading recording...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !recording || !viewUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Recording Not Found
          </h1>
          <p className="text-gray-600">
            {error ||
              "This recording could not be found or the link has expired."}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // Success state - render video player
  return (
    <VideoPlayer
      videoUrl={viewUrl}
      title={recording.title}
      duration={recording.duration}
      size={recording.size}
      views={recording.views}
      createdAt={recording.createdAt}
    />
  );
}
