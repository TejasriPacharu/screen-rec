// backend/src/workers/recording.worker.ts
import { Worker, Job } from "bullmq";
import fs from "fs";
import { redisConnection } from "../lib/redis";
import { Recording } from "../models/Recording";
import { transcribeVideo } from "../services/transcription.service";
import { generateAIMetadata } from "../services/ai-metadata.service";
import { uploadVideoToS3 } from "../services/upload.service";

interface JobPayload {
  recordingId: string;
  filePath: string;
  s3Key: string;
}

const processRecordingJob = async (job: Job<JobPayload>) => {
  const { recordingId, filePath, s3Key } = job.data;

  // Helper: mark as FAILED in DB then re-throw so BullMQ retries
  const fail = async (err: unknown, stage: string) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Worker] Job ${job.id} failed at ${stage}:`, message);
    await Recording.findByIdAndUpdate(recordingId, {
      status: "FAILED",
      error: `Failed at ${stage}: ${message}`,
    });
    throw err;
  };

  // ── Step 1: Transcription ─────────────────────────────────────────────────
  let transcript: string;
  try {
    console.log(`[Worker] Starting transcription for recording ${recordingId}`);
    transcript = await transcribeVideo(filePath);
    await Recording.findByIdAndUpdate(recordingId, {
      transcript,
      status: "TRANSCRIBED",
    });
    await job.updateProgress(33);
    console.log(`[Worker] Transcription complete for ${recordingId}`);
  } catch (err) {
    return fail(err, "TRANSCRIPTION");
  }

  // ── Step 2: AI Metadata ───────────────────────────────────────────────────
  let aiMetadata: Awaited<ReturnType<typeof generateAIMetadata>>;
  try {
    console.log(`[Worker] Generating AI metadata for ${recordingId}`);
    aiMetadata = await generateAIMetadata(transcript);
    await Recording.findByIdAndUpdate(recordingId, {
      ai: aiMetadata,
      title: aiMetadata.title, // overwrite placeholder title with AI title
      status: "AI_GENERATED",
    });
    await job.updateProgress(66);
    console.log(`[Worker] AI metadata complete for ${recordingId}`);
  } catch (err) {
    return fail(err, "AI_METADATA");
  }

  // ── Step 3: S3 Upload ─────────────────────────────────────────────────────
  try {
    console.log(`[Worker] Uploading to S3 for ${recordingId}`);
    await uploadVideoToS3(filePath, s3Key);
    await Recording.findByIdAndUpdate(recordingId, {
      s3Key,
      status: "READY",
      tempFilePath: null,
    });
    await job.updateProgress(100);
    console.log(`[Worker] Upload complete for ${recordingId}`);
  } catch (err) {
    return fail(err, "S3_UPLOAD");
  }

  // ── Cleanup temp file ─────────────────────────────────────────────────────
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.log(`[Worker] Cleaned up temp file for ${recordingId}`);
  } catch {
    // Non-fatal: log and move on, sweep cron will catch it
    console.warn(`[Worker] Could not delete temp file: ${filePath}`);
  }
};

export const startWorker = () => {
  const worker = new Worker<JobPayload>(
    "recording-pipeline",
    processRecordingJob,
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  worker.on("completed", (job) =>
    console.log(`✅ [Worker] Job ${job.id} completed`)
  );
  worker.on("failed", (job, err) =>
    console.error(`❌ [Worker] Job ${job?.id} failed:`, err.message)
  );

  console.log("🔄 Recording worker started");
  return worker;
};