// backend/src/workers/reading.worker.ts
import { Worker, Job } from "bullmq";
import fs from "fs";
import fetch from "node-fetch";
import { redisConnection } from "../lib/redis";
import { Recording } from "../models/Recording";
import { transcribeVideo } from "../services/transcription.service";
import { generateAIMetadata } from "../services/ai-metadata.service";
import { uploadVideoToS3 } from "../services/upload.service";
import { User } from "../models/User";
import { N8N_WEBHOOK_URL } from "../config";

interface JobPayload {
  recordingId: string;
  filePath: string;
  s3Key: string;
}

// ── Trigger n8n Drive fallback ────────────────────────────────────────────────
const triggerFallback = async (
  recordingId: string,
  title: string,
  filePath: string,
  userId: string
) => {
  if (!N8N_WEBHOOK_URL) {
    console.error(`[Worker] N8N_WEBHOOK_URL not set — skipping fallback`);
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error(`[Worker] User not found for recording ${recordingId} — skipping fallback`);
    return;
  }

  // Temp file must still exist for n8n to download it
  if (!fs.existsSync(filePath)) {
    console.error(`[Worker] Temp file gone for ${recordingId} — skipping fallback`);
    return;
  }

  try {
    console.log(`[Worker] Triggering n8n fallback for ${recordingId}`);
    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordingId,
        title,
        telegramChatId:    user.telegramChatId,
        driveAccessToken:  user.driveAccessToken,
        driveRefreshToken: user.driveRefreshToken,
        tempFileUrl: `https://screen-rec-1.onrender.com/recordings/${recordingId}/temp-file`,
      }),
    });
    console.log(`[Worker] n8n fallback triggered for ${recordingId}`);
  } catch (webhookErr) {
    console.error(`[Worker] Failed to trigger n8n webhook:`, webhookErr);
  }
};

const processRecordingJob = async (job: Job<JobPayload>) => {
  const { recordingId, filePath, s3Key } = job.data;

  // Fetch recording once to get userId + current title throughout the job
  const recording = await Recording.findById(recordingId);
  if (!recording) throw new Error(`Recording ${recordingId} not found`);
  const userId = recording.userId.toString();

  // ── Generic fail handler ──────────────────────────────────────────────────
  // On ANY stage failure: mark FAILED in DB, trigger n8n fallback, re-throw
  const fail = async (err: unknown, stage: string) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Worker] Job ${job.id} failed at ${stage}:`, message);

    await Recording.findByIdAndUpdate(recordingId, {
      status: "FAILED",
      error: `Failed at ${stage}: ${message}`,
    });

    // Use the latest title if AI already generated one, otherwise use placeholder
    const latestRecording = await Recording.findById(recordingId);
    const title = latestRecording?.title && latestRecording.title !== "Processing..." 
  ? latestRecording.title 
  : `Recording-${new Date().toISOString().slice(0,19).replace('T','-')}`;

    // Trigger Drive fallback for ALL failure stages
    await triggerFallback(recordingId, title, filePath, userId);

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
      title: aiMetadata.title,
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

    // Clean up temp file only on full success
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      console.log(`[Worker] Cleaned up temp file for ${recordingId}`);
    } catch {
      console.warn(`[Worker] Could not delete temp file: ${filePath}`);
    }
  } catch (err) {
    return fail(err, "S3_UPLOAD");
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