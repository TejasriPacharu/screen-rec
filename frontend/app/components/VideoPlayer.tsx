"use client";

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  duration?: number;
  size?: number;
  views?: number;
  createdAt?: string;
}

export default function VideoPlayer({
  videoUrl,
  title,
  duration,
  size,
  views,
  createdAt,
}: VideoPlayerProps) {
  // Format duration to MM:SS
  const formatDuration = (totalSeconds: number) => {
    if (totalSeconds < 0) return "0:00";

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formattedMinutes = minutes.toString().padStart(2, "0");
    const formattedSeconds = seconds.toString().padStart(2, "0");

    return `${formattedMinutes}:${formattedSeconds}`;
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {duration && (
              <span className="inline-flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {formatDuration(duration)}
              </span>
            )}

            {size && (
              <span className="inline-flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
                {formatSize(size)}
              </span>
            )}

            {views !== undefined && (
              <span className="inline-flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {views.toLocaleString()} {views === 1 ? 'view' : 'views'}
              </span>
            )}

            {createdAt && (
              <span className="inline-flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {formatDate(createdAt)}
              </span>
            )}
          </div>
        </div>

        {/* Video Player */}
        <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-lg">
          <video
            controls
            autoPlay
            className="w-full h-full"
            onError={(e) => {
              console.error("Video playback error:", e);
              const video = e.target as HTMLVideoElement;
              console.error("Video error code:", video.error?.code);
              console.error("Video error message:", video.error?.message);
              console.error("Video src:", video.src);
            }}
            onLoadedMetadata={() => console.log("Video metadata loaded successfully")}
            onCanPlay={() => console.log("Video can play")}
            onLoadStart={() => console.log("Video load started")}
          >
            <source src={videoUrl} type="video/webm" />
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
}
