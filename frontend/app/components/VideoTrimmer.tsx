'use client';

import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { getVideo } from '@/lib/indexeddb';

interface VideoTrimmerProps {
  videoId: string;
  onSave: (trimmedBlob: Blob, startTime: number, endTime: number) => Promise<void>;
  onCancel: () => void;
  // Optional: if you track recording duration, pass it here as a fallback
  recordedDuration?: number;
  // Optional: temporary blob for just-recorded videos
  tempBlob?: Blob;
}

export default function VideoTrimmer({ videoId, onSave, onCancel, recordedDuration, tempBlob }: VideoTrimmerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);
  const [isLoadingDuration, setIsLoadingDuration] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const videoBlobRef = useRef<Blob | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const durationDetected = useRef(false);

  // Load video on mount
  useEffect(() => {
    loadVideo();
    loadFFmpeg();

    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoId, tempBlob]);

  // Load video from IndexedDB or use temporary blob
  const loadVideo = async () => {
    try {
      let blob: Blob | null = null;
      
      if (tempBlob) {
        // Use the temporary blob passed from parent (for just-recorded videos)
        blob = tempBlob;
      } else {
        // Load from IndexedDB for existing recordings
        blob = await getVideo(videoId);
      }
      
      if (blob) {
        videoBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
      }
    } catch (err) {
      console.error('Failed to load video:', err);
      setError('Failed to load video');
    }
  };

  // Load FFmpeg
  const loadFFmpeg = async () => {
    try {
      console.log('Starting FFmpeg load...');
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg log:', message);
      });

      console.log('Fetching core files from CDN...');
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

      console.log('Loading FFmpeg...');
      await ffmpeg.load({
        coreURL,
        wasmURL,
      });

      console.log('FFmpeg loaded successfully!');
      setFfmpegLoaded(true);
    } catch (err) {
      console.error('Failed to load FFmpeg:', err);
      console.error('Error details:', err instanceof Error ? err.message : String(err));
      setError('Failed to load video editor');
    }
  };

  // Helper function to set duration safely
  const setDurationSafely = (duration: number) => {
    if (durationDetected.current) return; // Already detected, don't override
    
    if (duration && isFinite(duration) && duration > 0) {
      console.log('Setting duration to:', duration);
      durationDetected.current = true;
      setVideoDuration(duration);
      setEndTime(duration);
      setIsLoadingDuration(false);
    }
  };

  // Force duration detection by seeking to end
  const forceDurationDetection = async () => {
    const video = videoRef.current;
    if (!video || durationDetected.current) return;

    console.log('Forcing duration detection...');
    
    // Store current time to restore later
    const currentTime = video.currentTime;
    
    // Method 1: Try seeking to a very large number
    // The browser will clamp this to the actual duration
    video.currentTime = Number.MAX_SAFE_INTEGER;
    
    // Wait a bit for the seek to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now the currentTime should be at the end, which gives us duration
    const detectedDuration = video.currentTime;
    console.log('Detected duration via seek:', detectedDuration);
    
    if (detectedDuration && isFinite(detectedDuration) && detectedDuration > 0) {
      setDurationSafely(detectedDuration);
      // Restore to beginning
      video.currentTime = currentTime || 0;
    } else {
      // Method 2: Use buffered ranges if available
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        console.log('Detected duration via buffered:', bufferedEnd);
        if (bufferedEnd && isFinite(bufferedEnd) && bufferedEnd > 0) {
          setDurationSafely(bufferedEnd);
          video.currentTime = currentTime || 0;
        }
      }
      
      // Method 3: Fall back to recordedDuration prop if provided
      if (!durationDetected.current && recordedDuration && recordedDuration > 0) {
        console.log('Using provided recordedDuration:', recordedDuration);
        setDurationSafely(recordedDuration);
        video.currentTime = currentTime || 0;
      }
    }
  };

  const handleLoadedMetadata = () => {
    console.log('handleLoadedMetadata called');
    const video = videoRef.current;
    if (!video) return;

    const duration = video.duration;
    console.log('Video duration at loadedmetadata:', duration);

    if (duration && isFinite(duration) && duration > 0) {
      setDurationSafely(duration);
    } else {
      // Duration not available yet, force detection
      forceDurationDetection();
    }
  };

  const handleCanPlay = () => {
    console.log('handleCanPlay called');
    const video = videoRef.current;
    if (!video || durationDetected.current) return;

    const duration = video.duration;
    console.log('Video duration at canplay:', duration);

    if (duration && isFinite(duration) && duration > 0) {
      setDurationSafely(duration);
    } else {
      forceDurationDetection();
    }
  };

  const handleDurationChange = () => {
    console.log('handleDurationChange called');
    const video = videoRef.current;
    if (!video) return;

    const duration = video.duration;
    console.log('Video duration at durationchange:', duration);

    if (duration && isFinite(duration) && duration > 0) {
      setDurationSafely(duration);
    }
  };

  // Additional handler for when video is fully loaded
  const handleLoadedData = () => {
    console.log('handleLoadedData called');
    const video = videoRef.current;
    if (!video || durationDetected.current) return;

    const duration = video.duration;
    console.log('Video duration at loadeddata:', duration);

    if (duration && isFinite(duration) && duration > 0) {
      setDurationSafely(duration);
    } else {
      // Last resort: try forcing detection after a delay
      setTimeout(() => {
        if (!durationDetected.current) {
          forceDurationDetection();
        }
      }, 500);
    }
  };

  // Handle seeking completion - another chance to get duration
  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video || durationDetected.current) return;

    const duration = video.duration;
    if (duration && isFinite(duration) && duration > 0) {
      setDurationSafely(duration);
    }
  };

  // Monitor playback and stop at endTime
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    // Update current time for playhead display
    setCurrentTime(video.currentTime);

    // If playing and we've reached or passed the end time, pause and reset to start
    if (isPlaying && video.currentTime >= endTime) {
      video.pause();
      video.currentTime = startTime;
      setCurrentTime(startTime);
      setIsPlaying(false);
    }
  };

  // Handle mouse down on handles
  const handleMouseDownStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingHandle('start');
  };

  const handleMouseDownEnd = (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingHandle('end');
  };

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingHandle || !timelineRef.current || !videoDuration || !isFinite(videoDuration)) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const time = percentage * videoDuration;

      if (draggingHandle === 'start') {
        const newStart = Math.max(0, Math.min(time, endTime - 0.5));
        setStartTime(newStart);
        if (videoRef.current && isFinite(newStart) && newStart >= 0) {
          videoRef.current.currentTime = newStart;
          setCurrentTime(newStart);
        }
      } else if (draggingHandle === 'end') {
        const newEnd = Math.max(startTime + 0.5, Math.min(time, videoDuration));
        setEndTime(newEnd);
        if (videoRef.current && isFinite(newEnd) && newEnd >= 0) {
          videoRef.current.currentTime = newEnd;
          setCurrentTime(newEnd);
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingHandle(null);
    };

    if (draggingHandle) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, videoDuration, startTime, endTime]);

  // Handle timeline click (seek)
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || draggingHandle || !videoDuration) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * videoDuration;

    if (videoRef.current && isFinite(time)) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Toggle play/pause - plays only the selected region
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        // If current time is outside selected range or at/past endTime, start from startTime
        if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
          videoRef.current.currentTime = startTime;
          setCurrentTime(startTime);
        }
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Format time to MM:SS
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Handle save (with or without trimming)
  const handleSave = async () => {
    if (!videoBlobRef.current) return;

    const isTrimmed = startTime > 0 || endTime < videoDuration;

    if (!isTrimmed) {
      await onSave(videoBlobRef.current, 0, videoDuration);
      return;
    }

    if (!ffmpegLoaded || !ffmpegRef.current) {
      setError('Video editor not ready');
      return;
    }

    try {
      setIsTrimming(true);
      setError(null);

      const ffmpeg = ffmpegRef.current;

      await ffmpeg.writeFile('input.webm', await fetchFile(videoBlobRef.current));

      await ffmpeg.exec([
        '-i', 'input.webm',
        '-ss', startTime.toString(),
        '-to', endTime.toString(),
        '-c', 'copy',
        'output.webm'
      ]);

      const data = await ffmpeg.readFile('output.webm');
      const trimmedBlob = new Blob([data as any], { type: 'video/webm' });

      await ffmpeg.deleteFile('input.webm');
      await ffmpeg.deleteFile('output.webm');

      await onSave(trimmedBlob, startTime, endTime);

    } catch (err) {
      console.error('Failed to trim video:', err);
      setError('Failed to trim video. Please try again.');
      setIsTrimming(false);
    }
  };

  const selectedDuration = endTime - startTime;
  const selectionPercentStart = videoDuration > 0 ? (startTime / videoDuration) * 100 : 0;
  const selectionPercentWidth = videoDuration > 0 ? ((endTime - startTime) / videoDuration) * 100 : 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Trim Video
            </h2>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isTrimming}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Video Preview */}
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onCanPlay={handleCanPlay}
                onDurationChange={handleDurationChange}
                onLoadedData={handleLoadedData}
                onSeeked={handleSeeked}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                preload="auto"
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Loading video...
              </div>
            )}
          </div>

          {/* Timeline Controls */}
          {isLoadingDuration ? (
            <div className="text-sm text-gray-500 text-center py-4">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Detecting video duration...
              </div>
            </div>
          ) : videoDuration > 0 ? (
            <div className="space-y-4">

              {/* Timeline with draggable handles */}
              <div
                ref={timelineRef}
                className="relative cursor-pointer select-none"
                onClick={handleTimelineClick}
              >

                {/* Timeline track */}
                <div className="h-2 bg-gray-200 rounded-full relative overflow-hidden">
                  {/* Selected region highlight */}
                  <div
                    className="absolute h-full bg-gray-900"
                    style={{
                      left: `${selectionPercentStart}%`,
                      width: `${selectionPercentWidth}%`
                    }}
                  />
                </div>

                {/* Playhead indicator - shows current playback position */}
                {currentTime >= 0 && videoDuration > 0 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-red-500 z-20 pointer-events-none"
                    style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                  />
                )}

                {/* Start time handle - draggable */}
                <div
                  onMouseDown={handleMouseDownStart}
                  className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-gray-900 rounded-full cursor-grab ${
                    draggingHandle === 'start' ? 'cursor-grabbing scale-110' : 'hover:scale-110'
                  } transition-transform z-10`}
                  style={{ left: `calc(${selectionPercentStart}% - 10px)` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1 h-2 bg-gray-900 rounded-full" />
                  </div>
                </div>

                {/* End time handle - draggable */}
                <div
                  onMouseDown={handleMouseDownEnd}
                  className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-gray-900 rounded-full cursor-grab ${
                    draggingHandle === 'end' ? 'cursor-grabbing scale-110' : 'hover:scale-110'
                  } transition-transform z-10`}
                  style={{ left: `calc(${selectionPercentStart + selectionPercentWidth}% - 10px)` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1 h-2 bg-gray-900 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Time displays */}
              <div className="flex items-center justify-between text-sm">
                <div className="space-x-4">
                  <span className="text-gray-600">
                    Start: <span className="font-medium text-gray-900">{formatTime(startTime)}</span>
                  </span>
                  <span className="text-gray-600">
                    End: <span className="font-medium text-gray-900">{formatTime(endTime)}</span>
                  </span>
                </div>
                <div className="space-x-4">
                  <span className="text-gray-600">
                    Current: <span className="font-medium text-red-600">{formatTime(currentTime)}</span>
                  </span>
                  <span className="text-gray-600">
                    Selection: <span className="font-medium text-gray-900">{formatTime(selectedDuration)}</span>
                  </span>
                </div>
              </div>

              {/* Playback controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={togglePlayPause}
                  disabled={isTrimming}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onCancel}
              disabled={isTrimming}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isTrimming || !ffmpegLoaded || isLoadingDuration}
              className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isTrimming ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Trimming...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>

          {/* FFmpeg loading indicator */}
          {!ffmpegLoaded && (
            <div className="text-sm text-gray-500 text-center">
              Loading video editor...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}