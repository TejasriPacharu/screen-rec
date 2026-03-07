// backend/src/recordings.ts
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { Recording } from "./models/Recording";
import { authMiddleware } from "./auth";
import { S3_BUCKET, JWT_SECRET } from "./config";
import { AwsS3Service } from "./lib/s3";
import { recordingQueue } from "./queues/recording.queue";

export const recordingsRouter = Router();

const s3Service = new AwsS3Service();

// ── Multer config ─────────────────────────────────────────────────────────────
const upload = multer({
  dest: path.join(process.cwd(), "temp_uploads"),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const tempDir = path.join(process.cwd(), "temp_uploads");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateLink() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  return Array.from({ length: 7 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

// ── Conditional auth ──────────────────────────────────────────────────────────
const conditionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const recording = await Recording.findOne({ link: req.params.link });
  if (!recording) return next();
  if (recording.public) return next();

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Authentication required for private recordings" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ── Standard routes ───────────────────────────────────────────────────────────
recordingsRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const recordings = await Recording.find({ userId: (req as any).userId });
  res.json(recordings);
});

recordingsRouter.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, contentType = "video/webm" } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const s3Key = `recordings/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
    const recording = await Recording.create({
      userId: (req as any).userId,
      title,
      link: generateLink(),
      s3Key,
    });

    const uploadUrl = await s3Service.generateSignedUploadUrl(
      S3_BUCKET, s3Key, contentType, 3600
    );
    res.json({ recording, uploadUrl });
  } catch (error) {
    console.error("Create recording error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

recordingsRouter.get("/:link", conditionalAuthMiddleware, async (req: Request, res: Response) => {
  const recording = await Recording.findOne({ link: req.params.link });
  if (!recording) return res.status(404).json({ error: "Recording not found" });
  if (!recording.s3Key) return res.status(404).json({ error: "Recording file not found" });

  await Recording.updateOne({ _id: recording._id }, { $inc: { views: 1 } });
  const viewUrl = await s3Service.generateSignedViewUrl(S3_BUCKET, recording.s3Key, 3600);
  res.json({ ...recording.toObject(), viewUrl });
});

recordingsRouter.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  const recording = await Recording.findOneAndUpdate(
    { _id: req.params.id, userId: (req as any).userId },
    req.body,
    { new: true }
  );
  res.json(recording);
});

recordingsRouter.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const recording = await Recording.findOne({
      _id: req.params.id,
      userId: (req as any).userId,
    });

    if (recording?.s3Key) {
      try {
        await s3Service.deleteFile(S3_BUCKET, recording.s3Key);
      } catch (err) {
        console.error("Failed to delete S3 file:", err);
      }
    }

    if (recording?.tempFilePath && fs.existsSync(recording.tempFilePath)) {
      fs.unlinkSync(recording.tempFilePath);
    }

    await Recording.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete recording error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── AI Pipeline routes ────────────────────────────────────────────────────────
recordingsRouter.post(
  "/process",
  authMiddleware,
  upload.single("video"),
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No video file provided." });

    const duration = Number(req.body.duration);
    if (duration > 180) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: "Recording exceeds the 3-minute limit." });
    }

    try {
      const s3Key = `recordings/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
      const link = generateLink();

      const recording = await Recording.create({
        userId: (req as any).userId,
        title: "Processing...",
        link,
        duration,
        status: "PROCESSING",
        tempFilePath: file.path,
        s3Key,
      });

      await recordingQueue.add(
        "process-recording",
        { recordingId: recording.id, filePath: file.path, s3Key },
        { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
      );

      return res.status(202).json({
        message: "Recording accepted. Processing started.",
        recordingId: recording.id,
        link: recording.link,
      });
    } catch (error) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      console.error("Process recording error:", error);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

recordingsRouter.get(
  "/:id/status",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const recording = await Recording.findOne({
        _id: req.params.id,
        userId: (req as any).userId,
      }).select("status ai title s3Key link error duration createdAt");

      if (!recording) return res.status(404).json({ error: "Recording not found." });
      return res.json(recording);
    } catch (error) {
      console.error("Status check error:", error);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

/*
  GET /recordings/:id/temp-file
  Streams the temp file from disk so n8n can download it for Drive upload.
  Protected by a shared internal secret header to prevent public access.
*/
recordingsRouter.get(
  "/:id/temp-file",
  async (req: Request, res: Response) => {
    try {
      // Simple secret header check — n8n sends this in its HTTP request node
      const secret = req.headers["x-internal-secret"];
      if (secret !== process.env.INTERNAL_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const recording = await Recording.findById(req.params.id);
      if (!recording) return res.status(404).json({ error: "Recording not found." });

      const filePath = recording.tempFilePath;
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Temp file not found." });
      }

      const filename = `${recording.title.replace(/[^a-z0-9]/gi, "_")}.webm`;
      res.setHeader("Content-Type", "video/webm");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error("Temp file download error:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

// ── NEW: Drive status update endpoint (called by n8n after Drive upload) ─────
/*
  PATCH /recordings/:id/drive-status
  n8n calls this after successfully uploading to Google Drive.
  Updates the recording status and stores the Drive file URL.
  Also deletes the temp file since it's no longer needed.
*/
recordingsRouter.patch(
  "/:id/drive-status",
  async (req: Request, res: Response) => {
    try {
      const secret = req.headers["x-internal-secret"];
      if (secret !== process.env.INTERNAL_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { driveFileId, driveFileName } = req.body;

      const recording = await Recording.findByIdAndUpdate(
        req.params.id,
        {
          status: "UPLOADED_TO_DRIVE",
          driveFileId,
          driveFileName,
          error: null,
        },
        { new: true }
      );

      if (!recording) return res.status(404).json({ error: "Recording not found." });

      // Clean up temp file now that Drive upload succeeded
      if (recording.tempFilePath && fs.existsSync(recording.tempFilePath)) {
        try {
          fs.unlinkSync(recording.tempFilePath);
          console.log(`[Recordings] Cleaned up temp file after Drive upload: ${recording.tempFilePath}`);
        } catch {
          console.warn(`[Recordings] Could not delete temp file: ${recording.tempFilePath}`);
        }
      }

      return res.json({ success: true, recording });
    } catch (error) {
      console.error("Drive status update error:", error);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

// ── NEW: Telegram chat_id registration ───────────────────────────────────────
/*
  POST /auth/telegram
  Users call this after starting your Telegram bot.
  Stores their chat_id so n8n can notify them.
  (Mounted on recordingsRouter for simplicity — move to authRouter if preferred)
*/
import { User } from "./models/User";

recordingsRouter.post(
  "/telegram/register",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { telegramChatId } = req.body;
      if (!telegramChatId) {
        return res.status(400).json({ error: "telegramChatId is required." });
      }

      await User.findByIdAndUpdate((req as any).userId, { telegramChatId });
      return res.json({ success: true });
    } catch (error) {
      console.error("Telegram register error:", error);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);