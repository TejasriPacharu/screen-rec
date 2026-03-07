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

const processRecordingJob = async (job: Job<JobPayload>) => {
  const { recordingId, filePath, s3Key } = job.data;

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

    // Cleanup temp file only on S3 success
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      console.log(`[Worker] Cleaned up temp file for ${recordingId}`);
    } catch {
      console.warn(`[Worker] Could not delete temp file: ${filePath}`);
    }

  } catch (s3Err) {
    // ── S3 failed → trigger n8n fallback instead of hard-failing ─────────
    const message = s3Err instanceof Error ? s3Err.message : String(s3Err);
    console.error(`[Worker] S3 upload failed for ${recordingId}:`, message);

    // Mark as FAILED in DB but keep temp file alive for n8n to download
    await Recording.findByIdAndUpdate(recordingId, {
      status: "FAILED",
      error: `S3 upload failed: ${message}`,
    });

    // Look up the user so we can pass their chat_id and Drive tokens to n8n
    const recording = await Recording.findById(recordingId);
    const user = recording ? await User.findById(recording.userId) : null;

    if (!user) {
      console.error(`[Worker] Could not find user for recording ${recordingId} — skipping fallback`);
      throw s3Err;
    }

    if (!N8N_WEBHOOK_URL) {
      console.error(`[Worker] N8N_WEBHOOK_URL not set — skipping fallback`);
      throw s3Err;
    }

    try {
      console.log(`[Worker] Triggering n8n fallback for ${recordingId}`);
      await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordingId,
          title:             aiMetadata.title,
          filePath,          // absolute path on server — n8n uses temp-file endpoint instead
          telegramChatId:    user.telegramChatId,
          driveAccessToken:  user.driveAccessToken,
          driveRefreshToken: user.driveRefreshToken,
          // n8n will use this URL to download the file
          tempFileUrl: `https://screen-rec-1.onrender.com/recordings/${recordingId}/temp-file`,
        }),
      });
      console.log(`[Worker] n8n fallback triggered for ${recordingId}`);
    } catch (webhookErr) {
      console.error(`[Worker] Failed to trigger n8n webhook:`, webhookErr);
    }

    throw s3Err; // still re-throw so BullMQ marks the job as failed
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